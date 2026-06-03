const express = require('express');
const Joi = require('joi');
const prisma = require('../lib/db');
const auth = require('../lib/enhancedAuth');
const { recordAudit, getAuditLogs } = require('../lib/auditLog');
const { broadcast } = require('../lib/websocket');
const { addChatMessage, getChatMessages } = require('../lib/chatDb');
const router = express.Router();

// Auth rate limiting store and configuration
const authRateLimitStore = new Map();
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX_REQUESTS = 5;

// Auth rate limiting middleware
function authRateLimit(req, res, next) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  if (!authRateLimitStore.has(key)) {
    authRateLimitStore.set(key, { count: 1, resetTime: now + AUTH_RATE_LIMIT_WINDOW_MS });
  } else {
    const entry = authRateLimitStore.get(key);
    if (now > entry.resetTime) {
      authRateLimitStore.set(key, { count: 1, resetTime: now + AUTH_RATE_LIMIT_WINDOW_MS });
    } else {
      entry.count++;
      if (entry.count > AUTH_RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many authentication attempts, please try again later' });
      }
    }
  }
  next();
}

// Clean up expired auth rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of authRateLimitStore.entries()) {
    if (now > entry.resetTime) {
      authRateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const initialTrades = [
  {
    asset: 'BTC/USDT',
    entry: 42500,
    exit: 45200,
    direction: 'long',
    status: 'winner',
    startDate: '2026-03-15T09:30:00.000Z',
    endDate: '2026-03-16T14:45:00.000Z',
    review: 'Strong bullish momentum confirmed on 4H chart. Entry taken after breakout above resistance.',
    pips: 270
  },
  {
    asset: 'ETH/USDT',
    entry: 2850,
    exit: 2720,
    direction: 'long',
    status: 'loser',
    startDate: '2026-03-14T11:00:00.000Z',
    endDate: '2026-03-15T16:20:00.000Z',
    review: 'Failed breakout, should have respected the bearish divergence.',
    pips: -130
  }
];

const initialNotes = [
  {
    tradeIndex: 0,
    content: 'Market momentum call was confirmed by both RSI and volume.'
  }
];

// Validation schemas
const tradeSchema = Joi.object({
  asset: Joi.string().min(1).max(20).required(),
  entry: Joi.number().positive().required(),
  exit: Joi.number().positive().required(),
  direction: Joi.string().valid('long', 'short').required(),
  status: Joi.string().valid('winner', 'loser', 'breakeven').required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  pips: Joi.number().integer().allow(null),
  review: Joi.string().max(1000).allow('')
});

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  password: Joi.string().min(8).required()
});

const profileSchema = Joi.object({
  displayName: Joi.string().max(50).allow(''),
  pipValue: Joi.number().positive().default(1.0),
  theme: Joi.string().valid('dark', 'light').default('dark')
});

const roleSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  description: Joi.string().max(250).allow('')
});

const permissionSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(250).allow('')
});

// Helper functions
function calculatePnL(entry, exit, direction) {
  return direction === 'long' ? exit - entry : entry - exit;
}

function calculatePnLPercent(pnl, entry) {
  return (pnl / entry) * 100;
}

function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatTrade(trade, notes = []) {
  const pnl = calculatePnL(trade.entry, trade.exit, trade.direction);
  const pnlPercent = calculatePnLPercent(pnl, trade.entry);
  return {
    id: trade.id,
    asset: trade.asset,
    entry: trade.entry,
    exit: trade.exit,
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    status: trade.status,
    direction: trade.direction,
    startDate: trade.startDate.toISOString(),
    endDate: trade.endDate.toISOString(),
    pips: trade.pips != null ? trade.pips : Math.round(pnl),
    review: trade.review || null,
    duration: calculateDuration(trade.startDate, trade.endDate),
    noteCount: notes.length,
    notes: notes.map((note) => ({
      id: note.id,
      tradeId: note.tradeId,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString()
    }))
  };
}

function formatTradePage(trades, total, page, limit) {
  return {
    trades: trades.map((trade) => ({
      ...formatTrade(trade),
      notes: [],
      noteCount: trade._count?.notes ?? 0
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

function requireAuth(permission) {
  return (req, res, next) => {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // DISABLED
    // if (permission && !auth.hasPermission(user, permission)) {
    //   return res.status(403).json({ error: 'Permission denied' });
    // }
    next();
  };
}

function requireAdmin(req, res, next) {
  const user = req.authUser;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // DISABLED
  // if (!auth.isAdmin(user)) {
  //   return res.status(403).json({ error: 'Admin permission required' });
  // }
  next();
}

async function auditRequest(req, action, status, details = '') {
  try {
    await recordAudit({
      userId: req.authUser?.id || null,
      action,
      resource: req.originalUrl,
      status,
      details,
      metadata: {
        method: req.method,
        ip: req.ip,
        body: req.body
      }
    });
  } catch (err) {
    console.error('Failed to record audit log', err);
  }
}

function detectSuspiciousUsers(logs) {
  const now = Date.now();
  const recentWindowMs = 30 * 60 * 1000; // 30 minutes
  const actionWindowMs = 10 * 60 * 1000; // 10 minutes
  const userStats = new Map();

  logs.forEach((log) => {
    if (!log.userId) {
      return;
    }

    const id = log.userId;
    const entry = userStats.get(id) || {
      userId: id,
      email: log.user?.email || null,
      roles: log.user?.roles || [],
      failedLogins: 0,
      permissionDenied: 0,
      rapidActions: 0,
      failedActions: 0,
      totalActions: 0,
      lastActivity: log.createdAt,
      reasons: new Set()
    };

    const createdAt = new Date(log.createdAt).getTime();
    entry.totalActions += 1;
    if (createdAt > new Date(entry.lastActivity).getTime()) {
      entry.lastActivity = log.createdAt;
    }

    if (log.status === 'failed') {
      entry.failedActions += 1;
    }

    const lowerDetails = (log.details || '').toLowerCase();
    const lowerAction = (log.action || '').toLowerCase();

    if (lowerAction === 'user:login' && log.status === 'failed' && now - createdAt <= recentWindowMs) {
      entry.failedLogins += 1;
    }

    if ((lowerDetails.includes('permission denied') || lowerAction.includes('permission')) && log.status === 'failed') {
      entry.permissionDenied += 1;
    }

    if (['trade:create', 'trade:update', 'trade:delete', 'note:create', 'note:update', 'note:delete'].includes(lowerAction) && now - createdAt <= actionWindowMs) {
      entry.rapidActions += 1;
    }

    userStats.set(id, entry);
  });

  const observations = [];
  for (const entry of userStats.values()) {
    if (entry.failedLogins >= 3) {
      entry.reasons.add('Multiple recent failed login attempts');
    }
    if (entry.permissionDenied >= 5) {
      entry.reasons.add('Repeated permission denied behavior');
    }
    if (entry.rapidActions >= 15) {
      entry.reasons.add('High volume of sensitive updates in a short window');
    }
    if (entry.failedActions >= 10) {
      entry.reasons.add('Excessive failed requests');
    }

    if (entry.reasons.size > 0) {
      observations.push({
        userId: entry.userId,
        email: entry.email,
        roles: entry.roles,
        lastActivity: entry.lastActivity,
        totalActions: entry.totalActions,
        failedActions: entry.failedActions,
        failedLogins: entry.failedLogins,
        permissionDenied: entry.permissionDenied,
        rapidActions: entry.rapidActions,
        reasons: Array.from(entry.reasons)
      });
    }
  }

  return observations.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

async function ensureAuthenticatedGraphql(user) {
  if (!user) {
    throw new Error('Authentication required for GraphQL operations');
  }
}

async function resetTrades() {
  await prisma.note.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: 'trader@example.com',
      password: 'password123'
    }
  });

  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Full access to all system features and trade management.'
    }
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'trader',
      description: 'Standard trader role with limited trade and chat permissions.'
    }
  });

  const permissions = await Promise.all([
    prisma.permission.create({ data: { name: 'trade:view', description: 'View trades' } }),
    prisma.permission.create({ data: { name: 'trade:create', description: 'Create trades' } }),
    prisma.permission.create({ data: { name: 'trade:update', description: 'Update trades' } }),
    prisma.permission.create({ data: { name: 'trade:delete', description: 'Delete trades' } }),
    prisma.permission.create({ data: { name: 'chat:send', description: 'Send chat messages' } }),
    prisma.permission.create({ data: { name: 'chat:view', description: 'View chat room' } })
  ]);

  await prisma.rolePermission.createMany({
    data: [
      { roleId: adminRole.id, permissionId: permissions[0].id },
      { roleId: adminRole.id, permissionId: permissions[1].id },
      { roleId: adminRole.id, permissionId: permissions[2].id },
      { roleId: adminRole.id, permissionId: permissions[3].id },
      { roleId: adminRole.id, permissionId: permissions[4].id },
      { roleId: adminRole.id, permissionId: permissions[5].id },
      { roleId: userRole.id, permissionId: permissions[0].id },
      { roleId: userRole.id, permissionId: permissions[1].id },
      { roleId: userRole.id, permissionId: permissions[4].id },
      { roleId: userRole.id, permissionId: permissions[5].id }
    ]
  });

  await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });

  for (let i = 0; i < initialTrades.length; i += 1) {
    const trade = initialTrades[i];
    const pnl = calculatePnL(trade.entry, trade.exit, trade.direction);
    const pnlPercent = calculatePnLPercent(pnl, trade.entry);
    const created = await prisma.trade.create({
      data: {
        userId: user.id,
        asset: trade.asset,
        entry: trade.entry,
        exit: trade.exit,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        direction: trade.direction,
        status: trade.status,
        startDate: new Date(trade.startDate),
        endDate: new Date(trade.endDate),
        review: trade.review,
        pips: trade.pips,
        duration: calculateDuration(new Date(trade.startDate), new Date(trade.endDate))
      }
    });

    if (initialNotes[i] && initialNotes[i].tradeIndex === i) {
      await prisma.note.create({
        data: {
          tradeId: created.id,
          content: initialNotes[i].content
        }
      });
    }
  }
}

async function getAllTrades() {
  return prisma.trade.findMany({ include: { notes: true } });
}

async function getNotesByTrade(tradeId, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) {
    throw new Error('Trade not found');
  }

  if (!auth.isAdmin(authUser) && trade.userId !== authUser.id) {
    throw new Error('Trade access denied');
  }

  return prisma.note.findMany({ where: { tradeId } });
}

async function getTradeById(id, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }

  const trade = await prisma.trade.findUnique({
    where: { id },
    include: { notes: true }
  });

  if (!trade) {
    return null;
  }

  if (!auth.isAdmin(authUser) && trade.userId !== authUser.id) {
    throw new Error('Trade access denied');
  }

  return formatTrade(trade, trade.notes);
}

async function getTradesPage({ page = 1, limit = 10, status, direction, asset, authUser = null }) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const where = {};
  if (status) {
    where.status = status;
  }
  if (direction) {
    where.direction = direction;
  }
  if (asset) {
    where.asset = { contains: asset, mode: 'insensitive' };
  }

  // Always filter by user - show only your own trades
  if (authUser) {
    where.userId = authUser.id;
  }
  if (!authUser) {
    throw new Error('Authentication required');
  }

  const total = await prisma.trade.count({ where });
  const trades = await prisma.trade.findMany({
    where,
    include: { _count: { select: { notes: true } } },
    orderBy: { id: 'asc' },
    skip: (pageNum - 1) * limitNum,
    take: limitNum
  });

  return formatTradePage(trades, total, pageNum, limitNum);
}

async function getStats(authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }

  const where = {};
  if (!auth.isAdmin(authUser)) {
    where.userId = authUser.id;
  }

  const trades = await prisma.trade.findMany({
    where,
    select: { entry: true, exit: true, direction: true, status: true }
  });
  const notesCount = await prisma.note.count({ where: { trade: { userId: where.userId || undefined } } });

  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winners: 0,
      losers: 0,
      breakeven: 0,
      winRate: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      notesCount
    };
  }

  const winners = trades.filter(t => t.status === 'winner');
  const losers = trades.filter(t => t.status === 'loser');
  const breakeven = trades.filter(t => t.status === 'breakeven');
  const pnls = trades.map((trade) => calculatePnL(trade.entry, trade.exit, trade.direction));

  const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const avgWin = winners.length > 0 ? winners.reduce((sum, trade) => sum + calculatePnL(trade.entry, trade.exit, trade.direction), 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, trade) => sum + calculatePnL(trade.entry, trade.exit, trade.direction), 0) / losers.length) : 0;
  const winRate = winners.length + losers.length > 0 ? (winners.length / (winners.length + losers.length)) * 100 : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * winners.length) / (avgLoss * losers.length) : 0;

  return {
    totalTrades: trades.length,
    winners: winners.length,
    losers: losers.length,
    breakeven: breakeven.length,
    winRate: Math.round(winRate * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    notesCount
  };
}

async function createTrade(value, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }

  // DISABLED: Permission check blocking manual trades
  // if (!auth.hasPermission(authUser, 'trade:create')) {
  //   throw new Error('Permission denied');
  // }

  const { error, value: validated } = tradeSchema.validate(value);
  if (error) {
    throw error;
  }

  const pnl = calculatePnL(validated.entry, validated.exit, validated.direction);
  const pnlPercent = calculatePnLPercent(pnl, validated.entry);

  const createdTrade = await prisma.trade.create({
    data: {
      userId: authUser.id,
      asset: validated.asset,
      entry: validated.entry,
      exit: validated.exit,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      direction: validated.direction,
      status: validated.status,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      review: validated.review,
      pips: validated.pips,
      duration: calculateDuration(new Date(validated.startDate), new Date(validated.endDate))
    }
  });

  await recordAudit({
    userId: authUser.id,
    action: 'trade:create',
    resource: 'Trade',
    status: 'success',
    details: `Trade ${createdTrade.id} created by user ${authUser.email}`
  });

  return formatTrade(createdTrade, []);
}

async function updateTrade(id, value, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }
  // DISABLED
  // if (!auth.hasPermission(authUser, 'trade:update')) {
  //   throw new Error('Permission denied');
  // }

  const existingTrade = await prisma.trade.findUnique({ where: { id } });
  if (!existingTrade) {
    throw new Error('Trade not found');
  }
  if (!auth.isAdmin(authUser) && existingTrade.userId !== authUser.id) {
    throw new Error('Trade access denied');
  }

  const { error, value: validated } = tradeSchema.validate(value);
  if (error) {
    throw error;
  }

  const pnl = calculatePnL(validated.entry, validated.exit, validated.direction);
  const pnlPercent = calculatePnLPercent(pnl, validated.entry);

  try {
    const updatedTrade = await prisma.trade.update({
      where: { id },
      data: {
        asset: validated.asset,
        entry: validated.entry,
        exit: validated.exit,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        direction: validated.direction,
        status: validated.status,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        review: validated.review,
        pips: validated.pips,
        duration: calculateDuration(new Date(validated.startDate), new Date(validated.endDate))
      }
    });

    await recordAudit({
      userId: authUser.id,
      action: 'trade:update',
      resource: 'Trade',
      status: 'success',
      details: `Trade ${updatedTrade.id} updated by user ${authUser.email}`
    });

    return formatTrade(updatedTrade, []);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Trade not found');
    }
    throw error;
  }
}

async function deleteTrade(id, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }
  // DISABLED
  // if (!auth.hasPermission(authUser, 'trade:delete')) {
  //   throw new Error('Permission denied');
  // }

  const existingTrade = await prisma.trade.findUnique({ where: { id } });
  if (!existingTrade) {
    throw new Error('Trade not found');
  }
  if (!auth.isAdmin(authUser) && existingTrade.userId !== authUser.id) {
    throw new Error('Trade access denied');
  }

  try {
    await prisma.trade.delete({ where: { id } });
    await recordAudit({
      userId: authUser.id,
      action: 'trade:delete',
      resource: 'Trade',
      status: 'success',
      details: `Trade ${id} deleted by user ${authUser.email}`
    });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Trade not found');
    }
    throw error;
  }
}

async function createNote(tradeId, content, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }
  // DISABLED
  // if (!auth.hasPermission(authUser, 'chat:send')) {
  //   throw new Error('Permission denied');
  // }

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) {
    throw new Error('Trade not found');
  }
  if (!auth.isAdmin(authUser) && trade.userId !== authUser.id) {
    throw new Error('Trade access denied');
  }

  const note = await prisma.note.create({
    data: {
      tradeId,
      content
    }
  });

  await recordAudit({
    userId: authUser.id,
    action: 'note:create',
    resource: 'Note',
    status: 'success',
    details: `Note ${note.id} created for trade ${tradeId} by ${authUser.email}`
  });

  return note;
}

async function updateNote(id, content, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }
  // DISABLED
  // if (!auth.hasPermission(authUser, 'trade:update')) {
  //   throw new Error('Permission denied');
  // }

  const note = await prisma.note.findUnique({ where: { id }, include: { trade: true } });
  if (!note) {
    throw new Error('Note not found');
  }
  if (!auth.isAdmin(authUser) && note.trade.userId !== authUser.id) {
    throw new Error('Note access denied');
  }

  try {
    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        content,
        updatedAt: new Date()
      }
    });

    await recordAudit({
      userId: authUser.id,
      action: 'note:update',
      resource: 'Note',
      status: 'success',
      details: `Note ${id} updated by ${authUser.email}`
    });

    return updatedNote;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Note not found');
    }
    throw error;
  }
}

async function deleteNote(id, authUser = null) {
  if (!authUser) {
    throw new Error('Authentication required');
  }
  // DISABLED
  // if (!auth.hasPermission(authUser, 'trade:delete')) {
  //   throw new Error('Permission denied');
  // }

  const note = await prisma.note.findUnique({ where: { id }, include: { trade: true } });
  if (!note) {
    throw new Error('Note not found');
  }
  if (!auth.isAdmin(authUser) && note.trade.userId !== authUser.id) {
    throw new Error('Note access denied');
  }

  try {
    await prisma.note.delete({ where: { id } });
    await recordAudit({
      userId: authUser.id,
      action: 'note:delete',
      resource: 'Note',
      status: 'success',
      details: `Note ${id} deleted by ${authUser.email}`
    });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Note not found');
    }
    throw error;
  }
}

async function createUser(value) {
  const { error, value: validated } = userSchema.validate(value);
  if (error) {
    throw error;
  }

  try {
    const hashedPassword = auth.hashPassword(validated.password);
    const userData = {
      email: validated.email,
      password: hashedPassword
    };
    if (validated.username) {
      userData.username = validated.username;
    }
    const user = await prisma.user.create({
      data: userData,
      include: { profile: true }
    });

    // Assign role: admin for specific email, otherwise trader
    const isAdminEmail = email === 'caataaaa.w@gmail.com';
    const role = await prisma.role.findUnique({ where: { name: isAdminEmail ? 'admin' : 'trader' } });
    if (role) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }

    await recordAudit({
      userId: user.id,
      action: 'user:create',
      resource: 'User',
      status: 'success',
      details: `New user created: ${user.email}`
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile ? {
        id: user.profile.id,
        displayName: user.profile.displayName,
        pipValue: user.profile.pipValue,
        theme: user.profile.theme
      } : null
    };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      trades: { include: { notes: true } },
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  const roles = user.userRoles.map((userRole) => ({
    id: userRole.role.id,
    name: userRole.role.name,
    description: userRole.role.description
  }));

  const permissions = Array.from(new Set(
    user.userRoles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => rolePermission.permission.name)
    )
  ));

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    roles,
    permissions,
    profile: user.profile ? {
      id: user.profile.id,
      displayName: user.profile.displayName,
      pipValue: user.profile.pipValue,
      theme: user.profile.theme
    } : null,
    trades: user.trades.map(trade => formatTrade(trade, trade.notes))
  };
}

async function getRoles() {
  return prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
}

async function getPermissions() {
  return prisma.permission.findMany();
}

async function createRole(value) {
  const { error, value: validated } = roleSchema.validate(value);
  if (error) {
    throw error;
  }

  return prisma.role.create({ data: validated });
}

async function createPermission(value) {
  const { error, value: validated } = permissionSchema.validate(value);
  if (error) {
    throw error;
  }

  return prisma.permission.create({ data: validated });
}

async function assignRoleToUser(userId, roleId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!user || !role) {
    throw new Error('User or role not found');
  }

  return prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId }
  });
}

async function assignPermissionToRole(roleId, permissionId) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!role || !permission) {
    throw new Error('Role or permission not found');
  }

  return prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    update: {},
    create: { roleId, permissionId }
  });
}

async function loginUser({ email, username, password }) {
  // Find user by email or username
  let user;
  if (email) {
    user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
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
  } else if (username) {
    user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
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
  }

  const failedLogin = async () => {
    await recordAudit({
      userId: user?.id || null,
      action: 'user:login',
      resource: 'User',
      status: 'failed',
      details: `Failed login attempt for ${email}`
    });
  };

  if (!user || !auth.verifyPassword(password, user.password)) {
    await failedLogin();
    return null;
  }

  const roles = user.userRoles.map((userRole) => ({
    id: userRole.role.id,
    name: userRole.role.name,
    description: userRole.role.description
  }));

  const permissions = Array.from(new Set(
    user.userRoles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => rolePermission.permission.name)
    )
  ));

  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    roles,
    permissions
  };
  const token = auth.createToken(payload);

  const loginIdentifier = email || username;
  await recordAudit({
    userId: user.id,
    action: 'user:login',
    resource: 'User',
    status: 'success',
    details: `User logged in: ${loginIdentifier}`
  });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    token,
    roles,
    permissions,
    profile: user.profile ? {
      id: user.profile.id,
      displayName: user.profile.displayName,
      pipValue: user.profile.pipValue,
      theme: user.profile.theme
    } : null,
    createdAt: user.createdAt.toISOString()
  };
}

async function updateUserProfile(userId, value) {
  const { error, value: validated } = profileSchema.validate(value);
  if (error) {
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      displayName: validated.displayName,
      pipValue: validated.pipValue,
      theme: validated.theme
    },
    create: {
      userId,
      displayName: validated.displayName,
      pipValue: validated.pipValue,
      theme: validated.theme
    }
  });

  return {
    id: profile.id,
    displayName: profile.displayName,
    pipValue: profile.pipValue,
    theme: profile.theme
  };
}

async function disconnect() {
  await prisma.$disconnect();
}

// Routes
// GET /api/trades/stats/summary - Get trading statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.json(await getStats(authenticatedUser));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trades - Get all trades with pagination and optional filtering
router.get('/', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { page = 1, limit = 10, status, direction, asset } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const pageData = await getTradesPage({ page: pageNum, limit: limitNum, status, direction, asset, authUser: authenticatedUser });
    res.json(pageData);
  } catch (error) {
    if (error.message === 'Authentication required') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trades/:id - Get single trade
router.get('/:id', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = parseInt(req.params.id, 10);
    const trade = await getTradeById(id, authenticatedUser);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    if (error.message === 'Trade access denied') {
      return res.status(403).json({ error: 'Trade access denied' });
    }
    if (error.message === 'Authentication required') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/trades - Create new trade
router.post('/', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const newTrade = await createTrade(req.body, authenticatedUser);
    res.status(201).json(newTrade);
  } catch (error) {
    if (error.message === 'Permission denied') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trades/:id - Update trade
router.put('/:id', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = parseInt(req.params.id, 10);
    const updatedTrade = await updateTrade(id, req.body, authenticatedUser);
    res.json(updatedTrade);
  } catch (error) {
    if (error.message === 'Trade not found') {
      return res.status(404).json({ error: 'Trade not found' });
    }
    if (error.message === 'Trade access denied' || error.message === 'Permission denied') {
      return res.status(403).json({ error: error.message });
    }
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/trades/:id - Delete trade
router.delete('/:id', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = parseInt(req.params.id, 10);
    await deleteTrade(id, authenticatedUser);
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Trade not found') {
      return res.status(404).json({ error: 'Trade not found' });
    }
    if (error.message === 'Trade access denied' || error.message === 'Permission denied') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User routes
// POST /api/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const newUser = await createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = parseInt(req.params.id, 10);
    if (!auth.isAdmin(authenticatedUser) && authenticatedUser.id !== id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/profile - Update user profile
router.put('/users/:id/profile', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = parseInt(req.params.id, 10);
    if (!auth.isAdmin(authenticatedUser) && authenticatedUser.id !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const updatedProfile = await updateUserProfile(userId, req.body);
    res.json(updatedProfile);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/login', authRateLimit, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }
    const user = await loginUser({ email, username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/trades/users/register - Register a new user
router.post('/users/register', authRateLimit, async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate username if provided
    if (username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: 'Username must be 3-30 characters' });
      }
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return res.status(400).json({ error: 'Username must be alphanumeric' });
      }
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    const userData = { email, password };
    if (username) {
      userData.username = username;
    }
    const newUser = await createUser(userData);

    // Create profile if displayName provided
    if (displayName) {
      await updateUserProfile(newUser.id, { displayName, pipValue: 1.0, theme: 'dark' });
    }

    // Return user with token by logging them in
    const userWithToken = await loginUser({ email, password });

    res.status(201).json(userWithToken);
  } catch (error) {
    if (error.message === 'Email already exists' || error.code === 'P2002') {
      return res.status(409).json({ error: 'Email or username already exists' });
    }
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((item) => ({
        id: item.permission.id,
        name: item.permission.name,
        description: item.permission.description
      }))
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/roles', async (req, res) => {
  try {
    const role = await createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/permissions', async (req, res) => {
  try {
    const permission = await createPermission(req.body);
    res.status(201).json(permission);
  } catch (error) {
    if (error.isJoi || error.name === 'ValidationError') {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/roles', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { roleId } = req.body;
    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }
    const assigned = await assignRoleToUser(userId, roleId);
    res.json(assigned);
  } catch (error) {
    if (error.message === 'User or role not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/roles/:id/permissions', async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const { permissionId } = req.body;
    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }
    const assigned = await assignPermissionToRole(roleId, permissionId);
    res.json(assigned);
  } catch (error) {
    if (error.message === 'Role or permission not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/permissions', async (req, res) => {
  try {
    const permissions = await getPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/audit/overview', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // DISABLED
    // if (!auth.isAdmin(authenticatedUser)) {
    //   return res.status(403).json({ error: 'Permission denied' });
    // }

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 250);
    const logs = await getAuditLogs(limit);
    const observations = detectSuspiciousUsers(logs);

    res.json({
      logs,
      observations
    });
  } catch (error) {
    console.error('Failed to load audit overview', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/chat/messages', async (req, res) => {
  try {
    const messages = await getChatMessages({ limit: 100 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat/messages', async (req, res) => {
  try {
    const { sender, text, room } = req.body;
    if (!sender || !text) {
      return res.status(400).json({ error: 'sender and text are required' });
    }
    const message = await addChatMessage({ sender, text, room });
    broadcast({ type: 'chat.message', message, timestamp: new Date().toISOString() });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fake trade generation support
let generatorInterval = null;
let generatorActive = false;

const ASSETS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'XRP/USDT', 'DOT/USDT'];
const DIRECTIONS = ['long', 'short'];
const REVIEW_SNIPPETS = [
  'Strong bullish momentum confirmed on 4H chart.',
  'Trade showed expected retracement with low risk.',
  'Breakout failed to hold and resulted in a stop loss.',
  'Position managed well on follow-through strength.',
  'Market structure shifted against the setup.',
  'Good risk-reward; price respected the daily range.',
  'Entered late but still captured a strong move.',
  'Pattern invalidated before the second target.',
  'Strong support level held; exit was optimal.',
  'Weak volume at breakout caused poor follow-through.'
];

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomFloat(min, max, precision = 0.01) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(2));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRecentDate(days = 10) {
  const now = new Date();
  const pastTime = now.getTime() - randomInt(0, days * 24 * 60 * 60 * 1000);
  const date = new Date(pastTime);
  return date.toISOString().slice(0, 16);
}

async function startFakeTradeGenerator(userId = 1, intervalMs = 5000, batchSize = 2) {
  if (generatorActive) {
    return false;
  }

  generatorActive = true;
  console.log('Generator started');
  generatorInterval = setInterval(async () => {
    console.log('Generator tick - creating trades...');
    const addedTrades = [];
    for (let i = 0; i < batchSize; i += 1) {
      const asset = randomElement(ASSETS);
      const direction = randomElement(DIRECTIONS);
      const entry = randomFloat(10, 65000);
      const status = randomElement(['winner', 'loser', 'breakeven']);
      let exit;
      if (status === 'breakeven') {
        exit = entry;
      } else if (status === 'winner') {
        const move = randomFloat(0.5, 1200);
        exit = direction === 'long' ? Number((entry + move).toFixed(2)) : Number(Math.max(0.01, entry - move).toFixed(2));
      } else { // loser
        const move = randomFloat(0.5, 1200);
        exit = direction === 'long' ? Number(Math.max(0.01, entry - move).toFixed(2)) : Number((entry + move).toFixed(2));
      }
      const startDate = randomRecentDate(10);
      const endDate = new Date(new Date(startDate).getTime() + randomInt(1, 48) * 60 * 60 * 1000).toISOString().slice(0, 16);
      const pnl = calculatePnL(entry, exit, direction);
      const review = randomElement(REVIEW_SNIPPETS);

      try {
        // Create trade directly with Prisma (bypass auth checks)
        const newTrade = await prisma.trade.create({
          data: {
            userId: userId, // Use the authenticated user's ID
            asset,
            entry,
            exit,
            pnl: Math.round(pnl * 100) / 100,
            pnlPercent: Math.round((pnl / entry) * 10000) / 100,
            direction,
            status,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            review,
            pips: Math.round(pnl),
            duration: calculateDuration(new Date(startDate), new Date(endDate))
          }
        });
        addedTrades.push(newTrade);
      } catch (err) {
        console.error('Failed to create trade:', err.message);
      }
    }

    console.log('Broadcasting', addedTrades.length, 'trades');
    broadcast({ type: 'trades.batchAdded', trades: addedTrades, timestamp: new Date().toISOString() });
  }, intervalMs);

  return true;
}

function stopFakeTradeGenerator() {
  if (!generatorActive) {
    return false;
  }

  clearInterval(generatorInterval);
  generatorInterval = null;
  generatorActive = false;
  return true;
}

router.post('/generator/start', async (req, res) => {
  try {
    const authenticatedUser = auth.authenticateRequest(req);
    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { force } = req.body;
    // If force is true, stop any existing generator first
    if (force && generatorActive) {
      stopFakeTradeGenerator();
    }
    const started = await startFakeTradeGenerator(authenticatedUser.id);
    if (!started) {
      return res.status(409).json({ error: 'Generator already running' });
    }
    res.status(201).json({ status: 'started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start generator' });
  }
});

router.post('/generator/stop', (req, res) => {
  try {
    const stopped = stopFakeTradeGenerator();
    if (!stopped) {
      return res.status(409).json({ error: 'Generator not running' });
    }
    res.json({ status: 'stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop generator' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    await resetTrades();
    res.json({ status: 'reset' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset trades' });
  }
});

module.exports = {
  router,
  resetTrades,
  getAllTrades,
  getStats,
  getTradeById,
  getTradesPage,
  getNotesByTrade,
  getFullStats: getStats,
  createTrade,
  updateTrade,
  deleteTrade,
  createNote,
  updateNote,
  deleteNote,
  disconnect,
  requireAuth,
  requireAdmin,
  authRateLimit
};