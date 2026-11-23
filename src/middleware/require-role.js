const { httpError } = require('../http/error');

function requireRole(auth, role) {
  return async (req, res, next) => {
    const user = await auth.sessionUser(req.cookies[auth.cookieName]);
    if (!user) throw httpError(401, 'SIGN_IN_REQUIRED', '請先登入。');
    if (user.role !== role) throw httpError(403, 'FORBIDDEN', '這個帳號沒有操作權限。');
    req.user = user;
    next();
  };
}

module.exports = { requireRole };
