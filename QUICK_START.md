# KRIMSON Trading Terminal - Lab Submission Quick Start

## Assignment Requirements Status: ✅ COMPLETE

This application implements **ALL Bronze, Silver, and Gold requirements** including:
- ✅ Relational database with ORM (Prisma + SQLite)
- ✅ CRUD operations with statistics and filtering
- ✅ User authentication and authorization (login, register, roles, permissions)
- ✅ Real-time WebSocket chat with persistent messages
- ✅ Audit logging with malevolent behavior detection
- ✅ Admin audit logs page with suspicious user flagging
- ✅ Encrypted HTTPS communication
- ✅ Comprehensive testing (unit + E2E)
- ✅ Cross-machine LAN deployment support

---

## Quick Start (5 Minutes)

### 1. Start Backend Server
```bash
cd backend
npm install  # (only needed first time)
npm start
```

Expected output:
```
Server running on http://0.0.0.0:3001
(Accessible from any network interface at http://<your-ip>:3001)
WebSocket server initialized on /ws
```

### 2. Start Frontend (New Terminal)
```bash
cd (project root)
npm install  # (only needed first time)
npm run dev
```

Expected output:
```
VITE v8.0.3  ready in 1122 ms
Local:   http://localhost:5173/
Network: http://<your-ip>:5173/
```

### 3. Open in Browser
Navigate to: **http://localhost:5173**

You should see the login page with the KRIMSON header.

---

## Test Accounts (Pre-Seeded)

Login with any of these accounts:

**Admin Account:**
- Email: `admin@example.com`
- Password: `AdminPass123!`
- Access: Full system access + audit logs

**Trader Account:**
- Email: `trader@example.com`
- Password: `TraderPass123!`
- Access: Trade management + chat

**Viewer Account:**
- Email: `viewer@example.com`
- Password: `ViewerPass123!`
- Access: Read-only trades + chat

---

## Key Features to Test

### 1. **Authentication** ✅
- [ ] Login with `trader@example.com / TraderPass123!`
- [ ] Create new account (register)
- [ ] See user name in top-right corner
- [ ] Logout from menu

### 2. **Trade Management** ✅
- [ ] View trades in main table (2 pre-seeded)
- [ ] Create new trade (click "New Trade" button)
- [ ] Edit existing trade
- [ ] Delete trade
- [ ] See trade statistics (top cards)
- [ ] Filter by status/asset/direction
- [ ] Sort by columns
- [ ] Pagination working

### 3. **Real-Time Chat** ✅
- [ ] Send message in chat panel
- [ ] See message history on load
- [ ] New messages broadcast live (open 2 browser windows to test)
- [ ] Message timestamps

### 4. **Admin Features** ✅
- [ ] Login with `admin@example.com / AdminPass123!`
- [ ] Click "Admin" button in header → goes to audit logs
- [ ] See all user actions logged (login, trade create, etc.)
- [ ] See "Suspicious Users" panel with risk levels
- [ ] Filter and search audit logs

### 5. **Authorization** ✅
- [ ] Login as "viewer" → can't create trades (UI disabled)
- [ ] Login as "trader" → can create/edit trades
- [ ] Login as "admin" → can see admin features
- [ ] Logout → redirected to login page

### 6. **Session Timeout** ✅
- [ ] Login and wait 28 minutes
- [ ] See warning "Session will expire in 2 minutes"
- [ ] Click "Extend Session" to reset timer
- [ ] After 30 minutes total inactivity → auto logout
- [ ] Any activity (click, type) resets the timer

---

## Cross-Machine Testing (For LAN Submission)

**IMPORTANT:** Assignment requires server and client on **different machines**!

### Setup on Server Machine (e.g., 192.168.1.100):
```bash
cd backend
USE_HTTPS=true npm start
```

### Setup on Client Machine (e.g., 192.168.1.101):

Create `.env.local` file in project root:
```env
VITE_SERVER_URL=https://192.168.1.100:3443
VITE_HOST=0.0.0.0
VITE_PORT=5173
```

Then:
```bash
npm run dev
```

Open browser on client machine: **http://192.168.1.101:5173**

**Note**: Self-signed HTTPS certificate will show warning in browser - click "Advanced" → "Proceed" to continue.

---

## API Testing

### Test Login Endpoint
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"TraderPass123!"}'
```

Expected response includes:
- `user` object (email, roles, permissions)
- `accessToken` (JWT)
- `refreshToken` (with ID and token)
- `session` (with ID and token)

### Access GraphQL Playground
Open: **http://localhost:3001/graphql**

Example query:
```graphql
query {
  me {
    email
    roles { name }
    permissions
  }
  trades(limit: 5) {
    trades { id asset pnl status }
    pagination { total }
  }
}
```

### Check Audit Logs
```bash
curl -X POST http://localhost:3001/api/trades/audit/overview \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json"
```

Returns audit logs and suspicious users.

---

## Database Inspection

### View Database in GUI
```bash
cd backend
npx prisma studio
```

Opens at **http://localhost:5555** - browse all tables interactively

### Run Tests
```bash
cd backend
npm test
```

Runs all unit tests (16 auth tests + 10 trade tests)

---

## Troubleshooting

### "Cannot find module" error
```bash
npm install
npx prisma generate
```

### Database locked
```bash
cd backend
rm dev.db
npx prisma migrate dev
npx prisma db seed
```

### Port 3001 already in use
```bash
# Find what's using it
netstat -ano | findstr :3001

# Or change port in .env
PORT=3002 npm start
```

### Frontend can't reach backend
1. Check backend is running: `http://localhost:3001/graphql` should return `{"status":"ok"}`
2. Check frontend `.env.local` has correct `VITE_SERVER_URL`
3. Verify firewall allows port 3001/3443

### Login button does nothing
1. Check browser console (F12) for errors
2. Verify backend is running
3. Check email/password are correct
4. Try clearing localStorage: `localStorage.clear()` in console

---

## File Structure

```
untitled1/
├── backend/
│   ├── index.js                 # Server entry point
│   ├── server.js                # Express app config
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   ├── trades.js            # Trade endpoints
│   ├── lib/
│   │   ├── enhancedAuth.js       # Auth logic (30+ functions)
│   │   ├── auditLog.js           # Audit logging
│   │   ├── db.js                 # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (13 models)
│   │   ├── seed.js               # Test data
│   │   ├── migrations/           # Auto-generated migrations
│   ├── __tests__/
│   │   ├── users.test.js         # Auth tests (16 cases)
│   │   ├── trades.test.js        # Trade tests (10 cases)
│   ├── dev.db                    # SQLite database

├── src/
│   ├── pages/
│   │   ├── AuthPage.jsx          # Login/register form ✨ FULLY IMPLEMENTED
│   │   ├── MasterTablePage.jsx   # Main trading terminal
│   │   ├── AdminLogsPage.jsx      # Admin audit logs
│   ├── context/
│   │   ├── AuthContext.jsx        # Auth state + session management ✨ UPDATED
│   │   ├── TradeContext.jsx       # Trade state
│   ├── components/
│   │   ├── RootLayout.jsx         # Root layout with providers
│   │   └── ui/                    # Shadcn UI components
│   ├── App.jsx                    # Routes config
│   ├── main.jsx                   # Entry point

├── DEPLOYMENT_GUIDE.md            # Complete deployment guide
├── IMPLEMENTATION_CHECKLIST.md     # Feature checklist
├── QUICK_START.md                  # This file
├── vite.config.js                  # Frontend config (with LAN support)
├── package.json
└── README.md
```

---

## What's Implemented (Summary)

### ✅ Frontend
- **Auth Pages**: Login + Register with validation, password strength meter, 2FA support
- **Main Terminal**: Trade table with stats, CRUD operations, filtering, pagination
- **Admin Logs**: Audit log viewer with suspicious user detection
- **Session Management**: 30-min inactivity timeout with warning
- **WebSocket Chat**: Real-time messages with persistence
- **Role-Based UI**: Admin button only visible to admins

### ✅ Backend
- **Auth System**: Full JWT + refresh token + session management
- **2FA**: TOTP setup, backup codes, verification
- **Audit Logging**: All actions logged with timestamps
- **Suspicious Detection**: 5 behavioral risk categories
- **Database**: 13 models, 3NF normalized, Prisma ORM
- **HTTPS/Security**: Self-signed certs, Helmet headers, rate limiting
- **WebSocket**: Real-time chat with message persistence
- **Testing**: 26+ unit tests, 7 E2E tests

### ✅ Security
- PBKDF2 hashing (120k iterations)
- JWT signed tokens
- Refresh token rotation
- Session inactivity tracking
- Failed login tracking
- Account lockout (5 failed attempts)
- CSP headers
- CORS configured
- Rate limiting per IP
- XSS/CSRF protection

---

## Submission Checklist

Before submitting:
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Database seeded with test accounts
- [ ] Can login with provided test accounts
- [ ] Can create/edit/delete trades
- [ ] Admin can access audit logs
- [ ] Audit logs show suspicious users
- [ ] Chat is sending/receiving messages
- [ ] Session timeout works (wait 28+ minutes)
- [ ] Cross-machine deployment tested (if required)
- [ ] All tests passing (`npm test` in backend)
- [ ] No console errors in browser (F12)

---

## Support

**Quick Reference:**
- Backend docs: `backend/routes/auth.js`, `backend/lib/enhancedAuth.js`
- Frontend auth: `src/context/AuthContext.jsx`
- Database schema: `backend/prisma/schema.prisma`
- Full guide: `DEPLOYMENT_GUIDE.md`
- Feature checklist: `IMPLEMENTATION_CHECKLIST.md`

**Test everything!** All functionality is working and ready for evaluation.

**Good luck with your submission! 🚀**
