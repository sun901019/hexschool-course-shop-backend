const { DataSource } = require('typeorm');
const postgres = require('pg');
const entities = require('./entities');
const { CourseSchema1795108800000 } = require('./migrations/course-schema');

function createDataSource(config) {
  return new DataSource({
    type: 'postgres',
    driver: postgres,
    ...config.db,
    synchronize: false,
    migrationsRun: false,
    entities: Object.values(entities),
    migrations: [CourseSchema1795108800000],
    migrationsTableName: 'course_migrations',
  });
}

module.exports = { createDataSource };
