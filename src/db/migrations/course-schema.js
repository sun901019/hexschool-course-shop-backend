const fs = require('node:fs');
const path = require('node:path');

class CourseSchema1795108800000 {
  async up(runner) {
    const schema = fs.readFileSync(path.join(__dirname, '001-course-schema.sql'), 'utf8');
    await runner.query(schema);
  }

  async down(runner) {
    await runner.query('DROP TABLE cart_additions, cart_items, carts, variants, products, categories, sessions, users');
  }
}

module.exports = { CourseSchema1795108800000 };
