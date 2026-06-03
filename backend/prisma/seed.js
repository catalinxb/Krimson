const { PrismaClient } = require('@prisma/client');
const auth = require('../lib/enhancedAuth');
const prisma = new PrismaClient();

async function seed() {
  // Clear all data (respecting foreign key order)
  await prisma.loginAttempt.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.twoFactorAuth.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.note.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user with hashed password
  const adminPassword = auth.hashPassword('AdminPass123!');
  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      emailVerified: true
    }
  });

  await prisma.profile.create({
    data: {
      userId: user.id,
      displayName: 'Demo Trader',
      pipValue: 1.0,
      theme: 'dark'
    }
  });

  const trade1 = await prisma.trade.create({
    data: {
      userId: user.id,
      asset: 'BTC/USDT',
      entry: 42500,
      exit: 45200,
      pnl: 2700,
      pnlPercent: 6.35,
      direction: 'long',
      status: 'winner',
      startDate: new Date('2026-03-15T09:30:00.000Z'),
      endDate: new Date('2026-03-16T14:45:00.000Z'),
      review: 'Strong bullish momentum confirmed on 4H chart. Entry taken after breakout above resistance.',
      pips: 270,
      duration: '29h 15m'
    }
  });

  await prisma.note.create({
    data: {
      tradeId: trade1.id,
      content: 'Market momentum call was confirmed by both RSI and volume.'
    }
  });

  await prisma.trade.create({
    data: {
      userId: user.id,
      asset: 'ETH/USDT',
      entry: 2850,
      exit: 2720,
      pnl: -130,
      pnlPercent: -4.56,
      direction: 'long',
      status: 'loser',
      startDate: new Date('2026-03-14T11:00:00.000Z'),
      endDate: new Date('2026-03-15T16:20:00.000Z'),
      review: 'Failed breakout, should have respected the bearish divergence.',
      pips: -130,
      duration: '29h 20m'
    }
  });

  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Full access to all system features, user management, and audit logs.'
    }
  });

  const traderRole = await prisma.role.create({
    data: {
      name: 'trader',
      description: 'Standard trader role with trade management and chat access.'
    }
  });

  const viewerRole = await prisma.role.create({
    data: {
      name: 'viewer',
      description: 'Read-only access to view trades and chat.'
    }
  });

  // Create comprehensive permissions
  const permissions = await Promise.all([
    // Trade permissions
    prisma.permission.create({ data: { name: 'trade:view', description: 'View trades and statistics' } }),
    prisma.permission.create({ data: { name: 'trade:create', description: 'Create new trades' } }),
    prisma.permission.create({ data: { name: 'trade:update', description: 'Update existing trades' } }),
    prisma.permission.create({ data: { name: 'trade:delete', description: 'Delete trades' } }),
    prisma.permission.create({ data: { name: 'trade:export', description: 'Export trade data' } }),
    // Chat permissions
    prisma.permission.create({ data: { name: 'chat:view', description: 'View chat messages' } }),
    prisma.permission.create({ data: { name: 'chat:send', description: 'Send chat messages' } }),
    prisma.permission.create({ data: { name: 'chat:moderate', description: 'Moderate chat (delete messages)' } }),
    // Admin permissions
    prisma.permission.create({ data: { name: 'admin:users', description: 'Manage users' } }),
    prisma.permission.create({ data: { name: 'admin:roles', description: 'Manage roles and permissions' } }),
    prisma.permission.create({ data: { name: 'admin:audit', description: 'View audit logs' } }),
    prisma.permission.create({ data: { name: 'admin:system', description: 'System configuration' } }),
    // Account permissions
    prisma.permission.create({ data: { name: 'account:manage', description: 'Manage own account' } }),
    prisma.permission.create({ data: { name: 'account:2fa', description: 'Setup 2FA' } }),
    prisma.permission.create({ data: { name: 'account:password', description: 'Change password' } })
  ]);

  // Assign permissions to roles
  // Admin gets all permissions
  const adminPermissions = permissions.map(p => ({ roleId: adminRole.id, permissionId: p.id }));

  // Trader gets trade and chat permissions plus account management
  const traderPermissions = [
    permissions[0], // trade:view
    permissions[1], // trade:create
    permissions[2], // trade:update
    permissions[3], // trade:delete
    permissions[4], // trade:export
    permissions[5], // chat:view
    permissions[6], // chat:send
    permissions[12], // account:manage
    permissions[13], // account:2fa
    permissions[14]  // account:password
  ].map(p => ({ roleId: traderRole.id, permissionId: p.id }));

  // Viewer gets view-only permissions
  const viewerPermissions = [
    permissions[0], // trade:view
    permissions[5], // chat:view
    permissions[12] // account:manage
  ].map(p => ({ roleId: viewerRole.id, permissionId: p.id }));

  await prisma.rolePermission.createMany({
    data: [...adminPermissions, ...traderPermissions, ...viewerPermissions]
  });

  // Assign admin role to admin user
  await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });

  // Create trader user
  const traderPassword = auth.hashPassword('TraderPass123!');
  const traderUser = await prisma.user.create({
    data: {
      email: 'trader@example.com',
      username: 'trader',
      password: traderPassword,
      emailVerified: true
    }
  });

  await prisma.profile.create({
    data: {
      userId: traderUser.id,
      displayName: 'Demo Trader',
      pipValue: 1.0,
      theme: 'dark'
    }
  });

  await prisma.userRole.create({ data: { userId: traderUser.id, roleId: traderRole.id } });

  // Create viewer user
  const viewerPassword = auth.hashPassword('ViewerPass123!');
  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@example.com',
      username: 'viewer',
      password: viewerPassword,
      emailVerified: true
    }
  });

  await prisma.profile.create({
    data: {
      userId: viewerUser.id,
      displayName: 'View Only',
      pipValue: 1.0,
      theme: 'light'
    }
  });

  await prisma.userRole.create({ data: { userId: viewerUser.id, roleId: viewerRole.id } });

  // Create sample trades for the trader
  const sampleTrade = await prisma.trade.create({
    data: {
      userId: traderUser.id,
      asset: 'BTC/USDT',
      entry: 42500,
      exit: 45200,
      pnl: 2700,
      pnlPercent: 6.35,
      direction: 'long',
      status: 'winner',
      startDate: new Date('2026-03-15T09:30:00.000Z'),
      endDate: new Date('2026-03-16T14:45:00.000Z'),
      review: 'Strong bullish momentum confirmed on 4H chart. Entry taken after breakout above resistance.',
      pips: 270,
      duration: '29h 15m'
    }
  });

  await prisma.note.create({
    data: {
      tradeId: sampleTrade.id,
      content: 'Market momentum call was confirmed by both RSI and volume.'
    }
  });

  await prisma.trade.create({
    data: {
      userId: traderUser.id,
      asset: 'ETH/USDT',
      entry: 2850,
      exit: 2720,
      pnl: -130,
      pnlPercent: -4.56,
      direction: 'long',
      status: 'loser',
      startDate: new Date('2026-03-14T11:00:00.000Z'),
      endDate: new Date('2026-03-15T16:20:00.000Z'),
      review: 'Failed breakout, should have respected the bearish divergence.',
      pips: -130,
      duration: '29h 20m'
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('🔑 Test Accounts:');
  console.log('  Admin:  admin@example.com / AdminPass123!');
  console.log('  Trader: trader@example.com / TraderPass123!');
  console.log('  Viewer: viewer@example.com / ViewerPass123!');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
