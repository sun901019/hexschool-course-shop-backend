const { once } = require('node:events');
const { readConfig } = require('./config');
const { createDataSource } = require('./db/data-source');
const { createApp } = require('./app');

async function start() {
  const config = readConfig();
  const source = createDataSource(config);
  await source.initialize();
  try {
    if (await source.showMigrations()) throw new Error('Run npm run db:migrate first');
    const server = createApp(source, config).listen(config.apiPort, config.bindHost);
    await once(server, 'listening');
    console.log('Course API listening on ' + config.bindHost + ':' + config.apiPort);
    const close = () => server.close(async () => {
      await source.destroy();
    });
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  } catch (error) {
    await source.destroy();
    throw error;
  }
}

start().catch(error => {
  console.error('Course API could not start', { code: error.code || 'STARTUP', reason: error.message });
  process.exitCode = 1;
});
