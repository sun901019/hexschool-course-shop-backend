function required(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(key + ' is required');
  return value;
}

function port(value, key) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 65535) throw new Error(key + ' is invalid');
  return number;
}

function hostedDatabase(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('COURSE_DATABASE_URL must be a PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
      !url.username || !url.password || url.pathname.length < 2) {
    throw new Error('COURSE_DATABASE_URL must include a host, role, password and database');
  }
  return {
    host: url.hostname,
    port: port(url.port || '5432', 'COURSE_DATABASE_URL port'),
    database: decodeURIComponent(url.pathname.slice(1)),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true },
    poolSize: 3,
    connectTimeoutMS: 10000,
  };
}

function readConfig(env = process.env) {
  const frontendOrigin = env.COURSE_FRONTEND_ORIGIN || 'http://127.0.0.1:4410';
  const parsedOrigin = new URL(frontendOrigin);
  if (parsedOrigin.origin !== frontendOrigin || !['http:', 'https:'].includes(parsedOrigin.protocol)) {
    throw new Error('COURSE_FRONTEND_ORIGIN must be a full origin without a path');
  }
  const jwtSecret = required(env, 'COURSE_JWT_SECRET');
  if (Buffer.byteLength(jwtSecret) < 32) throw new Error('COURSE_JWT_SECRET requires at least 32 bytes');
  return {
    apiPort: port(env.COURSE_API_PORT || '4411', 'COURSE_API_PORT'),
    bindHost: env.COURSE_API_HOST || '127.0.0.1',
    frontendOrigin,
    jwtSecret,
    cookieSecure: env.COURSE_COOKIE_SECURE === 'true',
    trustProxy: env.VERCEL === '1' ? 1 : false,
    db: env.COURSE_DATABASE_URL ? hostedDatabase(env.COURSE_DATABASE_URL) : {
      host: env.COURSE_DB_HOST || '127.0.0.1',
      port: port(env.COURSE_DB_PORT || '55442', 'COURSE_DB_PORT'),
      database: required(env, 'COURSE_DB_NAME'),
      username: required(env, 'COURSE_DB_USER'),
      password: required(env, 'COURSE_DB_PASSWORD'),
      ssl: env.COURSE_DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    },
  };
}

module.exports = { readConfig };
