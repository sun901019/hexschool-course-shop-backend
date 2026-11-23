function createCatalogController(catalog) {
  return {
    async categories(req, res) {
      res.json({ data: await catalog.categories() });
    },
    async list(req, res) {
      res.json(await catalog.listProducts(req.query));
    },
    async detail(req, res) {
      res.json({ data: await catalog.detail(req.params.id) });
    },
    async create(req, res) {
      res.status(201).json({ data: await catalog.createProduct(req.body) });
    },
    async update(req, res) {
      res.json({ data: await catalog.updateProduct(req.params.id, req.body) });
    },
    async remove(req, res) {
      await catalog.deleteProduct(req.params.id);
      res.status(204).end();
    },
  };
}

module.exports = { createCatalogController };
