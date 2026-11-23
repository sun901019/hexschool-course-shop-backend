class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function httpError(status, code, message) {
  return new HttpError(status, code, message);
}

function errorResponse(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: '請送出有效的 JSON。' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: '送出的資料太大。' } });
  }
  console.error('course_api_request_failed', { code: error.driverError?.code || error.code || 'INTERNAL' });
  return res.status(500).json({ error: { code: 'INTERNAL', message: '暫時無法完成，請稍後再試。' } });
}

module.exports = { httpError, errorResponse };
