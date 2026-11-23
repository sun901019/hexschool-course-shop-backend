function createAuthController(auth) {
  return {
    async register(req, res) {
      res.status(201).json({ data: { user: await auth.register(req.body) } });
    },
    async login(req, res) {
      const { user, token } = await auth.login(req.body);
      res.cookie(auth.cookieName, token, { ...auth.cookieOptions, maxAge: auth.maxAge });
      res.json({ data: { user } });
    },
    async session(req, res) {
      const user = await auth.sessionUser(req.cookies[auth.cookieName]);
      res.json({ data: { user } });
    },
    async logout(req, res) {
      await auth.logout(req.cookies[auth.cookieName]);
      res.clearCookie(auth.cookieName, auth.cookieOptions);
      res.json({ data: { user: null } });
    },
  };
}

module.exports = { createAuthController };
