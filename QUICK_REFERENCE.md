# KRIMSON - Quick Reference Card

## Access Points

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:5173 | ✅ Running |
| Backend API | http://localhost:3001 | ✅ Running |
| GraphQL Playground | http://localhost:3001/graphql | ✅ Available |
| WebSocket | ws://localhost:3001/ws | ✅ Connected |
| Database GUI | http://localhost:5555 | Run: `npx prisma studio` |

---

## Test Credentials

**Use any of these to login:**

| Role | Email | Password | Permissions |
|------|-------|----------|------------|
| 👑 Admin | admin@example.com | AdminPass123! | Full access |
| 🎯 Trader | trader@example.com | TraderPass123! | Trade + Chat |
| 👁️ Viewer | viewer@example.com | ViewerPass123! | Read-only |

---

## Terminal Commands

### Backend
```bash
cd backend
npm install          # First time only
npm start            # Start server on port 3001
npm test             # Run tests (26+ cases)
npx prisma studio   # Open database GUI
npx prisma reset    # Reset database
```

### Frontend
```bash
cd . (project root)
npm install          # First time only
npm run dev          # Start dev server on port 5173
npm run build        # Build for production
npm run test:e2e     # Run E2E tests
```

---

## Key Pages

| Page | URL | Access | Feature |
|------|-----|--------|---------|
| Login | /auth | Everyone | Sign in / Register |
| Trading Terminal | /terminal | Logged in | Main dashboard |
| Admin Logs | /admin/logs | Admin only | Audit logs + suspicious users |

---

## Feature Checklist

### Authentication
- [ ] Login with email + password
- [ ] See user name in header
- [ ] Logout works
- [ ] Create new account (register)
- [ ] Session times out after 30 min inactivity
- [ ] Warning at 28 minutes
- [ ] Can extend session

### Trading Features
- [ ] Create new trade (click "New Trade")
- [ ] See trades in main table
- [ ] Edit existing trade
- [ ] Delete trade
- [ ] Filter by status/asset/direction
- [ ] See statistics cards
- [ ] Pagination working

### Chat
- [ ] Send message in chat panel
- [ ] See message history
- [ ] Messages broadcast in real-time

### Admin
- [ ] Click "Admin" button in header
- [ ] See audit logs page
- [ ] View all user actions
- [ ] See suspicious users panel
- [ ] Risk flags shown

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Can't login | Check backend running (port 3001) |
| Wrong password | Test with exact credentials above |
| 404 on routes | Restart frontend dev server |
| WebSocket error | Check backend is running |
| Database error | Run `npx prisma reset` |
| Port in use | Kill process or change port in .env |

---

## API Examples

### Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"TraderPass123!"}'
```

### GraphQL Query
```graphql
query {
  me { email roles { name } }
  trades(limit: 5) { trades { id asset pnl } }
}
```

### Check Rate Limits
```bash
curl http://localhost:3001/api/debug/rate-limit-status
```

---

## Documentation Files

📄 **QUICK_START.md** - Lab submission guide (5 min setup)  
📄 **DEPLOYMENT_GUIDE.md** - Full deployment manual  
📄 **IMPLEMENTATION_CHECKLIST.md** - Complete feature list  
📄 **COMPLETION_SUMMARY.md** - What was implemented  

---

## Performance Notes

- **Database**: SQLite (dev.db) ~100KB
- **Backend**: ~50MB node_modules, startup: ~2 seconds
- **Frontend**: ~150MB node_modules, build: ~30 seconds
- **Tests**: Run in ~10 seconds
- **Auth**: Login response time: ~200ms

---

## Security Info

✅ Passwords: PBKDF2 hashed (120k iterations)  
✅ Tokens: JWT signed with secret  
✅ Sessions: 30-minute timeout  
✅ HTTPS: Self-signed certs available  
✅ Rate limiting: Per-IP throttling  
✅ CORS: Configured for localhost  

---

## For Lab Submission

### Remote Machine Testing (LAN)

**On server machine (192.168.1.100):**
```bash
cd backend
USE_HTTPS=true npm start
```

**On client machine (192.168.1.101):**

Create `.env.local`:
```env
VITE_SERVER_URL=https://192.168.1.100:3443
```

Then:
```bash
npm run dev
# Open: http://192.168.1.101:5173
```

Accept self-signed certificate warning → continue to app.

---

## Success Indicators ✅

- [x] Backend logs "Server running on http://0.0.0.0:3001"
- [x] Frontend shows "VITE v8.0.3 ready"
- [x] Login page loads at http://localhost:5173
- [x] Can login with test accounts
- [x] Trades display in main table
- [x] Chat sends/receives messages
- [x] Admin button visible
- [x] Database has test data

**Everything is ready!** 🚀

---

**Need help?** Check the documentation files or run:
```bash
npm test                    # Verify tests pass
npx prisma studio          # Inspect database
curl http://localhost:3001/graphql  # Test backend
```
