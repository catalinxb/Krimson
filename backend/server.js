const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { WebSocketServer } = require('ws');
const { setBroadcaster } = require('./lib/websocket');
const tradeRoutes = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const schema = buildSchema(`
  type Query {
    health: Health!
    trades(page: Int = 1, limit: Int = 10, status: String, direction: String, asset: String): TradePage!
    trade(id: ID!): Trade
    stats: Stats!
    notesByTrade(tradeId: ID!): [Note!]!
  }

  type Mutation {
    createTrade(input: TradeInput!): Trade!
    updateTrade(id: ID!, input: TradeInput!): Trade!
    deleteTrade(id: ID!): Boolean!
    createNote(tradeId: ID!, content: String!): Note!
    updateNote(id: ID!, content: String!): Note!
    deleteNote(id: ID!): Boolean!
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

const rootValue = {
  health: () => ({ status: 'ok', timestamp: new Date().toISOString() }),
  trades: ({ page, limit, status, direction, asset }) => tradeRoutes.getTradesPage({ page, limit, status, direction, asset }),
  trade: ({ id }) => tradeRoutes.getTradeById(parseInt(id, 10)),
  stats: () => tradeRoutes.getFullStats(),
  notesByTrade: ({ tradeId }) => tradeRoutes.getNotesByTrade(parseInt(tradeId, 10)),
  createTrade: ({ input }) => tradeRoutes.createTrade(input),
  updateTrade: ({ id, input }) => tradeRoutes.updateTrade(parseInt(id, 10), input),
  deleteTrade: ({ id }) => tradeRoutes.deleteTrade(parseInt(id, 10)),
  createNote: ({ tradeId, content }) => tradeRoutes.createNote(parseInt(tradeId, 10), content),
  updateNote: ({ id, content }) => tradeRoutes.updateNote(parseInt(id, 10), content),
  deleteNote: ({ id }) => tradeRoutes.deleteNote(parseInt(id, 10))
};

app.use('/graphql', graphqlHTTP({ schema, rootValue, graphiql: true }));

// Routes
app.use('/api/trades', tradeRoutes.router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    console.log('WebSocket client connected');
    socket.send(JSON.stringify({ type: 'connection', message: 'Connected to trade generator updates' }));

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  setBroadcaster((data) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  });
}

module.exports = app;
