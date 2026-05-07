const request = require('supertest');
const app = require('../server');
const tradeRoutes = require('../routes/trades');

beforeEach(() => {
  tradeRoutes.resetTrades();
});

describe('Trade API', () => {
  test('GET /api/trades returns paginated trades', async () => {
    const response = await request(app).get('/api/trades').query({ page: 1, limit: 2 });
    expect(response.status).toBe(200);
    expect(response.body.trades).toHaveLength(2);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/trades with filtering returns matching trades', async () => {
    const response = await request(app).get('/api/trades').query({ status: 'winner' });
    expect(response.status).toBe(200);
    expect(response.body.trades.every(trade => trade.status === 'winner')).toBe(true);
  });

  test('GET /api/trades/:id returns a single trade', async () => {
    const response = await request(app).get('/api/trades/1');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(1);
  });

  test('POST /api/trades creates a new trade', async () => {
    const newTrade = {
      asset: 'SOL/USDT',
      entry: 100,
      exit: 120,
      direction: 'long',
      status: 'winner',
      startDate: '2026-05-01T09:00:00.000Z',
      endDate: '2026-05-02T09:00:00.000Z',
      review: 'Test trade entry for API create.',
      pips: 200
    };

    const response = await request(app).post('/api/trades').send(newTrade);
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.asset).toBe('SOL/USDT');
    expect(response.body.pnl).toBe(20);
    expect(response.body.pnlPercent).toBe(20);
  });

  test('PUT /api/trades/:id updates an existing trade', async () => {
    const payload = {
      asset: 'BTC/USDT',
      entry: 42500,
      exit: 45000,
      direction: 'long',
      status: 'winner',
      startDate: '2026-03-15T09:30:00.000Z',
      endDate: '2026-03-16T14:45:00.000Z',
      review: 'Updated review content.',
      pips: 250
    };

    const response = await request(app).put('/api/trades/1').send(payload);
    expect(response.status).toBe(200);
    expect(response.body.pnl).toBe(2500);
    expect(response.body.review).toBe('Updated review content.');
  });

  test('DELETE /api/trades/:id removes the trade', async () => {
    const response = await request(app).delete('/api/trades/2');
    expect(response.status).toBe(204);

    const getResponse = await request(app).get('/api/trades/2');
    expect(getResponse.status).toBe(404);
  });

  test('POST /api/trades/generator/start and stop endpoints work', async () => {
    const startResponse = await request(app).post('/api/trades/generator/start');
    expect(startResponse.status).toBe(201);
    expect(startResponse.body.status).toBe('started');

    const secondStartResponse = await request(app).post('/api/trades/generator/start');
    expect(secondStartResponse.status).toBe(409);

    const stopResponse = await request(app).post('/api/trades/generator/stop');
    expect(stopResponse.status).toBe(200);
    expect(stopResponse.body.status).toBe('stopped');
  });

  test('GET /api/trades/stats/summary returns summary statistics', async () => {
    const response = await request(app).get('/api/trades/stats/summary');
    expect(response.status).toBe(200);
    expect(response.body.totalTrades).toBe(2);
    expect(response.body.winners).toBeGreaterThanOrEqual(0);
    expect(response.body.losers).toBeGreaterThanOrEqual(0);
  });

  test('POST /api/trades rejects invalid payloads', async () => {
    const response = await request(app).post('/api/trades').send({
      asset: '',
      entry: -1,
      exit: 100,
      direction: 'flat',
      status: 'winner',
      startDate: 'invalid-date',
      endDate: '2026-03-15T00:00:00.000Z'
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
