const express = require('express');
const { readConfig } = require('./src/config');
const { createDataSource } = require('./src/db/data-source');
const { createApp } = require('./src/app');

const app = express();
app.disable('x-powered-by');
let initialized;

async function initialize() {
  const config = readConfig();
  const source = createDataSource(config);
  await source.initialize();
  try {
    if (await source.showMigrations()) throw new Error('Run npm run db:migrate first');
    return createApp(source, config);
  } catch (error) {
    await source.destroy();
    throw error;
  }
}

app.use(async (req, res, next) => {
  initialized ??= initialize().catch(error => {
    initialized = undefined;
    console.error('Course database startup failed', { code: error.driverError?.code || error.code || 'STARTUP' });
    throw error;
  });
  let handler;
  try {
    handler = await initialized;
  } catch {
    return res.set('Cache-Control', 'no-store').status(503).json({
      error: { code: 'COURSE_UNAVAILABLE', message: '課程 API 正在啟動，請稍後重試。' },
    });
  }
  return handler(req, res, next);
});

module.exports = app;
