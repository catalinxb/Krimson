const express = require('express');
const Joi = require('joi');
const prisma = require('../lib/db');
const auth = require('../lib/enhancedAuth');
const { recordAudit } = require('../lib/auditLog');

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  twoFactorCode: Joi.string().length(6).optional()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  password: Joi.string().min(6).required()
    .messages({
      'string.min': 'Password must be at least 6 characters long'
    }),
  displayName: Joi.string().min(1).max(50).optional()
}).unknown(true);

const passwordResetSchema = Joi.object({
  tokenId: Joi.string().uuid().required(),
  token: Joi.string().hex().length(64).required(),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
});

const twoFactorVerifySchema = Joi.object({
  code: Joi.string().length(6).required()
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  const clientIp = req.ip || req.connection?.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      await auth.recordLoginAttempt({
        email: req.body.email,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'Validation error'
      });
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, twoFactorCode } = value;

    // Check for account lockout
    const isLocked = await auth.isAccountLocked(email, 5, 30);
    if (isLocked) {
      await auth.recordLoginAttempt({
        email,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'Account locked due to too many failed attempts'
      });
      return res.status(423).json({
        error: 'Account locked',
        message: 'Too many failed login attempts. Please try again after 30 minutes or reset your password.'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        twoFactorAuth: true,
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

    if (!user) {
      await auth.recordLoginAttempt({
        email,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'User not found'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    if (!auth.verifyPassword(password, user.password)) {
      await auth.recordLoginAttempt({
        userId: user.id,
        email,
        ipAddress: clientIp,
        userAgent,
        success: false,
        failureReason: 'Invalid password'
      });

      // Check if this is the 5th failed attempt and warn
      const failedAttempts = await auth.getRecentFailedAttempts(email, 30);
      if (failedAttempts >= 4) {
        return res.status(401).json({
          error: 'Invalid credentials',
          warning: 'One more failed attempt will lock your account for 30 minutes'
        });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (user.twoFactorAuth?.isEnabled) {
      if (!twoFactorCode) {
        return res.status(403).json({
          error: 'Two-factor authentication required',
          requires2FA: true,
          methods: ['totp', 'backup']
        });
      }

      const isValid2FA = await auth.verify2FA(user.id, twoFactorCode);
      if (!isValid2FA) {
        await auth.recordLoginAttempt({
          userId: user.id,
          email,
          ipAddress: clientIp,
          userAgent,
          success: false,
          failureReason: 'Invalid 2FA code'
        });
        return res.status(401).json({ error: 'Invalid two-factor authentication code' });
      }
    }

    // Record successful login
    await auth.recordLoginAttempt({
      userId: user.id,
      email,
      ipAddress: clientIp,
      userAgent,
      success: true
    });

    // Create session
    const session = await auth.createSession(user.id, req);

    // Create refresh token
    const refreshToken = await auth.createRefreshToken(user.id);

    // Create access token
    const userPayload = auth.normalizeUserPayload(user);
    const accessToken = auth.createAccessToken(userPayload);

    // Record audit
    await recordAudit({
      userId: user.id,
      action: 'user:login',
      resource: 'User',
      status: 'success',
      details: `User logged in from ${clientIp}`
    });

    res.json({
      user: userPayload,
      accessToken,
      refreshToken: {
        id: refreshToken.id,
        token: refreshToken.token,
        expiresAt: refreshToken.expiresAt
      },
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== REGISTER ====================
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password } = value;

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if username exists (if provided)
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: username.toLowerCase() }
      });
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const hashedPassword = auth.hashPassword(password);

    // Get default role
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'trader' }
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username ? username.toLowerCase() : null,
        password: hashedPassword,
        userRoles: defaultRole ? {
          create: {
            roleId: defaultRole.id
          }
        } : undefined,
        profile: {
          create: {
            displayName: username || email.split('@')[0],
            pipValue: 1.0,
            theme: 'dark'
          }
        }
      },
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

    // Create session and tokens
    const session = await auth.createSession(user.id, req);
    const refreshToken = await auth.createRefreshToken(user.id);
    const userPayload = auth.normalizeUserPayload(user);
    const accessToken = auth.createAccessToken(userPayload);

    // Record audit
    await recordAudit({
      userId: user.id,
      action: 'user:register',
      resource: 'User',
      status: 'success',
      details: `New user registered: ${email}`
    });

    res.status(201).json({
      user: userPayload,
      accessToken,
      refreshToken: {
        id: refreshToken.id,
        token: refreshToken.token,
        expiresAt: refreshToken.expiresAt
      },
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== REFRESH TOKEN ====================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshTokenId, refreshToken } = req.body;

    if (!refreshTokenId || !refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const tokenData = await auth.verifyRefreshToken(refreshTokenId, refreshToken);
    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate refresh token (security best practice)
    const newRefreshToken = await auth.rotateRefreshToken(refreshTokenId, tokenData.userId);

    // Create new access token
    const userPayload = auth.normalizeUserPayload(tokenData.user);
    const accessToken = auth.createAccessToken(userPayload);

    res.json({
      accessToken,
      refreshToken: {
        id: newRefreshToken.id,
        token: newRefreshToken.token,
        expiresAt: newRefreshToken.expiresAt
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== LOGOUT ====================
router.post('/logout', async (req, res) => {
  try {
    const authData = await auth.authenticateRequest(req);
    const { sessionId } = req.body;

    // Invalidate session if provided
    if (sessionId) {
      await auth.invalidateSession(sessionId);
    }

    // Invalidate all sessions for the user if requested
    if (req.body.allSessions && authData) {
      await auth.invalidateAllUserSessions(authData.user.id);
      await auth.revokeAllUserRefreshTokens(authData.user.id);
    }

    // Record audit
    if (authData) {
      await recordAudit({
        userId: authData.user.id,
        action: 'user:logout',
        resource: 'User',
        status: 'success',
        details: req.body.allSessions ? 'Logged out from all sessions' : 'Logged out'
      });
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PASSWORD RECOVERY ====================

// Request password reset
router.post('/password/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    // Create password reset token
    const resetToken = await auth.createPasswordResetToken(user.id);

    // TODO: Send email with reset link
    // For now, return the token in development mode
    console.log(`Password reset token for ${email}: ${resetToken.id}.${resetToken.token}`);

    await recordAudit({
      userId: user.id,
      action: 'password:reset:request',
      resource: 'User',
      status: 'success',
      details: 'Password reset requested'
    });

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent',
      // Only in development:
      devToken: process.env.NODE_ENV === 'development' ? `${resetToken.id}.${resetToken.token}` : undefined
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with token
router.post('/password/reset', async (req, res) => {
  try {
    const { error, value } = passwordResetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { tokenId, token, newPassword } = value;

    // Validate reset token
    const resetToken = await auth.validatePasswordResetToken(tokenId, token);
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = auth.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    });

    // Mark token as used
    await auth.usePasswordResetToken(tokenId);

    // Invalidate all sessions and refresh tokens for security
    await auth.invalidateAllUserSessions(resetToken.userId);
    await auth.revokeAllUserRefreshTokens(resetToken.userId);

    await recordAudit({
      userId: resetToken.userId,
      action: 'password:reset:complete',
      resource: 'User',
      status: 'success',
      details: 'Password reset completed'
    });

    res.json({ message: 'Password reset successful. Please log in with your new password.' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TWO-FACTOR AUTHENTICATION ====================

// Setup 2FA
router.post('/2fa/setup', auth.requireAuth(), async (req, res) => {
  try {
    const { method = 'totp' } = req.body;

    const setupData = await auth.setup2FA(req.authUser.id, method);

    // Generate QR code URL (for TOTP apps like Google Authenticator)
    const issuer = 'KrimsonTrader';
    const accountName = req.authUser.email;
    const qrCodeUrl = `otpauth://totp/${issuer}:${accountName}?secret=${setupData.secret}&issuer=${issuer}`;

    res.json({
      secret: setupData.secret,
      backupCodes: setupData.backupCodes,
      qrCodeUrl,
      method
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify and enable 2FA
router.post('/2fa/verify', auth.requireAuth(), async (req, res) => {
  try {
    const { error } = twoFactorVerifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { code } = req.body;

    const success = await auth.verifyAndEnable2FA(req.authUser.id, code);
    if (!success) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await recordAudit({
      userId: req.authUser.id,
      action: '2fa:enable',
      resource: 'User',
      status: 'success',
      details: 'Two-factor authentication enabled'
    });

    res.json({ message: 'Two-factor authentication enabled successfully' });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable 2FA
router.post('/2fa/disable', auth.requireAuth(), async (req, res) => {
  try {
    const { password } = req.body;

    // Verify password before disabling 2FA
    const user = await prisma.user.findUnique({
      where: { id: req.authUser.id }
    });

    if (!auth.verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await auth.disable2FA(req.authUser.id);

    await recordAudit({
      userId: req.authUser.id,
      action: '2fa:disable',
      resource: 'User',
      status: 'success',
      details: 'Two-factor authentication disabled'
    });

    res.json({ message: 'Two-factor authentication disabled' });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get 2FA status
router.get('/2fa/status', auth.requireAuth(), async (req, res) => {
  try {
    const status = await auth.get2FAStatus(req.authUser.id);
    res.json(status);
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SESSION MANAGEMENT ====================

// Get active sessions
router.get('/sessions', auth.requireAuth(), async (req, res) => {
  try {
    const sessions = await auth.getActiveSessions(req.authUser.id);
    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
        isCurrent: s.token === req.headers['x-session-token']?.split('.')[1] ? false : undefined
      }))
    });
  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke specific session
router.delete('/sessions/:id', auth.requireAuth(), async (req, res) => {
  try {
    const sessionId = req.params.id;

    // Verify session belongs to user
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.userId !== req.authUser.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await auth.invalidateSession(sessionId);

    res.json({ message: 'Session revoked' });
  } catch (error) {
    console.error('Session revoke error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CHANGE PASSWORD ====================
router.post('/password/change', auth.requireAuth(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
      });
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: req.authUser.id }
    });

    // Verify current password
    if (!auth.verifyPassword(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await prisma.user.update({
      where: { id: req.authUser.id },
      data: { password: auth.hashPassword(newPassword) }
    });

    // Invalidate all sessions except current
    const allSessions = await auth.getActiveSessions(req.authUser.id);
    const currentSessionHeader = req.headers['x-session-token'];
    const currentSessionId = currentSessionHeader?.split('.')[0];

    for (const session of allSessions) {
      if (session.id !== currentSessionId) {
        await auth.invalidateSession(session.id);
      }
    }

    await recordAudit({
      userId: req.authUser.id,
      action: 'password:change',
      resource: 'User',
      status: 'success',
      details: 'Password changed successfully'
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
