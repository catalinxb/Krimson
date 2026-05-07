const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { WebSocketServer } = require('ws');
const { setBroadcaster } = require('./lib/websocket');
const tradeRoutes = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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
