const { httpError } = require('./error');

function invalid(message) {
  throw httpError(400, 'INVALID_INPUT', message);
}

function bodyWithKeys(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('請送出 JSON 物件。');
  if (Object.keys(body).some(key => !allowed.includes(key))) invalid('有欄位不在允許的範圍。');
  return body;
}

function string(value, label, max, min = 1) {
  if (typeof value !== 'string') invalid(label + '必須是文字。');
  const result = value.trim();
  if (result.length < min || result.length > max) invalid(label + '的長度不正確。');
  return result;
}

function email(value) {
  const result = string(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) invalid('請輸入有效的 Email。');
  return result;
}

function password(value, minimum) {
  if (typeof value !== 'string' || value.length < minimum || value.length > 72) invalid('密碼長度不正確。');
  return value;
}

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) invalid(label + '必須是 ' + min + ' 至 ' + max + ' 的整數。');
  return value;
}

function uuid(value, label = '編號') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) invalid(label + '格式不正確。');
  return value.toLowerCase();
}

module.exports = { invalid, bodyWithKeys, string, email, password, integer, uuid };
