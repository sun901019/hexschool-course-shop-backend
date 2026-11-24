function createCatalogController(catalog) {
  return {
    async listCategories(req, res) {
      res.json({ data: await catalog.listCategories() });
    },
    async listProducts(req, res) {
      res.json(await catalog.listProducts(req.query));
    },
    async getProduct(req, res) {
      res.json({ data: await catalog.getProduct(req.params.id) });
    },
    async createProduct(req, res) {
      res.status(201).json({ data: await catalog.createProduct(req.body) });
    },
    async updateProduct(req, res) {
      res.json({ data: await catalog.updateProduct(req.params.id, req.body) });
    },
    async deleteProduct(req, res) {
      await catalog.deleteProduct(req.params.id);
      res.status(204).end();
    },
  };
}

module.exports = { createCatalogController };
