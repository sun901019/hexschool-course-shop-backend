const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { createAuthService } = require('../services/auth-service');
const { createCatalogService } = require('../services/catalog-service');
const { createCartService } = require('../services/cart-service');
const { createAuthController } = require('../controllers/auth-controller');
const { createCatalogController } = require('../controllers/catalog-controller');
const { createCartController } = require('../controllers/cart-controller');
const { requireRole } = require('../middleware/require-role');

function createApiRouter(source, config) {
  const api = express.Router();
  const auth = createAuthService(source, config);
  const authController = createAuthController(auth);
  const catalogController = createCatalogController(createCatalogService(source));
  const cartController = createCartController(createCartService(source));
  const member = requireRole(auth, 'Member');
  const admin = requireRole(auth, 'Admin');
  const authLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 35,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: '操作太頻繁，請稍後再試。' } },
  });

  api.get('/health', async (req, res) => {
    await source.getRepository('Category').count();
    res.json({ data: { status: 'ok' } });
  });
  api.get('/categories', catalogController.listCategories);
  api.get('/products', catalogController.listProducts);
  api.get('/products/:id', catalogController.getProduct);
  api.post('/auth/register', authLimit, authController.register);
  api.post('/auth/login', authLimit, authController.login);
  api.get('/auth/session', authController.session);
  api.post('/auth/logout', authController.logout);

  api.get('/cart', member, cartController.getCart);
  api.post('/cart/items', member, cartController.addItem);
  api.patch('/cart/items/:id', member, cartController.updateItemQuantity);
  api.delete('/cart/items/:id', member, cartController.removeItem);

  api.get('/admin/products', admin, catalogController.listProducts);
  api.post('/admin/products', admin, catalogController.createProduct);
  api.get('/admin/products/:id', admin, catalogController.getProduct);
  api.patch('/admin/products/:id', admin, catalogController.updateProduct);
  api.delete('/admin/products/:id', admin, catalogController.deleteProduct);
  return api;
}

module.exports = { createApiRouter };
