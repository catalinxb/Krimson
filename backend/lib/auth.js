const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET || 'krimson-secret-2026';
// Token TTL: default 30 minutes to match frontend session timeout, or 1 hour if not set
const TOKEN_TTL = parseInt(process.env.SESSION_TIMEOUT_SECONDS, 10) || (30 * 60);
const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes('$')) {
    return false;
  }
  const [salt, hash] = stored.split('$');
  const candidate = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload) {
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return signature;
}

function createToken(payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }));
  const signature = signPayload(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const expected = signPayload(`${header}.${body}`);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function extractToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') {
    return null;
  }
  const [, token] = header.split(' ');
  return token || null;
}

function authenticateRequest(req) {
  const token = extractToken(req);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

function normalizeUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt?.toISOString?.() || null,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    profile: user.profile || null
  };
}

function hasPermission(user, permission) {
  return user && Array.isArray(user.permissions) && user.permissions.includes(permission);
}

function hasRole(user, roleName) {
  return user && Array.isArray(user.roles) && user.roles.some((role) => role.name === roleName);
}

function isAdmin(user) {
  return hasRole(user, 'admin');
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  extractToken,
  authenticateRequest,
  normalizeUserPayload,
  hasPermission,
  hasRole,
  isAdmin
};
