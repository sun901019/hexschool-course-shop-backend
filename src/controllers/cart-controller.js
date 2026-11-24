function createCartController(cart) {
  return {
    async getCart(req, res) {
      res.json({ data: await cart.getCart(req.user.id) });
    },
    async addItem(req, res) {
      const updatedCart = await cart.addItem(req.user.id, req.body, req.get('Idempotency-Key'));
      res.json({ data: updatedCart });
    },
    async updateItemQuantity(req, res) {
      res.json({ data: await cart.updateItemQuantity(req.user.id, req.params.id, req.body) });
    },
    async removeItem(req, res) {
      res.json({ data: await cart.removeItem(req.user.id, req.params.id) });
    },
  };
}

module.exports = { createCartController };
