const request = require('supertest');
const app = require('../server');
const tradeRoutes = require('../routes/trades');

beforeEach(async () => {
  await tradeRoutes.resetTrades();
});

afterAll(async () => {
  await tradeRoutes.disconnect();
});

describe('Authentication and User API', () => {
  describe('POST /api/trades/users/login', () => {
    test('Login with valid credentials returns user with token and roles', async () => {
      const response = await request(app).post('/api/trades/users/login').send({
        email: 'trader@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('trader@example.com');
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(Array.isArray(response.body.roles)).toBe(true);
      expect(response.body.roles.some((role) => role.name === 'admin')).toBe(true);
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(response.body.permissions).toContain('trade:create');
    });

    test('Login with invalid credentials returns 401', async () => {
      const response = await request(app).post('/api/trades/users/login').send({
        email: 'trader@example.com',
        password: 'wrongpassword'
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('Login with non-existent user returns 401', async () => {
      const response = await request(app).post('/api/trades/users/login').send({
        email: 'nonexistent@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('Login with missing email returns 400', async () => {
      const response = await request(app).post('/api/trades/users/login').send({
        password: 'password123'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    test('Login with missing password returns 400', async () => {
      const response = await request(app).post('/api/trades/users/login').send({
        email: 'trader@example.com'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('POST /api/trades/users/register', () => {
    test('Register with valid data creates new user and returns token', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'newuser@example.com',
        password: 'Password123',
        displayName: 'New Trader'
      });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.token).toBeDefined();
      expect(response.body.profile?.displayName).toBe('New Trader');
      expect(response.body.roles).toBeDefined();
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });

    test('Register without display name still succeeds', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'another@example.com',
        password: 'Password123'
      });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('another@example.com');
      expect(response.body.token).toBeDefined();
    });

    test('Register with duplicate email returns 409', async () => {
      // First registration
      await request(app).post('/api/trades/users/register').send({
        email: 'duplicate@example.com',
        password: 'Password123'
      });

      // Duplicate registration
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'duplicate@example.com',
        password: 'Password123'
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already exists');
    });

    test('Register with weak password returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'weak@example.com',
        password: 'weak'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });

    test('Register with password missing uppercase returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'weak@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('uppercase');
    });

    test('Register with password missing lowercase returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'weak@example.com',
        password: 'PASSWORD123'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lowercase');
    });

    test('Register with password missing number returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'weak@example.com',
        password: 'PasswordABC'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('number');
    });

    test('Register with invalid email format returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'notanemail',
        password: 'Password123'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    test('Register with missing email returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        password: 'Password123'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    test('Register with missing password returns 400', async () => {
      const response = await request(app).post('/api/trades/users/register').send({
        email: 'test@example.com'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('Protected Routes', () => {
    test('Accessing protected route without token returns 401', async () => {
      const response = await request(app).get('/api/trades');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    test('Accessing protected route with valid token succeeds', async () => {
      // Login to get token
      const loginResponse = await request(app).post('/api/trades/users/login').send({
        email: 'trader@example.com',
        password: 'password123'
      });

      const token = loginResponse.body.token;

      // Access protected route with token
      const response = await request(app)
        .get('/api/trades')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.trades).toBeDefined();
    });

    test('Accessing protected route with invalid token returns 401', async () => {
      const response = await request(app)
        .get('/api/trades')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
    });
  });

  describe('Role and Permission Management', () => {
    test('Role and permission creation and assignment works', async () => {
      const roleResponse = await request(app).post('/api/trades/roles').send({
        name: 'auditor',
        description: 'Read-only access for audit users'
      });
      expect(roleResponse.status).toBe(201);
      expect(roleResponse.body.name).toBe('auditor');

      const permissionResponse = await request(app).post('/api/trades/permissions').send({
        name: 'audit:view',
        description: 'View audit logs and trade summaries'
      });
      expect(permissionResponse.status).toBe(201);
      expect(permissionResponse.body.name).toBe('audit:view');

      const rolesList = await request(app).get('/api/trades/roles');
      expect(rolesList.status).toBe(200);
      expect(rolesList.body.some((role) => role.name === 'auditor')).toBe(true);

      const permissionsList = await request(app).get('/api/trades/permissions');
      expect(permissionsList.status).toBe(200);
      expect(permissionsList.body.some((perm) => perm.name === 'audit:view')).toBe(true);

      const userResponse = await request(app).post('/api/trades/users').send({
        email: 'auditor@example.com',
        password: 'auditpass'
      });
      expect(userResponse.status).toBe(201);
      const userId = userResponse.body.id;

      const assignRoleResponse = await request(app).post(`/api/trades/users/${userId}/roles`).send({ roleId: roleResponse.body.id });
      expect(assignRoleResponse.status).toBe(200);
      expect(assignRoleResponse.body.userId).toBe(userId);

      const assignPermissionResponse = await request(app)
        .post(`/api/trades/roles/${roleResponse.body.id}/permissions`)
        .send({ permissionId: permissionResponse.body.id });
      expect(assignPermissionResponse.status).toBe(200);
      expect(assignPermissionResponse.body.roleId).toBe(roleResponse.body.id);
    });
  });

  describe('Chat API', () => {
    test('Chat endpoints persist messages and return chat history', async () => {
      const messagePayload = {
        sender: 'tester@example.com',
        text: 'Hello from the chat test',
        room: 'global'
      };

      const postResponse = await request(app).post('/api/trades/chat/messages').send(messagePayload);
      expect(postResponse.status).toBe(201);
      expect(postResponse.body.sender).toBe(messagePayload.sender);
      expect(postResponse.body.text).toBe(messagePayload.text);
      expect(postResponse.body.id).toBeDefined();

      const getResponse = await request(app).get('/api/trades/chat/messages');
      expect(getResponse.status).toBe(200);
      expect(Array.isArray(getResponse.body)).toBe(true);
      expect(getResponse.body.some((msg) => msg.id === postResponse.body.id)).toBe(true);
    });
  });
});
