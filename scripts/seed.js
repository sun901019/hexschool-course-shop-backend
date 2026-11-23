const argon2 = require('argon2');
const { createDataSource } = require('../src/db/data-source');
const { readConfig } = require('../src/config');
const check = require('../src/http/validate');

const sample = [
  { slug: 'desk', name: '桌面整理', products: [
    ['folded-notebook', '方格筆記本', '方格內頁與可攤平的書背，方便整理每日筆記。', ['灰藍', 85, 12], ['米白', 85, 8]],
    ['cable-dots', '矽膠集線夾', '固定桌上的充電線，取用後可放回原位。', ['標準款', 49, 15]],
    ['pen-tray', '長方筆托', '把常用的兩三支筆集中放在桌面一角。', ['石灰', 129, 10]],
    ['paper-stand', '木紋文件立架', '讓手邊要讀的文件直立放置。', ['淺木色', 189, 6]],
  ] },
  { slug: 'home', name: '居家收納', products: [
    ['felt-coaster', '圓形毛氈杯墊', '杯子下方的小墊子，拿起後容易清理桌面。', ['霧綠', 55, 14], ['米白', 55, 9]],
    ['linen-basket', '布面小收納籃', '用來收眼鏡布、鑰匙或小配件。', ['小號', 125, 10]],
    ['ceramic-tray', '陶瓷方托盤', '放在門口桌面，收納每天隨手拿取的物品。', ['砂白', 169, 5]],
    ['cotton-cloth', '棉布擦拭巾', '單張棉布，小空間清潔後容易晾乾。', ['原色', 69, 0]],
  ] },
  { slug: 'carry', name: '隨身配件', products: [
    ['flat-pouch', '扁平收納袋', '可裝小配件與線材，放入包包時佔用空間少。', ['藏青', 145, 11], ['灰綠', 145, 5]],
    ['case-tag', '行李名牌', '在相似的行李箱上做清楚的辨識記號。', ['橘棕', 79, 9]],
    ['folding-bag', '輕量折疊袋', '不用時可以疊成一小包，作為日常備用袋。', ['深灰', 99, 14]],
    ['travel-box', '旅行分隔盒', '不同格子收納易混在一起的小物。', ['霧白', 115, 7]],
  ] },
];

async function seedCatalog(manager) {
  const categories = manager.getRepository('Category');
  const products = manager.getRepository('Product');
  const variants = manager.getRepository('Variant');
  for (const category of sample) {
    const current = await categories.findOneBy({ slug: category.slug });
    const saved = current || await categories.save({ slug: category.slug, name: category.name });
    for (const [slug, name, description, ...choices] of category.products) {
      if (await products.existsBy({ slug })) continue;
      const product = await products.save({ slug, name, description, categoryId: saved.id });
      await variants.insert(choices.map(([label, price, stock], position) =>
        ({ productId: product.id, label, price, stock, position })));
    }
  }
}

async function seedAccount(manager, role, email, password, name) {
  const users = manager.getRepository('User');
  const found = await users.findOneBy({ email });
  if (found) {
    if (found.role !== role) throw new Error('Existing course account has a different role');
    return;
  }
  const passwordHash = await argon2.hash(password);
  const user = await users.save({ name, email, passwordHash, role });
  if (role === 'Member') await manager.getRepository('Cart').insert({ userId: user.id });
}

async function main() {
  const env = process.env;
  const users = [
    ['Member', check.email(env.COURSE_DEMO_MEMBER_EMAIL), check.password(env.COURSE_DEMO_MEMBER_PASSWORD, 8), '示範會員'],
    ['Admin', check.email(env.COURSE_DEMO_ADMIN_EMAIL), check.password(env.COURSE_DEMO_ADMIN_PASSWORD, 8), '課程管理員'],
  ];
  if (users[0][1] === users[1][1]) throw new Error('Choose a different email for each course account');
  const source = createDataSource(readConfig());
  await source.initialize();
  try {
    await source.transaction(async manager => {
      await seedCatalog(manager);
      for (const user of users) await seedAccount(manager, ...user);
    });
    console.log('Course seed ready: 3 categories, 12 sample products and 2 roles.');
  } finally {
    await source.destroy();
  }
}

main().catch(error => {
  console.error('Course seed failed', { code: error.driverError?.code || error.code || 'SEED' });
  process.exitCode = 1;
});
