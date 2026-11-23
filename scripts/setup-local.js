const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  console.log('Kept the existing .env.');
  process.exit(0);
}
const fields = {
  COURSE_DB_PASSWORD: randomBytes(20).toString('base64url'),
  COURSE_JWT_SECRET: randomBytes(32).toString('hex'),
  COURSE_DEMO_MEMBER_PASSWORD: randomBytes(16).toString('base64url'),
  COURSE_DEMO_ADMIN_PASSWORD: randomBytes(16).toString('base64url'),
};
let sample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const [key, value] of Object.entries(fields)) {
  sample = sample.replace(new RegExp('^' + key + '=.*$', 'm'), key + '=' + value);
}
fs.writeFileSync(envFile, sample, { flag: 'wx', mode: 0o600 });
const local = path.join(root, '.runtime');
fs.mkdirSync(local, { recursive: true });
fs.writeFileSync(path.join(local, 'demo-accounts.txt'), [
  '課程測試帳號（本機）',
  '一般會員 member@example.test',
  '密碼 ' + fields.COURSE_DEMO_MEMBER_PASSWORD,
  '管理員 admin@example.test',
  '密碼 ' + fields.COURSE_DEMO_ADMIN_PASSWORD,
  '',
].join('\n'), { flag: 'wx', mode: 0o600 });
console.log('Wrote local .env and the ignored .runtime/demo-accounts.txt.');
