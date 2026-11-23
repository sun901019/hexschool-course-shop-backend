const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { httpError } = require('../http/error');
const check = require('../http/validate');
const { createAccountRepository } = require('../repositories/account-repository');

const cookieName = 'course_session';
const sessionSeconds = 8 * 60 * 60;
const issuer = 'hexschool-course-shop';

function userView(user) {
  return { id: user.id, name: user.name, role: user.role };
}

function createAuthService(source, config) {
  const accounts = createAccountRepository(source);

  function readClaims(token) {
    if (typeof token !== 'string' || !token) return null;
    try {
      const claims = jwt.verify(token, config.jwtSecret, { issuer, algorithms: ['HS256'] });
      return typeof claims === 'object' && claims.sub && claims.jti ? claims : null;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) return null;
      throw error;
    }
  }

  async function register(body) {
    check.bodyWithKeys(body, ['name', 'email', 'password']);
    const name = check.string(body.name, '姓名', 60);
    const email = check.email(body.email);
    const password = check.password(body.password, 8);
    const passwordHash = await argon2.hash(password);
    try {
      return userView(await accounts.createMember({ name, email, passwordHash }));
    } catch (error) {
      if (error.driverError?.code === '23505') throw httpError(409, 'EMAIL_EXISTS', '這個 Email 已經註冊。');
      throw error;
    }
  }

  async function login(body) {
    check.bodyWithKeys(body, ['email', 'password']);
    const email = check.email(body.email);
    const password = check.password(body.password, 1);
    const user = await accounts.findUserByEmail(email);
    if (!user) {
      await argon2.hash(password);
      throw httpError(401, 'INVALID_LOGIN', 'Email 或密碼不正確。');
    }
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw httpError(401, 'INVALID_LOGIN', 'Email 或密碼不正確。');
    }
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + sessionSeconds * 1000);
    const token = jwt.sign({}, config.jwtSecret, {
      subject: user.id, jwtid: sessionId, issuer, expiresIn: sessionSeconds, algorithm: 'HS256',
    });
    await accounts.createSession({ id: sessionId, userId: user.id, expiresAt });
    return { token, user: userView(user) };
  }

  async function sessionUser(token) {
    const claims = readClaims(token);
    if (!claims) return null;
    const session = await accounts.findSession(claims.jti, claims.sub);
    if (!session || session.expiresAt <= new Date()) return null;
    const user = await accounts.findUser(session.userId);
    return user ? userView(user) : null;
  }

  async function logout(token) {
    const claims = readClaims(token);
    if (claims) await accounts.revokeSession(claims.jti, claims.sub);
  }

  const cookieOptions = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/api/v1' };
  return { register, login, sessionUser, logout, cookieName, cookieOptions, maxAge: sessionSeconds * 1000 };
}

module.exports = { createAuthService };
