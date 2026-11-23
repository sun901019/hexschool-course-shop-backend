function createCartController(cart) {
  return {
    async get(req, res) {
      res.json({ data: await cart.get(req.user.id) });
    },
    async add(req, res) {
      const view = await cart.add(req.user.id, req.body, req.get('Idempotency-Key'));
      res.json({ data: view });
    },
    async setQuantity(req, res) {
      res.json({ data: await cart.setQuantity(req.user.id, req.params.id, req.body) });
    },
    async remove(req, res) {
      res.json({ data: await cart.remove(req.user.id, req.params.id) });
    },
  };
}

module.exports = { createCartController };
