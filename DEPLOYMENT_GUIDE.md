# KRIMSON Trading Terminal - Deployment Guide

## Quick Start: Local Development

```bash
# Backend
cd backend
npm install
npx prisma migrate dev  # Initialize database
npx prisma db seed     # Seed with test accounts
npm start              # Runs on http://localhost:3001

# Frontend (new terminal)
cd ..
npm install
npm run dev            # Runs on http://localhost:5173
```

## Test Accounts (After Seeding)
```
Admin:  admin@example.com / AdminPass123!
Trader: trader@example.com / TraderPass123!
Viewer: viewer@example.com / ViewerPass123!
```

---

## Cross-Machine LAN Deployment

### ASSIGNMENT REQUIREMENT: Server & Client on Different Machines

Edit `backend/.env`:
```env
# Run on all network interfaces
SERVER_HOST="0.0.0.0"
PORT="3001"
USE_HTTPS="true"
HTTPS_PORT="3443"
```

### Step 1: Start Backend Server

**On Server Machine (e.g., 192.168.1.100):**
```bash
cd backend
USE_HTTPS=true npm start
```

Output:
```
✓ HTTPS server running on https://192.168.1.100:3443
✓ WebSocket ready at wss://192.168.1.100:3443/ws
✓ REST API at https://192.168.1.100:3443/api
```

### Step 2: Configure Frontend for Remote Server

**On Client Machine (e.g., 192.168.1.101):**

Create/edit `frontend/.env.local`:
```env
VITE_SERVER_URL=https://192.168.1.100:3443
VITE_HOST=0.0.0.0
VITE_PORT=5173
```

Then run:
```bash
npm run dev
```

Now access from client machine: `http://192.168.1.101:5173`

---

## HTTPS Configuration

### Auto-Generated Self-Signed Certificates (Development)

Certificates are auto-generated on first run:
```
backend/certs/key.pem  (2048-bit RSA)
backend/certs/cert.pem (365-day validity)
```

To regenerate:
```bash
rm backend/certs/*.pem
npm start  # Will regenerate
```

### Using Custom Certificates

```env
SSL_CERT_PATH="path/to/cert.pem"
SSL_KEY_PATH="path/to/key.pem"
```

### Browser Trust Issues

Since using self-signed certs:
1. Chrome: Click "Advanced" → "Proceed to site"
2. Firefox: Click "Advanced" → "Accept Risk"
3. Edge: Click "Continue"

---

## Authentication & Security

### Password Requirements
- Minimum 8 characters
- Uppercase letter (A-Z)
- Lowercase letter (a-z)
- Number (0-9)
- Special character (@$!%*?&)

Example valid passwords:
- `MyPassword123!`
- `Secure@Pass2026`
- `Trading!2024$`

### Session Management
- **Timeout**: 30 minutes of inactivity
- **Warning**: 2 minutes before timeout
- **Auto-logout**: After 30 minutes inactivity
- **Activity tracking**: Click, scroll, keyboard, touch

### Two-Factor Authentication (2FA)
Supported but optional. To enable:
1. Login normally
2. Navigate to Settings → Security → 2FA
3. Scan QR code with authenticator app
4. Verify 6-digit code
5. Store backup codes safely

### Refresh Tokens
- Backend automatically rotates refresh tokens
- Frontend stores: `accessToken` + `refreshToken`
- Invalid if revoked or >7 days old
- Call `/api/auth/refresh` to get new access token

---

## Database

### SQLite (Development)
Database: `backend/dev.db`

Inspect database:
```bash
cd backend
npx prisma studio
```

Seed with test data:
```bash
npx prisma db seed
```

### Schema Overview
- **User**: email, password (hashed), profile
- **Role**: admin, trader, viewer
- **Permission**: trade:*, chat:*, audit:*
- **AuditLog**: all user actions logged
- **Session**: active login sessions
- **RefreshToken**: token rotation tracking
- **LoginAttempt**: failed login tracking
- **TwoFactorAuth**: 2FA configuration
- **Trade**: trading records
- **Note**: trade notes
- **Chat**: real-time messages

---

## Audit Logging & Suspicious User Detection

### Admin Panel
Navigate to: **Admin** → **Audit Logs**

Shows:
- All user actions (login, CRUD, chat)
- Suspicious behavior flags
- User threat assessment

### Suspicious Behavior Detection
Flags users when:
- **3+ failed logins** in 30 minutes
- **5+ permission denials** in 30 minutes
- **15+ rapid actions** in 10 minutes
- **10+ failed requests** in 30 minutes

---

## Monitoring & Debug

### Backend Health Check
```bash
curl http://localhost:3001/graphql
# Returns: {"status":"ok"}
```

### Rate Limiting
Development: 10,000 req/15min (per IP)
Production: 1,000 req/15min (per IP)

Check rate limit status:
```bash
curl http://localhost:3001/api/debug/rate-limit-status
```

Clear rate limits:
```bash
curl -X POST http://localhost:3001/api/debug/clear-rate-limits
```

### GraphQL Playground
```
http://localhost:3001/graphql
```

Query example:
```graphql
query {
  me {
    email
    roles { name }
    permissions
  }
  trades(limit: 10) {
    trades { id asset pnl status }
    pagination { total pages }
  }
}
```

---

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
cd backend
npm install
npx prisma generate
```

### Database locked error
```bash
rm backend/dev.db
npx prisma migrate dev
npx prisma db seed
```

### HTTPS connection refused
1. Check `USE_HTTPS=true` in .env
2. Verify certificates in `backend/certs/`
3. Check firewall allows port 3443
4. Retry: `npm start`

### Frontend can't reach backend
1. Verify server IP: `ipconfig` (Windows) or `ifconfig` (Linux)
2. Check `.env.local` has correct `VITE_SERVER_URL`
3. Verify firewall allows port 3001/3443
4. Test: `curl https://[SERVER_IP]:3443/graphql`

### 401 Unauthorized on API calls
1. Login first (check localStorage for token)
2. Verify token not expired (decode JWT: https://jwt.io)
3. Check Authorization header: `Bearer <token>`
4. Logout and re-login if needed

### 2FA issues
- Verify system time is correct (TOTP uses time)
- Try backup codes instead of TOTP
- Disable 2FA from different account and re-setup

---

## Production Checklist

- [ ] Generate CA-signed SSL certificates (not self-signed)
- [ ] Set `NODE_ENV=production`
- [ ] Update `AUTH_SECRET` to strong random value
- [ ] Set `ALLOWED_ORIGINS` to specific domain(s)
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable rate limiting: increase limits cautiously
- [ ] Setup Redis for session storage (optional)
- [ ] Configure email for password reset notifications
- [ ] Enable HTTPS everywhere (`USE_HTTPS=true`)
- [ ] Setup CI/CD pipeline
- [ ] Enable database backups
- [ ] Setup application monitoring/logging
- [ ] Configure WAF (Web Application Firewall)

---

## Support

For issues, check:
1. Terminal output for error messages
2. Browser console (F12) for frontend errors
3. Backend logs for API errors
4. `/api/debug/*` endpoints for diagnostics

