const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const auth = require('./lib/enhancedAuth');
const tradeRoutes = require('./routes/trades');
const authRoutes = require('./routes/auth');
const { authRateLimit } = tradeRoutes;

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Security middleware configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: USE_HTTPS ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  referrerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
};

// Rate limiting store (in-memory, consider Redis for production)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
// Development: much higher limits since Vite proxy makes all requests from same IP
const RATE_LIMIT_MAX_REQUESTS_AUTH = NODE_ENV === 'development' ? 10000 : 1000;
const RATE_LIMIT_MAX_REQUESTS_UNAUTH = NODE_ENV === 'development' ? 1000 : 100;

// Clear any stale entries on startup
rateLimitStore.clear();

async function rateLimit(req, res, next) {
  // Skip rate limiting for WebSocket upgrades, health checks, and GraphQL in development
  if (req.headers.upgrade === 'websocket' ||
      req.path === '/health' ||
      req.path === '/api/trades/health' ||
      (NODE_ENV === 'development' && req.path === '/graphql')) {
    return next();
  }

  // Check if user is authenticated - give them higher rate limit
  const authData = await auth.authenticateRequest(req);
  const isAuthenticated = !!authData;

  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS, authenticated: isAuthenticated });
  } else {
    const entry = rateLimitStore.get(key);
    if (now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS, authenticated: isAuthenticated });
    } else {
      entry.count++;
      const limit = entry.authenticated ? RATE_LIMIT_MAX_REQUESTS_AUTH : RATE_LIMIT_MAX_REQUESTS_UNAUTH;
      if (entry.count > limit) {
        console.log(`Rate limit exceeded for ${key}: ${entry.count} requests`);
        return res.status(429).json({ error: 'Too many requests, please try again later' });
      }
    }
  }
  next();
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Middleware
app.use(helmet(helmetConfig));
const allowedOrigins = process.env.ALLOWED_ORIGINS;
const corsOrigin = allowedOrigins === '*' ? true : (allowedOrigins ? allowedOrigins.split(',') : true);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit);

// HTTPS enforcement middleware
function enforceHTTPS(req, res, next) {
  if (USE_HTTPS && !req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}

if (USE_HTTPS) {
  app.use(enforceHTTPS);
}

const schema = buildSchema(`
  type Query {
    health: Health!
    trades(page: Int = 1, limit: Int = 10, status: String, direction: String, asset: String): TradePage
    trade(id: ID!): Trade
    stats: Stats
    notesByTrade(tradeId: ID!): [Note!]!
    me: User
    sessions: [Session!]!
    twoFactorStatus: TwoFactorStatus!
  }

  type Mutation {
    createTrade(input: TradeInput!): Trade!
    updateTrade(id: ID!, input: TradeInput!): Trade!
    deleteTrade(id: ID!): Boolean!
    createNote(tradeId: ID!, content: String!): Note!
    updateNote(id: ID!, content: String!): Note!
    deleteNote(id: ID!): Boolean!
    logout(allSessions: Boolean): Boolean!
  }

  type TradePage {
    trades: [Trade!]!
    pagination: Pagination!
  }

  type Pagination {
    page: Int!
    limit: Int!
    total: Int!
    pages: Int!
  }

  type Trade {
    id: ID!
    asset: String!
    entry: Float!
    exit: Float!
    pnl: Float!
    pnlPercent: Float!
    status: String!
    direction: String!
    startDate: String!
    endDate: String!
    pips: Int
    review: String
    duration: String!
    noteCount: Int!
    notes: [Note!]!
  }

  type Note {
    id: ID!
    tradeId: ID!
    content: String!
    createdAt: String!
    updatedAt: String!
  }

  type Stats {
    totalTrades: Int!
    winners: Int!
    losers: Int!
    breakeven: Int!
    winRate: Float!
    totalPnL: Float!
    avgWin: Float!
    avgLoss: Float!
    profitFactor: Float!
    notesCount: Int!
  }

  type Health {
    status: String!
    timestamp: String!
  }

  type User {
    id: ID!
    email: String!
    username: String
    emailVerified: Boolean!
    roles: [Role!]!
    permissions: [String!]!
    createdAt: String!
  }

  type Role {
    id: ID!
    name: String!
    description: String
  }

  type Session {
    id: ID!
    ipAddress: String
    userAgent: String
    lastActivity: String!
    expiresAt: String!
    isCurrent: Boolean!
  }

  type TwoFactorStatus {
    isEnabled: Boolean!
    method: String
    verifiedAt: String
  }

  input TradeInput {
    asset: String!
    entry: Float!
    exit: Float!
    direction: String!
    status: String!
    startDate: String!
    endDate: String!
    pips: Int
    review: String
  }
`);

async function buildGraphqlRoot(req) {
  const authData = await auth.authenticateRequest(req);
  const authenticatedUser = authData?.user || null;

  // Wrapper to catch errors and provide better error messages
  const wrapResolver = (fn, requiresAuth = true, defaultValue = null) => async (...args) => {
    // Check auth first if required
    if (requiresAuth && !authenticatedUser) {
      if (defaultValue !== null) return defaultValue;
      throw new Error('Authentication required');
    }

    try {
      return await fn(...args);
    } catch (error) {
      // Log server-side errors but don't leak internal details to client
      if (error.message !== 'Authentication required') {
        console.error('GraphQL resolver error:', error);
      }
      if (defaultValue !== null) return defaultValue;
      throw new Error(error.message || 'Internal server error');
    }
  };

  return {
    health: () => ({ status: 'ok', timestamp: new Date().toISOString() }),
    trades: wrapResolver(({ page, limit, status, direction, asset }) => tradeRoutes.getTradesPage({ page, limit, status, direction, asset, authUser: authenticatedUser }), true, { trades: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }),
    trade: wrapResolver(({ id }) => tradeRoutes.getTradeById(parseInt(id, 10), authenticatedUser), true),
    stats: wrapResolver(() => tradeRoutes.getFullStats(authenticatedUser), true, {
      totalTrades: 0, winners: 0, losers: 0, breakeven: 0,
      winRate: 0, totalPnL: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, notesCount: 0
    }),
    notesByTrade: wrapResolver(({ tradeId }) => tradeRoutes.getNotesByTrade(parseInt(tradeId, 10), authenticatedUser), true),
    createTrade: wrapResolver(({ input }) => tradeRoutes.createTrade(input, authenticatedUser), true),
    updateTrade: wrapResolver(({ id, input }) => tradeRoutes.updateTrade(parseInt(id, 10), input, authenticatedUser), true),
    deleteTrade: wrapResolver(({ id }) => tradeRoutes.deleteTrade(parseInt(id, 10), authenticatedUser), true),
    createNote: wrapResolver(({ tradeId, content }) => tradeRoutes.createNote(parseInt(tradeId, 10), content, authenticatedUser), true),
    updateNote: wrapResolver(({ id, content }) => tradeRoutes.updateNote(parseInt(id, 10), content, authenticatedUser), true),
    deleteNote: wrapResolver(({ id }) => tradeRoutes.deleteNote(parseInt(id, 10), authenticatedUser), true),
    me: wrapResolver(() => authenticatedUser, true),
    sessions: wrapResolver(async () => {
      const sessions = await auth.getActiveSessions(authenticatedUser.id);
      const currentSessionHeader = req.headers['x-session-token'];
      const currentSessionId = currentSessionHeader?.split('.')[0];
      return sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActivity: s.lastActivity.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.id === currentSessionId
      }));
    }, true),
    twoFactorStatus: wrapResolver(async () => {
      const status = await auth.get2FAStatus(authenticatedUser.id);
      return {
        isEnabled: status.isEnabled,
        method: status.method,
        verifiedAt: status.verifiedAt?.toISOString() || null
      };
    }, true),
    logout: wrapResolver(async ({ allSessions }) => {
      if (allSessions) {
        await auth.invalidateAllUserSessions(authenticatedUser.id);
        await auth.revokeAllUserRefreshTokens(authenticatedUser.id);
      }
      return true;
    }, true)
  };
}

app.use('/graphql', graphqlHTTP((req) => ({ schema, rootValue: buildGraphqlRoot(req), graphiql: true })));

// Development-only: rate limit management endpoints
if (NODE_ENV === 'development') {
  app.get('/api/debug/rate-limit-status', (req, res) => {
    const entries = Array.from(rateLimitStore.entries()).map(([key, value]) => ({
      ip: key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
      authenticated: value.authenticated
    }));
    res.json({
      storeSize: rateLimitStore.size,
      limits: {
        auth: RATE_LIMIT_MAX_REQUESTS_AUTH,
        unauth: RATE_LIMIT_MAX_REQUESTS_UNAUTH
      },
      entries
    });
  });

  app.post('/api/debug/clear-rate-limits', (req, res) => {
    rateLimitStore.clear();
    res.json({ message: 'Rate limits cleared' });
  });
}

// Routes
console.log('Loading auth routes...');
app.use('/api/auth', authRoutes);
console.log('Auth routes loaded at /api/auth');

app.use('/api/trades', tradeRoutes.router);
console.log('Trade routes loaded at /api/trades');

// Debug: List all registered routes
if (process.env.NODE_ENV !== 'production') {
  console.log('Registered routes:');
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      console.log(`  ${Object.keys(r.route.methods)} ${r.route.path}`);
    } else if (r.name === 'router') {
      console.log(`  Router mounted at: ${r.regexp}`);
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
