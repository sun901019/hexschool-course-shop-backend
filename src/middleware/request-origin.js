const { httpError } = require('../http/error');

function allowCourseRequests(allowedOrigin) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin && origin !== allowedOrigin) throw httpError(403, 'ORIGIN_DENIED', '這個來源無法使用課程 API。');

    if (origin) {
      res.set('Access-Control-Allow-Origin', allowedOrigin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Idempotency-Key');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.vary('Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    const writes = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method);
    if (writes && req.get('X-Requested-With') !== 'XMLHttpRequest') {
      throw httpError(403, 'REQUEST_HEADER_REQUIRED', '請使用課程頁面或附上 API 說明中的請求標頭。');
    }
    next();
  };
}

module.exports = { allowCourseRequests };
