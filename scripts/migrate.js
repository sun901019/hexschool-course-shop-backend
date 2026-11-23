const { readConfig } = require('../src/config');
const { createDataSource } = require('../src/db/data-source');

async function main() {
  const source = createDataSource(readConfig());
  await source.initialize();
  try {
    const migrations = await source.runMigrations({ transaction: 'all' });
    console.log('Applied course migrations: ' + migrations.length);
  } finally {
    await source.destroy();
  }
}

main().catch(error => {
  console.error('Course migration failed', { code: error.driverError?.code || error.code || 'MIGRATION' });
  process.exitCode = 1;
});
