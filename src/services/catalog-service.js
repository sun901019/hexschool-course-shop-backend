const check = require('../http/validate');
const { httpError } = require('../http/error');
const { createCatalogRepository } = require('../repositories/catalog-repository');

function numericQuery(value, fallback, label, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d{1,6}$/.test(value)) check.invalid(label + '格式不正確。');
  return check.integer(Number(value), 1, max, label);
}

function readSlug(value) {
  const slug = check.string(value, '商品網址代稱', 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) check.invalid('商品網址代稱請用小寫英文、數字及連字號。');
  return slug;
}

function readVariants(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) check.invalid('請提供一或兩個商品款式。');
  return value.map(variant => {
    check.bodyWithKeys(variant, ['label', 'price', 'stock']);
    return {
      label: check.string(variant.label, '款式', 50),
      price: check.integer(variant.price, 1, 99999, '價格'),
      stock: check.integer(variant.stock, 0, 9999, '庫存'),
    };
  });
}

function createCatalogService(source) {
  const catalog = createCatalogRepository(source);

  async function serializeProducts(products) {
    const [categories, variants] = await Promise.all([catalog.listCategories(), catalog.variantsFor(products)]);
    const byCategory = new Map(categories.map(category => [category.id, category]));
    const byProduct = Map.groupBy(variants, variant => variant.productId);
    return products.map(product => {
      const choices = (byProduct.get(product.id) || []).map(({ id, label, price, stock }) => ({ id, label, price, stock }));
      return {
        id: product.id, slug: product.slug, name: product.name, description: product.description,
        category: byCategory.get(product.categoryId),
        price: choices.length ? Math.min(...choices.map(choice => choice.price)) : null,
        available: choices.some(choice => choice.stock > 0),
        variants: choices,
      };
    });
  }

  async function listProducts(query) {
    const page = numericQuery(query.page, 1, '頁碼', 100000);
    const limit = numericQuery(query.limit, 4, '每頁筆數', 20);
    const keyword = query.q === undefined ? '' : check.string(query.q, '搜尋字詞', 80, 0);
    const categoryId = query.category === undefined ? undefined : check.uuid(query.category, '分類');
    const [products, total] = await catalog.listProducts({ page, limit, keyword, categoryId });
    return { data: await serializeProducts(products), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async function getProduct(id) {
    const item = await catalog.findProduct(check.uuid(id, '商品編號'));
    if (!item) throw httpError(404, 'PRODUCT_NOT_FOUND', '找不到這件商品。');
    return (await serializeProducts([item]))[0];
  }

  async function requireCategory(id) {
    if (!(await catalog.categoryExists(id))) check.invalid('找不到指定的分類。');
    return id;
  }

  async function withUniqueSlug(operation) {
    try {
      return await operation();
    } catch (error) {
      if (error.driverError?.code === '23505') throw httpError(409, 'PRODUCT_EXISTS', '這個商品代稱已使用。');
      throw error;
    }
  }

  async function createProduct(body) {
    check.bodyWithKeys(body, ['name', 'slug', 'description', 'categoryId', 'variants']);
    const product = {
      name: check.string(body.name, '品名', 80),
      slug: readSlug(body.slug),
      description: check.string(body.description, '商品介紹', 1000),
      categoryId: await requireCategory(check.uuid(body.categoryId, '分類')),
    };
    const variants = readVariants(body.variants);
    return getProduct(await withUniqueSlug(() => catalog.createProduct(product, variants)));
  }

  async function updateProduct(id, body) {
    check.uuid(id, '商品編號');
    check.bodyWithKeys(body, ['name', 'slug', 'description', 'categoryId']);
    const values = {};
    if (Object.hasOwn(body, 'name')) values.name = check.string(body.name, '品名', 80);
    if (Object.hasOwn(body, 'slug')) values.slug = readSlug(body.slug);
    if (Object.hasOwn(body, 'description')) values.description = check.string(body.description, '商品介紹', 1000);
    if (Object.hasOwn(body, 'categoryId')) values.categoryId = await requireCategory(check.uuid(body.categoryId, '分類'));
    if (!Object.keys(values).length) check.invalid('請指定要修改的欄位。');
    const result = await withUniqueSlug(() => catalog.updateProduct(id, values));
    if (!result.affected) throw httpError(404, 'PRODUCT_NOT_FOUND', '找不到這件商品。');
    return getProduct(id);
  }

  async function deleteProduct(id) {
    const result = await catalog.deleteProduct(check.uuid(id, '商品編號'));
    if (!result.affected) throw httpError(404, 'PRODUCT_NOT_FOUND', '找不到這件商品。');
  }

  return { listCategories: catalog.listCategories, listProducts, getProduct, createProduct, updateProduct, deleteProduct };
}

module.exports = { createCatalogService };
