const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const { readConfig } = require('../src/config');
const { createDataSource } = require('../src/db/data-source');
const { createApp } = require('../src/app');

test('課程 API 使用隔離 PostgreSQL 跑完可重現流程', async t => {
  const config = readConfig();
  const source = createDataSource(config);
  await source.initialize();
  const server = createApp(source, config).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const suffix = randomUUID();
  const email = 'api-' + suffix + '@example.test';
  const password = randomUUID();
  const slug = 'api-course-' + suffix;
  const cleanSessions = [];
  t.after(async () => {
    try {
      await source.getRepository('Product').delete({ slug });
      await source.getRepository('User').delete({ email });
      for (const id of cleanSessions) await source.getRepository('Session').delete({ id });
    } finally {
      await new Promise(resolve => server.close(resolve));
      await source.destroy();
    }
  });

  async function call(path, { method = 'GET', body, headers = {}, cookie } = {}) {
    const options = { method, headers: { Accept: 'application/json', ...headers } };
    if (method !== 'GET') options.headers['X-Requested-With'] = 'XMLHttpRequest';
    if (cookie) options.headers.Cookie = cookie;
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(origin + path, options);
    return { response, status: response.status, json: response.status === 204 ? null : await response.json() };
  }

  async function login(id, pass) {
    const result = await call('/auth/login', { method: 'POST', body: { email: id, password: pass } });
    assert.equal(result.status, 200, 'Course account login should succeed');
    const header = result.response.headers.get('set-cookie');
    assert(Boolean(header && /HttpOnly/i.test(header) && /SameSite=Lax/i.test(header)), 'Cookie protections expected');
    const token = header.split(';')[0];
    const { jti } = require('jsonwebtoken').decode(token.slice(token.indexOf('=') + 1));
    cleanSessions.push(jti);
    return { cookie: token, user: result.json.data.user };
  }

  let category;
  let product;
  let member;
  await t.test('分類、關鍵字、分頁及商品明細', async () => {
    assert.equal((await call('/health')).status, 200);
    const categories = await call('/categories');
    assert.equal(categories.status, 200);
    assert.equal(categories.json.data.length, 3);
    category = categories.json.data.find(row => row.slug === 'desk');
    assert(category);
    const [first, second, selected, filtered, empty] = await Promise.all([
      call('/products?limit=4&page=1'), call('/products?limit=4&page=2'),
      call('/products?q=' + encodeURIComponent('筆記本')),
      call('/products?category=' + category.id),
      call('/products?q=' + suffix),
    ]);
    assert.equal(first.json.data.length, 4);
    assert.equal(second.json.data.length, 4);
    assert(first.json.data.every(row => !second.json.data.some(other => other.id === row.id)));
    assert.equal(filtered.json.meta.total, 4);
    assert.deepEqual(empty.json.data, []);
    assert.equal(selected.json.meta.total, 1);
    const detail = await call('/products/' + selected.json.data[0].id);
    assert.equal(detail.status, 200);
    product = detail.json.data;
    assert.equal(product.variants.length, 2);
  });

  await t.test('註冊、密碼雜湊、登入保持及角色', async () => {
    const data = { name: 'API 測試會員', email, password };
    const rejected = await call('/auth/register', { method: 'POST', body: { ...data, role: 'Admin' } });
    assert.equal(rejected.status, 400);
    const registration = await call('/auth/register', { method: 'POST', body: data });
    assert.equal(registration.status, 201);
    assert.equal(registration.json.data.user.role, 'Member');
    const stored = await source.getRepository('User').findOneBy({ email });
    assert(Boolean(stored.passwordHash.startsWith('$argon2id$') && stored.passwordHash !== password), 'Password hash expected');
    assert.equal((await call('/auth/register', { method: 'POST', body: data })).status, 409);
    member = await login(email, password);
    const session = await call('/auth/session', { cookie: member.cookie });
    assert.equal(session.json.data.user.id, member.user.id);
    assert.equal((await call('/admin/products')).status, 401);
    assert.equal((await call('/admin/products', { cookie: member.cookie })).status, 403);
  });

  await t.test('購物車增減、重送、欄位驗證與移除', async () => {
    const cookie = member.cookie;
    assert.equal((await call('/cart')).status, 401);
    assert.deepEqual((await call('/cart', { cookie })).json.data.items, []);
    const variantId = product.variants[0].id;
    const key = randomUUID();
    const add = { method: 'POST', body: { variantId, quantity: 1 }, cookie, headers: { 'Idempotency-Key': key } };
    const [a, b] = await Promise.all([call('/cart/items', add), call('/cart/items', add)]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(a.json.data.items[0].quantity, 1);
    assert.equal(b.json.data.items[0].quantity, 1);
    assert.equal((await call('/cart/items', { ...add, body: { variantId, quantity: 2 } })).status, 409);
    assert.equal((await call('/cart/items', { ...add, body: { variantId, quantity: 0 } })).status, 400);
    const missing = { ...add, body: { variantId: randomUUID(), quantity: 1 }, headers: { 'Idempotency-Key': randomUUID() } };
    assert.equal((await call('/cart/items', missing)).status, 404);
    assert.equal((await call('/cart/items', { ...add, headers: { 'Idempotency-Key': randomUUID() }, body: { variantId, quantity: 99 } })).status, 409);
    const item = a.json.data.items[0];
    const path = '/cart/items/' + item.id;
    const changed = await call(path, { method: 'PATCH', cookie, body: { quantity: 2 } });
    assert.equal(changed.json.data.totals.amount, item.unitPrice * 2);
    assert.equal((await call('/cart', { cookie })).json.data.items[0].quantity, 2);
    const removed = await call(path, { method: 'DELETE', cookie });
    assert.equal(removed.status, 200);
    assert.deepEqual(removed.json.data.items, []);
    await call('/auth/logout', { method: 'POST', cookie });
    assert.equal((await call('/auth/session', { cookie })).json.data.user, null);
    assert.equal((await call('/cart', { cookie })).status, 401);
  });

  await t.test('測試管理員能新增、讀取、修改與刪除', async () => {
    const { cookie, user } = await login(process.env.COURSE_DEMO_ADMIN_EMAIL, process.env.COURSE_DEMO_ADMIN_PASSWORD);
    assert.equal(user.role, 'Admin');
    const created = await call('/admin/products', {
      method: 'POST', cookie, body: {
        name: 'API 驗收小物', slug, description: '隔離課程測試。', categoryId: category.id,
        variants: [{ label: '測試款', price: 89, stock: 5 }],
      },
    });
    assert.equal(created.status, 201);
    const path = '/admin/products/' + created.json.data.id;
    assert.equal((await call(path, { cookie })).status, 200);
    const changed = await call(path, { method: 'PATCH', cookie, body: { name: '改名後的測試小物' } });
    assert.equal(changed.json.data.name, '改名後的測試小物');
    assert.equal((await call(path, { method: 'DELETE', cookie })).status, 204);
    assert.equal((await call(path, { cookie })).status, 404);
    assert.equal((await call('/products/' + created.json.data.id)).status, 404);
    assert.equal((await call('/auth/logout', { method: 'POST', cookie })).status, 200);
  });
});
