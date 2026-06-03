const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'chat.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initChatDb() {
  await db.read();
  db.data ||= { messages: [] };
  await db.write();
}

async function addChatMessage({ sender, text, room = 'global' }) {
  await initChatDb();
  const message = {
    id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
    sender,
    text,
    room,
    timestamp: new Date().toISOString()
  };
  db.data.messages.push(message);
  await db.write();
  return message;
}

async function getChatMessages({ room = 'global', limit = 50 } = {}) {
  await initChatDb();
  return db.data.messages
    .filter((item) => item.room === room)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-limit);
}

module.exports = {
  addChatMessage,
  getChatMessages
};
