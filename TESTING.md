# Krimson Trading Platform - Testing Guide

This guide covers all testing procedures for the Bronze Grade requirements.

## Quick Test Commands

```bash
# Backend Tests
\cd backend && npm test

# Frontend Unit Tests
\npm test

# Frontend Coverage
\npm run coverage

# E2E Tests
\npm run test:e2e

# E2E Tests with UI
\npm run test:e2e:ui
```

## Bronze Grade Requirements Checklist

### ✅ 1. Secure Login/Register

**Features Implemented:**
- Password hashing with PBKDF2 (120,000 iterations, SHA-512)
- JWT tokens with configurable expiration
- Rate limiting: 5 attempts per 15 minutes for auth endpoints
- Password requirements: 8+ chars, uppercase, lowercase, number
- HTTPS support with automatic certificate generation

**Test:**
```bash
cd backend
npm test -- --testNamePattern="Authentication"
```

**Expected Results:**
- ✓ Login with valid credentials returns token
- ✓ Login with invalid credentials returns 401
- ✓ Registration with weak password rejected
- ✓ Rate limiting prevents brute force

### ✅ 2. Token-Based Role/Permission Management with Session Inactivity Logout

**Features Implemented:**
- JWT tokens contain user roles and permissions
- 30-minute inactivity timeout
- 2-minute warning before logout
- Activity tracking (mouse, keyboard, scroll, touch)
- Session extension via "Stay Logged In" button

**Test Manual Steps:**
1. Login to the application
2. Leave idle for 28 minutes
3. Observe warning popup at 28 minutes
4. Click "Stay Logged In" to extend
5. Or wait for auto-logout at 30 minutes

**Verify:**
- Session warning appears with countdown timer
- After logout, login page shows "You were logged out due to inactivity"
- Local storage cleared of auth data

### ✅ 3. Server on Different Machine (LAN)

**Setup for Lab Environment:**

**On SERVER Machine (Backend):**
```bash
cd backend
# Edit .env
DATABASE_URL="file:./dev.db"
SERVER_HOST="0.0.0.0"
PORT="3001"
ALLOWED_ORIGINS="*"  # Or specific client IP
SESSION_TIMEOUT_SECONDS="1800"
npm install
npm start
```

**On CLIENT Machine (Frontend):**
```bash
# Create .env file
echo "VITE_SERVER_URL=http://SERVER_IP:3001" > .env
# Replace SERVER_IP with actual server IP (e.g., 192.168.1.100)

npm install
npm run dev
```

**Verify Network Connection:**
```bash
# From client machine
curl http://SERVER_IP:3001/api/trades/health
# Should return: {"status":"ok",...}
```

## Detailed Test Suites

### Backend Tests (Jest)

```bash
cd backend
npm test
```

**Coverage Areas:**
- User Authentication (login/register)
- Role and Permission Management
- Protected Route Access Control
- Chat API
- Trade CRUD Operations
- Audit Logging

**Key Test Files:**
- `backend/__tests__/users.test.js` - Auth & User management
- `backend/__tests__/trades.test.js` - Trade operations

### Frontend Tests (Vitest)

```bash
npm test
```

**Coverage Areas:**
- AuthContext state management
- Login/Register flows
- Route protection
- Session timeout handling

**Key Test Files:**
- `src/context/AuthContext.test.jsx`

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

**Test Scenarios:**
1. Login page functionality
2. Registration with validation
3. Protected route redirects
4. Session persistence
5. Inactivity logout flow

## Network Testing for LAN Setup

### Step 1: Identify IP Addresses

**On Server:**
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

Note the IPv4 address (e.g., `192.168.1.100`).

### Step 2: Test Connectivity

**On Client:**
```bash
# Ping server
ping 192.168.1.100

# Test backend API
curl http://192.168.1.100:3001/api/trades/health

# Expected output:
# {"status":"ok","timestamp":"2026-05-25T..."}
```

### Step 3: Firewall Configuration (Windows)

**Option A - Add Inbound Rule:**
1. Open "Windows Defender Firewall with Advanced Security"
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → TCP → Specific port: 3001
4. Allow connection → Check Domain, Private, Public
5. Name it "Krimson Backend"

**Option B - Temporarily Disable (Testing Only):**
```cmd
netsh advfirewall set allprofiles state off
```

### Step 4: Run Full Test

**Server Terminal:**
```bash
cd backend
npm start
```

**Client Terminal:**
```bash
# Configure for LAN
echo "VITE_SERVER_URL=http://192.168.1.100:3001" > .env

npm run dev
```

**Client Browser:**
1. Open `http://localhost:5173`
2. Navigate to Login
3. Register a new account
4. Login
5. Access protected routes (Terminal, Vault)
6. Leave idle for 30 minutes to test inactivity logout

## Security Verification

### Check Password Hashing
```bash
# In backend test
npm test -- --testNamePattern="password"
# Verify passwords are hashed with salt
```

### Check JWT Tokens
```bash
# Login and inspect token structure
curl -X POST http://localhost:3001/api/trades/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"password123"}'

# Verify response contains:
# - token (JWT format: header.payload.signature)
# - roles array
# - permissions array
```

### Check Rate Limiting
```bash
# Attempt 6 rapid login requests
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/trades/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# 6th request should return: 429 Too Many Requests
```

## Troubleshooting

### CORS Errors

**Problem:** Browser shows CORS policy errors

**Solution:**
1. Check `ALLOWED_ORIGINS` in `backend/.env`
2. Must include client URL: `http://CLIENT_IP:5173`
3. Or use `*` for development

### Session Not Timing Out

**Problem:** User stays logged in after 30 minutes idle

**Solution:**
1. Check `SESSION_TIMEOUT_SECONDS` in `backend/.env` (1800 = 30 min)
2. Verify AuthContext constants match backend
3. Check browser console for activity tracking errors

### Cannot Connect Across Network

**Problem:** Client cannot reach server

**Solution:**
1. Verify both machines on same network
2. Check Windows Firewall on server
3. Verify `SERVER_HOST="0.0.0.0"` in `backend/.env`
4. Test with `ping` and `curl` commands

## Test Results Summary

After running all tests, you should see:

```
Backend Tests:    ✓ 20+ tests passing
Frontend Tests:   ✓ 10+ tests passing
E2E Tests:        ✓ 15+ tests passing
Code Coverage:    > 70% overall
```

## Lab Submission Checklist

- [ ] Backend runs on Machine A (server)
- [ ] Frontend runs on Machine B (client)
- [ ] Client successfully connects to server via LAN IP
- [ ] User can register new account
- [ ] User can login with credentials
- [ ] Token contains roles and permissions
- [ ] Protected routes require authentication
- [ ] 30-minute inactivity logout works
- [ ] Warning shown before auto-logout
- [ ] All backend tests pass
- [ ] All frontend tests pass
- [ ] E2E tests pass

## Quick Reference Card

| Task | Command |
|------|---------|
| Start Backend | `cd backend && npm start` |
| Start Frontend | `npm run dev` |
| Backend Tests | `cd backend && npm test` |
| Frontend Tests | `npm test` |
| E2E Tests | `npm run test:e2e` |
| Get Server IP | `ipconfig` (Windows) |
| Test Connection | `curl http://IP:3001/api/trades/health` |
