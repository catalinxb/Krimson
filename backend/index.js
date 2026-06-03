const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const app = require('./server');
const chatDb = require('./lib/chatDb');
const { setBroadcaster } = require('./lib/websocket');

const PORT = parseInt(process.env.PORT, 10) || 3001;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT, 10) || 3443;
const SERVER_HOST = process.env.SERVER_HOST || '0.0.0.0';
const USE_HTTPS = process.env.USE_HTTPS === 'true' || false;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;
let httpsServer;
let wss;

function setupWebSocket(httpServer) {
  // Create WebSocket server without attaching to HTTP server initially
  wss = new WebSocketServer({ noServer: true });

  // Handle upgrade manually to bypass Express middleware
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (socket) => {
    console.log('WebSocket client connected');
    socket.send(JSON.stringify({ type: 'connection', message: 'Connected to trade generator updates' }));

    try {
      const messages = await chatDb.getChatMessages({ limit: 50 });
      socket.send(JSON.stringify({ type: 'chat.history', messages }));
    } catch (err) {
      console.error('Failed to load chat history', err);
    }

    socket.on('message', async (raw) => {
      try {
        const data = JSON.parse(raw);
        if (data.type === 'chat.message' && data.payload) {
          const { sender, text, room } = data.payload;
          const message = await chatDb.addChatMessage({ sender, text, room });
          const broadcastPayload = JSON.stringify({ type: 'chat.message', message });
          wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
              client.send(broadcastPayload);
            }
          });
        }
      } catch (error) {
        console.error('Invalid WebSocket payload', error);
      }
    });

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    socket.on('error', (err) => {
      console.error('WebSocket client error:', err);
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

  console.log('WebSocket server initialized on /ws');
}

function createSelfSignedCerts() {
  const certsDir = path.join(__dirname, 'certs');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const keyPath = path.join(certsDir, 'key.pem');
  const certPath = path.join(certsDir, 'cert.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    try {
      const { execSync } = require('child_process');
      console.log('Generating self-signed SSL certificates for development...');
      execSync(
        `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Krimson/CN=localhost"`,
        { stdio: 'inherit' }
      );
      console.log('Self-signed certificates generated successfully');
    } catch (error) {
      console.error('Failed to generate self-signed certificates:', error.message);
      return null;
    }
  }

  try {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (error) {
    console.error('Failed to read SSL certificates:', error.message);
    return null;
  }
}

function getSSLCredentials() {
  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;

  if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
    } catch (error) {
      console.error('Failed to read provided SSL certificates:', error.message);
    }
  }

  if (NODE_ENV === 'development') {
    return createSelfSignedCerts();
  }

  return null;
}

function startServers() {
  const sslCredentials = USE_HTTPS ? getSSLCredentials() : null;

  if (sslCredentials) {
    httpsServer = https.createServer(sslCredentials, app);
    httpsServer.listen(HTTPS_PORT, SERVER_HOST, () => {
      console.log(`HTTPS Server running on https://${SERVER_HOST}:${HTTPS_PORT}`);
      if (SERVER_HOST === '0.0.0.0') {
        console.log(`(Accessible from any network interface at https://<your-ip>:${HTTPS_PORT})`);
      }
    });

    http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://localhost:${HTTPS_PORT}${req.url}` });
      res.end();
    }).listen(PORT, SERVER_HOST, () => {
      console.log(`HTTP redirect server running on http://${SERVER_HOST}:${PORT} (redirects to HTTPS)`);
    });

    server = httpsServer;
    setupWebSocket(httpsServer);
  } else {
    server = app.listen(PORT, SERVER_HOST, () => {
      console.log(`Server running on http://${SERVER_HOST}:${PORT}`);
      if (SERVER_HOST === '0.0.0.0') {
        console.log(`(Accessible from any network interface at http://<your-ip>:${PORT})`);
      }
      if (USE_HTTPS) {
        console.warn('Warning: HTTPS was requested but SSL certificates are not available');
      }
    });
    setupWebSocket(server);
  }

  return server;
}

server = startServers();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
  if (httpsServer) {
    httpsServer.close();
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
  if (httpsServer) {
    httpsServer.close();
  }
});