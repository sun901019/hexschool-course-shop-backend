const express = require('express');
const { readConfig } = require('./src/config');
const { createDataSource } = require('./src/db/data-source');
const { createApp } = require('./src/app');

const app = express();
app.disable('x-powered-by');
let initialized;

async function initialize() {
  let step = 'configuration';
  let source;
  try {
    const config = readConfig();
    step = 'database-driver';
    source = createDataSource(config);
    step = 'database-connect';
    await source.initialize();
    step = 'database-schema';
    if (await source.showMigrations()) {
      throw Object.assign(new Error('Run npm run db:migrate first'), { code: 'MIGRATION_REQUIRED' });
    }
    step = 'express';
    return createApp(source, config);
  } catch (error) {
    const configKey = step === 'configuration' ? error.message?.match(/^COURSE_[A-Z_]+/)?.[0] : undefined;
    console.error('Course API startup failed', { step, code: error.driverError?.code || error.code || error.name, configKey });
    if (source?.isInitialized) await source.destroy();
    throw error;
  }
}

app.use(async (req, res, next) => {
  initialized ??= initialize().catch(error => {
    initialized = undefined;
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
