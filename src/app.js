const express = require('express');
const cookieParser = require('cookie-parser');
const { httpError, errorResponse } = require('./http/error');
const { allowCourseRequests } = require('./middleware/request-origin');
const { makeRoutes } = require('./routes');

function createApp(source, config) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use('/api/v1', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use('/api/v1', allowCourseRequests(config.frontendOrigin), express.json({ limit: '16kb' }), cookieParser(), makeRoutes(source, config));
  app.use((req, res, next) => next(httpError(404, 'NOT_FOUND', '找不到這個路徑。')));
  app.use(errorResponse);
  return app;
}

module.exports = { createApp };
