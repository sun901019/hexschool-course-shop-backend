const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { createAuthService } = require('../services/auth-service');
const { createCatalogService } = require('../services/catalog-service');
const { createCartService } = require('../services/cart-service');
const { createAuthController } = require('../controllers/auth-controller');
const { createCatalogController } = require('../controllers/catalog-controller');
const { createCartController } = require('../controllers/cart-controller');
const { requireRole } = require('../middleware/require-role');

function makeRoutes(source, config) {
  const api = express.Router();
  const auth = createAuthService(source, config);
  const authController = createAuthController(auth);
  const catalog = createCatalogController(createCatalogService(source));
  const cart = createCartController(createCartService(source));
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
  api.get('/categories', catalog.categories);
  api.get('/products', catalog.list);
  api.get('/products/:id', catalog.detail);
  api.post('/auth/register', authLimit, authController.register);
  api.post('/auth/login', authLimit, authController.login);
  api.get('/auth/session', authController.session);
  api.post('/auth/logout', authController.logout);

  api.get('/cart', member, cart.get);
  api.post('/cart/items', member, cart.add);
  api.patch('/cart/items/:id', member, cart.setQuantity);
  api.delete('/cart/items/:id', member, cart.remove);

  api.get('/admin/products', admin, catalog.list);
  api.post('/admin/products', admin, catalog.create);
  api.get('/admin/products/:id', admin, catalog.detail);
  api.patch('/admin/products/:id', admin, catalog.update);
  api.delete('/admin/products/:id', admin, catalog.remove);
  return api;
}

module.exports = { makeRoutes };
