const prisma = require('./db');

async function recordAudit({ userId = null, action = '', resource = '', status = 'unknown', details = '', metadata = {} }) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      status,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date()
    }
  });
}

async function getAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 250),
    include: { user: true }
  });
}

module.exports = {
  recordAudit,
  getAuditLogs
};
