const crypto = require('crypto');
const prisma = require('./db');

const SECRET = process.env.AUTH_SECRET || 'krimson-secret-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'krimson-refresh-secret-2026';

// Token TTL settings
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const SESSION_TTL = 30 * 60; // 30 minutes
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour

// Password hashing settings
const HASH_ITERATIONS = 120000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

// ==================== PASSWORD HASHING ====================

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

// ==================== TOKEN UTILITIES ====================

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

// ==================== JWT ACCESS TOKENS ====================

function createAccessToken(payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL,
    iat: Math.floor(Date.now() / 1000),
    type: 'access'
  }));
  const signature = signPayload(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = signPayload(`${header}.${body}`);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (payload.type !== 'access') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ==================== REFRESH TOKENS ====================

async function createRefreshToken(userId) {
  const tokenId = crypto.randomUUID();
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId,
      token: hashPassword(token), // Hash the token for storage
      expiresAt,
    }
  });

  return { id: tokenId, token, expiresAt };
}

async function verifyRefreshToken(tokenId, plainToken) {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { id: tokenId },
    include: { user: { include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } }
  });

  if (!refreshToken) return null;
  if (refreshToken.isRevoked) return null;
  if (refreshToken.expiresAt < new Date()) return null;
  if (!verifyPassword(plainToken, refreshToken.token)) return null;

  return refreshToken;
}

async function revokeRefreshToken(tokenId) {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { isRevoked: true }
  });
}

async function revokeAllUserRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true }
  });
}

async function rotateRefreshToken(oldTokenId, userId) {
  const newToken = await createRefreshToken(userId);
  await prisma.refreshToken.update({
    where: { id: oldTokenId },
    data: { isRevoked: true, replacedBy: newToken.id }
  });
  return newToken;
}

// ==================== SESSION MANAGEMENT ====================

async function createSession(userId, req) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      token: hashPassword(token),
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      expiresAt,
    }
  });

  return { id: session.id, token, expiresAt };
}

async function validateSession(sessionId, plainToken) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (!session) return null;
  if (!session.isValid) return null;
  if (session.expiresAt < new Date()) return null;
  if (!verifyPassword(plainToken, session.token)) return null;

  // Update last activity
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivity: new Date() }
  });

  return session;
}

async function invalidateSession(sessionId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isValid: false }
  });
}

async function invalidateAllUserSessions(userId) {
  await prisma.session.updateMany({
    where: { userId },
    data: { isValid: false }
  });
}

async function getActiveSessions(userId) {
  return prisma.session.findMany({
    where: {
      userId,
      isValid: true,
      expiresAt: { gt: new Date() }
    },
    orderBy: { lastActivity: 'desc' }
  });
}

// ==================== TWO-FACTOR AUTHENTICATION ====================

function generateTOTPSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

function hashBackupCodes(codes) {
  return codes.map(code => hashPassword(code));
}

function verifyBackupCode(plainCode, hashedCodes) {
  return hashedCodes.some(hashed => verifyPassword(plainCode, hashed));
}

function generateTOTPCode(secret, timeStep = 30) {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(time), 0);

  const secretBuffer = Buffer.from(secret, 'base64url');
  const hmac = crypto.createHmac('sha1', secretBuffer).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 |
                (hmac[offset + 1] & 0xff) << 16 |
                (hmac[offset + 2] & 0xff) << 8 |
                (hmac[offset + 3] & 0xff)) % 1000000;

  return code.toString().padStart(6, '0');
}

function verifyTOTP(secret, code, window = 1) {
  for (let i = -window; i <= window; i++) {
    const timeStep = 30;
    const time = Math.floor(Date.now() / 1000 / timeStep) + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time), 0);

    const secretBuffer = Buffer.from(secret, 'base64url');
    const hmac = crypto.createHmac('sha1', secretBuffer).update(timeBuffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const expectedCode = ((hmac[offset] & 0x7f) << 24 |
                          (hmac[offset + 1] & 0xff) << 16 |
                          (hmac[offset + 2] & 0xff) << 8 |
                          (hmac[offset + 3] & 0xff)) % 1000000;

    if (expectedCode.toString().padStart(6, '0') === code) {
      return true;
    }
  }
  return false;
}

async function setup2FA(userId, method = 'totp') {
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = hashBackupCodes(backupCodes);

  await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: {
      userId,
      secret,
      backupCodes: JSON.stringify(hashedBackupCodes),
      method,
      isEnabled: false
    },
    update: {
      secret,
      backupCodes: JSON.stringify(hashedBackupCodes),
      method,
      isEnabled: false,
      verifiedAt: null
    }
  });

  return { secret, backupCodes };
}

async function verifyAndEnable2FA(userId, code) {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId }
  });

  if (!twoFactor || twoFactor.isEnabled) return false;

  const isValid = verifyTOTP(twoFactor.secret, code);
  if (!isValid) return false;

  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      isEnabled: true,
      verifiedAt: new Date()
    }
  });

  return true;
}

async function verify2FA(userId, code) {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId }
  });

  if (!twoFactor || !twoFactor.isEnabled) return false;

  // Check TOTP
  if (verifyTOTP(twoFactor.secret, code)) {
    return true;
  }

  // Check backup codes
  const hashedCodes = JSON.parse(twoFactor.backupCodes);
  if (verifyBackupCode(code, hashedCodes)) {
    return true;
  }

  return false;
}

async function disable2FA(userId) {
  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      isEnabled: false,
      verifiedAt: null
    }
  });
}

async function get2FAStatus(userId) {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId }
  });

  return {
    isEnabled: twoFactor?.isEnabled || false,
    method: twoFactor?.method || null,
    verifiedAt: twoFactor?.verifiedAt || null
  };
}

// ==================== PASSWORD RECOVERY ====================

async function createPasswordResetToken(userId) {
  // Invalidate any existing tokens
  await prisma.passwordReset.updateMany({
    where: { userId, isUsed: false },
    data: { isUsed: true }
  });

  const tokenId = crypto.randomUUID();
  const plainToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL * 1000);

  await prisma.passwordReset.create({
    data: {
      id: tokenId,
      userId,
      token: hashPassword(plainToken),
      expiresAt
    }
  });

  return { id: tokenId, token: plainToken, expiresAt };
}

async function validatePasswordResetToken(tokenId, plainToken) {
  const resetToken = await prisma.passwordReset.findUnique({
    where: { id: tokenId },
    include: { user: true }
  });

  if (!resetToken) return null;
  if (resetToken.isUsed) return null;
  if (resetToken.expiresAt < new Date()) return null;
  if (!verifyPassword(plainToken, resetToken.token)) return null;

  return resetToken;
}

async function usePasswordResetToken(tokenId) {
  await prisma.passwordReset.update({
    where: { id: tokenId },
    data: {
      isUsed: true,
      usedAt: new Date()
    }
  });
}

// ==================== LOGIN ATTEMPTS TRACKING ====================

async function recordLoginAttempt({ userId, email, ipAddress, userAgent, success, failureReason }) {
  await prisma.loginAttempt.create({
    data: {
      userId,
      email,
      ipAddress,
      userAgent,
      success,
      failureReason
    }
  });
}

async function getRecentFailedAttempts(email, minutes = 30) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: since }
    }
  });
}

async function isAccountLocked(email, maxAttempts = 5, windowMinutes = 30) {
  const failedAttempts = await getRecentFailedAttempts(email, windowMinutes);
  return failedAttempts >= maxAttempts;
}

// ==================== REQUEST AUTHENTICATION ====================

function extractToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [, token] = header.split(' ');
  return token || null;
}

function extractSessionToken(req) {
  const header = req.headers['x-session-token'];
  if (!header || typeof header !== 'string') return null;
  const [sessionId, token] = header.split('.');
  return sessionId && token ? { sessionId, token } : null;
}

async function authenticateRequest(req) {
  // Try JWT access token first
  const token = extractToken(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      return { type: 'jwt', user: payload };
    }
  }

  // Try session token
  const sessionData = extractSessionToken(req);
  if (sessionData) {
    const session = await validateSession(sessionData.sessionId, sessionData.token);
    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } }
                }
              }
            }
          }
        }
      });

      if (user) {
        return {
          type: 'session',
          user: normalizeUserPayload(user),
          sessionId: session.id
        };
      }
    }
  }

  return null;
}

// ==================== USER NORMALIZATION ====================

function normalizeUserPayload(user) {
  const roles = user.userRoles?.map(ur => ({
    id: ur.role.id,
    name: ur.role.name,
    description: ur.role.description
  })) || [];

  const permissions = Array.from(new Set(
    user.userRoles?.flatMap(ur =>
      ur.role.permissions.map(rp => rp.permission.name)
    ) || []
  ));

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt?.toISOString?.() || null,
    roles,
    permissions,
    profile: user.profile || null
  };
}

// ==================== PERMISSION CHECKS ====================

function hasPermission(user, permission) {
  return user && Array.isArray(user.permissions) && user.permissions.includes(permission);
}

function hasRole(user, roleName) {
  return user && Array.isArray(user.roles) && user.roles.some(role => role.name === roleName);
}

function isAdmin(user) {
  return hasRole(user, 'admin');
}

function requireAuth(permission = null) {
  return async (req, res, next) => {
    const auth = await authenticateRequest(req);

    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (permission && !hasPermission(auth.user, permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    req.auth = auth;
    req.authUser = auth.user;
    next();
  };
}

function requireAdmin() {
  return async (req, res, next) => {
    const auth = await authenticateRequest(req);

    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!isAdmin(auth.user)) {
      return res.status(403).json({ error: 'Admin permission required' });
    }

    req.auth = auth;
    req.authUser = auth.user;
    next();
  };
}

// ==================== EXPORTS ====================

module.exports = {
  // Password hashing
  hashPassword,
  verifyPassword,

  // Access tokens
  createAccessToken,
  verifyAccessToken,

  // Refresh tokens
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  rotateRefreshToken,

  // Sessions
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  getActiveSessions,

  // 2FA
  setup2FA,
  verifyAndEnable2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
  generateTOTPCode,

  // Password recovery
  createPasswordResetToken,
  validatePasswordResetToken,
  usePasswordResetToken,

  // Login tracking
  recordLoginAttempt,
  getRecentFailedAttempts,
  isAccountLocked,

  // Request auth
  authenticateRequest,
  extractToken,
  extractSessionToken,

  // User normalization
  normalizeUserPayload,

  // Permission checks
  hasPermission,
  hasRole,
  isAdmin,
  requireAuth,
  requireAdmin,

  // Constants
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  SESSION_TTL,
  PASSWORD_RESET_TTL
};
