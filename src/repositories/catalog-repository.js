function createCatalogRepository(source) {
  function listCategories() {
    return source.getRepository('Category').find({ order: { name: 'ASC', id: 'ASC' } });
  }

  async function listProducts({ page, limit, keyword, categoryId }) {
    const query = source.getRepository('Product').createQueryBuilder('product');
    if (categoryId) query.andWhere('product.categoryId = :categoryId', { categoryId });
    if (keyword) query.andWhere('strpos(lower(product.name), lower(:keyword)) > 0', { keyword });
    return query.orderBy('product.slug', 'ASC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  function findProduct(id) {
    return source.getRepository('Product').findOneBy({ id });
  }

  async function variantsFor(products) {
    if (products.length === 0) return [];
    return source.getRepository('Variant').createQueryBuilder('variant')
      .where('variant.productId IN (:...ids)', { ids: products.map(product => product.id) })
      .orderBy('variant.position', 'ASC')
      .getMany();
  }

  function categoryExists(id) {
    return source.getRepository('Category').existsBy({ id });
  }

  function createProduct(product, variants) {
    return source.transaction(async manager => {
      const saved = await manager.getRepository('Product').save(product);
      await manager.getRepository('Variant').insert(variants.map((variant, position) => ({
        ...variant, position, productId: saved.id,
      })));
      return saved.id;
    });
  }

  function updateProduct(id, patch) {
    return source.getRepository('Product').update({ id }, patch);
  }

  function deleteProduct(id) {
    return source.getRepository('Product').delete({ id });
  }

  return { listCategories, listProducts, findProduct, variantsFor, categoryExists, createProduct, updateProduct, deleteProduct };
}

module.exports = { createCatalogRepository };
