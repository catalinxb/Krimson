const express = require('express');
const Joi = require('joi');
const { broadcast } = require('../lib/websocket');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const initialTrades = [
  {
    id: 1,
    asset: 'BTC/USDT',
    entry: 42500,
    exit: 45200,
    pnl: 2700,
    pnlPercent: 6.35,
    status: 'winner',
    direction: 'long',
    startDate: '2026-03-15T09:30',
    endDate: '2026-03-16T14:45',
    pips: 270,
    review: 'Strong bullish momentum confirmed on 4H chart. Entry taken after breakout above resistance.',
    duration: '10h 30m'
  },
  {
    id: 2,
    asset: 'ETH/USDT',
    entry: 2850,
    exit: 2720,
    pnl: -130,
    pnlPercent: -4.56,
    status: 'loser',
    direction: 'long',
    startDate: '2026-03-14T11:00',
    endDate: '2026-03-15T16:20',
    pips: -130,
    review: 'Failed breakout, should have respected the bearish divergence.',
    duration: '5h 20m'
  }
];

let trades = [...initialTrades];

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

function generateId() {
  return Math.max(...trades.map(t => t.id), 0) + 1;
}

function createTrade(value, existingDuration = null) {
  const pnl = calculatePnL(value.entry, value.exit, value.direction);
  const pnlPercent = calculatePnLPercent(pnl, value.entry);
  const duration = existingDuration || calculateDuration(value.startDate, value.endDate);

  return {
    id: generateId(),
    ...value,
    pnl,
    pnlPercent,
    duration,
    pips: value.pips != null ? value.pips : Math.round(pnl)
  };
}

function updateTrade(id, value) {
  const tradeIndex = trades.findIndex(t => t.id === id);
  if (tradeIndex === -1) {
    throw new Error('Trade not found');
  }

  const { error, value: validated } = tradeSchema.validate(value);
  if (error) {
    throw error;
  }

  const pnl = calculatePnL(validated.entry, validated.exit, validated.direction);
  const pnlPercent = calculatePnLPercent(pnl, validated.entry);
  const duration = trades[tradeIndex].duration || calculateDuration(validated.startDate, validated.endDate);

  const updatedTrade = {
    id,
    ...validated,
    pnl,
    pnlPercent,
    duration,
    pips: validated.pips != null ? validated.pips : Math.round(pnl)
  };

  trades[tradeIndex] = updatedTrade;
  return updatedTrade;
}

function deleteTrade(id) {
  const tradeIndex = trades.findIndex(t => t.id === id);
  if (tradeIndex === -1) {
    throw new Error('Trade not found');
  }

  trades.splice(tradeIndex, 1);
  return true;
}

function resetTrades() {
  trades = [...initialTrades];
}

const initialNotes = [
  {
    id: 1,
    tradeId: 1,
    content: 'Market momentum call was confirmed by both RSI and volume.',
    createdAt: '2026-03-16T15:00:00.000Z',
    updatedAt: '2026-03-16T15:00:00.000Z'
  }
];

let notes = [...initialNotes];

function getAllTrades() {
  return trades;
}

function getNotesByTrade(tradeId) {
  return notes.filter((note) => note.tradeId === tradeId);
}

function getTradeById(id) {
  const trade = trades.find((t) => t.id === id);
  if (!trade) return null;
  return {
    ...trade,
    notes: getNotesByTrade(id),
    noteCount: getNotesByTrade(id).length
  };
}

function getTradesPage({ page = 1, limit = 10, status, direction, asset }) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  let filteredTrades = [...trades];
  if (status) {
    filteredTrades = filteredTrades.filter((t) => t.status === status);
  }
  if (direction) {
    filteredTrades = filteredTrades.filter((t) => t.direction === direction);
  }
  if (asset) {
    filteredTrades = filteredTrades.filter((t) => t.asset.toLowerCase().includes(asset.toLowerCase()));
  }

  const total = filteredTrades.length;
  const pages = Math.ceil(total / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const pageTrades = filteredTrades.slice(startIndex, startIndex + limitNum).map((trade) => ({
    ...trade,
    noteCount: getNotesByTrade(trade.id).length,
    notes: []
  }));

  return {
    trades: pageTrades,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages
    }
  };
}

function getFullStats() {
  const stats = getStats();
  return {
    ...stats,
    notesCount: notes.length
  };
}

function createNote(tradeId, content) {
  const trade = trades.find((t) => t.id === tradeId);
  if (!trade) {
    throw new Error('Trade not found');
  }

  const noteId = notes.length > 0 ? Math.max(...notes.map((note) => note.id)) + 1 : 1;
  const createdAt = new Date().toISOString();
  const note = { id: noteId, tradeId, content, createdAt, updatedAt: createdAt };
  notes.push(note);
  return note;
}

function updateNote(id, content) {
  const noteIndex = notes.findIndex((n) => n.id === id);
  if (noteIndex === -1) {
    throw new Error('Note not found');
  }
  notes[noteIndex] = {
    ...notes[noteIndex],
    content,
    updatedAt: new Date().toISOString()
  };
  return notes[noteIndex];
}

function deleteNote(id) {
  const noteIndex = notes.findIndex((n) => n.id === id);
  if (noteIndex === -1) {
    throw new Error('Note not found');
  }
  notes.splice(noteIndex, 1);
  return true;
}

function getStats() {
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
      profitFactor: 0
    };
  }

  const winners = trades.filter(t => t.status === 'winner');
  const losers = trades.filter(t => t.status === 'loser');
  const breakeven = trades.filter(t => t.status === 'breakeven');

  const winRate = (winners.length / (winners.length + losers.length)) * 100;
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0) / losers.length) : 0;
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
    profitFactor: Math.round(profitFactor * 100) / 100
  };
}

// Routes

// GET /api/trades/stats/summary - Get trading statistics
router.get('/stats/summary', (req, res) => {
  try {
    res.json(getStats());
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trades - Get all trades with pagination and optional filtering
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 10, status, direction, asset } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    let filteredTrades = [...trades];

    if (status) {
      filteredTrades = filteredTrades.filter(t => t.status === status);
    }
    if (direction) {
      filteredTrades = filteredTrades.filter(t => t.direction === direction);
    }
    if (asset) {
      filteredTrades = filteredTrades.filter(t => t.asset.toLowerCase().includes(asset.toLowerCase()));
    }

    const total = filteredTrades.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedTrades = filteredTrades.slice(startIndex, endIndex);

    res.json({
      trades: paginatedTrades,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trades/:id - Get single trade
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const trade = trades.find(t => t.id === id);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/trades - Create new trade
router.post('/', (req, res) => {
  try {
    const { error, value } = tradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const newTrade = createTrade(value);
    trades.push(newTrade);
    res.status(201).json(newTrade);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trades/:id - Update trade
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tradeIndex = trades.findIndex(t => t.id === id);

    if (tradeIndex === -1) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const { error } = tradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updatedTrade = updateTrade(id, req.body);
    res.json(updatedTrade);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/trades/:id - Delete trade
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    deleteTrade(id);
    res.status(204).send();
  } catch (error) {
    if (error.message === 'Trade not found') {
      return res.status(404).json({ error: 'Trade not found' });
    }
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

function startFakeTradeGenerator(intervalMs = 5000, batchSize = 2) {
  if (generatorActive) {
    return false;
  }

  generatorActive = true;
  generatorInterval = setInterval(() => {
    const addedTrades = [];
    for (let i = 0; i < batchSize; i += 1) {
      const asset = randomElement(ASSETS);
      const direction = randomElement(DIRECTIONS);
      const entry = randomFloat(10, 65000);
      const move = randomFloat(0.5, 1200);
      const exit = direction === 'long' ? Number((entry + move).toFixed(2)) : Number(Math.max(0.01, entry - move).toFixed(2));
      const startDate = randomRecentDate(10);
      const endDate = new Date(new Date(startDate).getTime() + randomInt(1, 48) * 60 * 60 * 1000).toISOString().slice(0, 16);
      const pnl = calculatePnL(entry, exit, direction);
      const status = pnl > 0 ? 'winner' : pnl < 0 ? 'loser' : 'breakeven';
      const review = randomElement(REVIEW_SNIPPETS);

      const newTrade = createTrade({
        asset,
        entry,
        exit,
        direction,
        status,
        startDate,
        endDate,
        review,
        pips: Math.round(pnl)
      });
      trades.push(newTrade);
      addedTrades.push(newTrade);
    }

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

router.post('/generator/start', (req, res) => {
  try {
    const started = startFakeTradeGenerator();
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

module.exports = {
  router,
  resetTrades,
  getAllTrades,
  getStats,
  getTradeById,
  getTradesPage,
  getNotesByTrade,
  getFullStats,
  createTrade,
  updateTrade,
  deleteTrade,
  createNote,
  updateNote,
  deleteNote
};