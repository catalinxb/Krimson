# Railway Deployment Configuration

## Environment Variables Setup

Create these environment variables in Railway dashboard:

### Database
- `DATABASE_URL` - Set to Railway Postgres URI or `file:./dev.db` for SQLite

### Security
- `AUTH_SECRET` - Strong random string (generate: `openssl rand -hex 32`)
- `NODE_ENV` - Set to `production`

### Network & HTTPS
- `USE_HTTPS` - Set to `false` (Railway handles HTTPS via their load balancer)
- `SERVER_HOST` - Set to `0.0.0.0`
- `ALLOWED_ORIGINS` - Set to `https://your-railway-domain.up.railway.app`

### Session
- `SESSION_TIMEOUT_SECONDS` - `1800` (30 minutes)

### Optional
- `VITE_API_URL` - Will be set in frontend environment

## Railway.app Setup Steps

### 1. Connect GitHub Repository
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the repository
5. Click "Add Service"

### 2. Configure Backend Service

1. **Service Name**: Set to `backend`
2. **Root Directory**: `backend`
3. **Build Command**: 
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
4. **Start Command**: 
   ```
   node index.js
   ```
5. **Environment Variables**:
   - `DATABASE_URL` = Railway Postgres URI (or SQLite file path)
   - `AUTH_SECRET` = Generate with: `openssl rand -hex 32`
   - `NODE_ENV` = `production`
   - `USE_HTTPS` = `false`
   - `SERVER_HOST` = `0.0.0.0`
   - `PORT` = Railway will set this automatically
   - `ALLOWED_ORIGINS` = `*` (or specific frontend URL)

6. **Network Settings**:
   - Public URL will be auto-generated
   - Note the backend URL (e.g., `backend-production.up.railway.app`)

### 3. Configure Frontend Service

1. **Create New Service** → "GitHub repo"
2. **Service Name**: Set to `frontend`
3. **Root Directory**: `.` (root of project)
4. **Build Command**:
   ```
   npm install && VITE_API_URL=https://backend-production.up.railway.app npm run build
   ```
5. **Start Command**:
   ```
   npm run preview
   ```
6. **Environment Variables**:
   - `VITE_API_URL` = https://[backend-service-url]
   - `VITE_HOST` = `0.0.0.0`

### 4. Database Setup (PostgreSQL - Recommended)

1. In Railway project, click "Add"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create `DATABASE_URL` variable
4. Update your backend service with this URL

**OR** Use SQLite (simpler for learning):
- Keep `DATABASE_URL=file:./dev.db` in backend
- Database file will be in Railway ephemeral filesystem

### 5. Deploy

1. Push changes to GitHub
2. Railway will auto-deploy on push (if enabled)
3. Monitor deployment logs in Railway dashboard
4. Once deployed, visit the frontend URL

---

## Database Migration on Railway

Railway will automatically run migrations if you set:

**Build Command**:
```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

Or for initial setup with seeding:
```bash
npm install && npx prisma generate && npx prisma migrate deploy && npx prisma db seed
```

---

## Environment Variables Reference

### Backend (.env equivalent)
```
DATABASE_URL="postgresql://user:password@host:5432/dbname"  # Or SQLite
AUTH_SECRET="your-strong-secret-here"
NODE_ENV="production"
USE_HTTPS="false"  # Railway handles TLS
SERVER_HOST="0.0.0.0"
PORT=3001  # Auto-set by Railway
ALLOWED_ORIGINS="https://your-frontend.up.railway.app"
SESSION_TIMEOUT_SECONDS="1800"
```

### Frontend (.env.local equivalent)
```
VITE_API_URL="https://your-backend.up.railway.app"
VITE_HOST="0.0.0.0"
VITE_PORT="3000"
```

---

## Common Issues & Fixes

### Port Already in Use
- Railway assigns the port automatically via `$PORT` env var
- Backend already reads `process.env.PORT || 3001`
- If issues, restart the service in Railway dashboard

### Database Connection Failed
- Check `DATABASE_URL` is set correctly
- For PostgreSQL: Ensure Railway Postgres service is running
- Test with `npx prisma db push` in build command

### Frontend Can't Reach Backend
- Verify `VITE_API_URL` is set to backend Railway URL
- Check CORS on backend: `ALLOWED_ORIGINS` must include frontend URL
- Rebuild frontend after changing `VITE_API_URL`

### Build Fails
- Check build logs in Railway dashboard
- Ensure `npm install` completes successfully
- Verify all environment variables are set
- Check Node version (should be 18+ auto-detected)

### Persistent Storage
- SQLite data is **ephemeral** on Railway (lost on redeploy)
- Use PostgreSQL for persistent database
- Or configure Railway Volumes for SQLite persistence

---

## Monitoring & Logs

1. Go to Railway project dashboard
2. Select service (backend or frontend)
3. Click "Logs" tab
4. View real-time logs as users interact
5. Check "Build Logs" for deployment issues

---

## Scaling & Performance

- Backend service: Can set resource limits in Railway
- Frontend service: Usually just needs to serve static files
- Database: PostgreSQL scales with Railway's tier
- Use CDN for faster asset delivery (Railway free tier includes this)

---

## Production Checklist

- [x] Database migrations working
- [x] AUTH_SECRET set to strong random value
- [x] ALLOWED_ORIGINS configured correctly
- [x] HTTPS enabled (via Railway)
- [x] Session timeout configured
- [x] Admin users seeded in production DB
- [x] Logs being collected
- [x] Backups configured (for PostgreSQL)

---

## Testing on Railway

### Health Checks
```bash
curl https://your-backend.up.railway.app/graphql
# Should return: {"status":"ok"}

curl https://your-frontend.up.railway.app/
# Should show login page
```

### Test Login
```bash
curl -X POST https://your-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"TraderPass123!"}'
```

### View Logs
- Backend: `railway logs backend`
- Frontend: `railway logs frontend`
- Database: `railway logs postgres` (if using PostgreSQL)

---

## Deployment Complete!

Once deployed:
1. Frontend: https://frontend-xxxxx.up.railway.app
2. Backend API: https://backend-xxxxx.up.railway.app
3. Database: Connected and ready

Share these URLs with users or set up a custom domain in Railway settings.

---

## Next Steps

1. Update `QUICK_START.md` with production URLs
2. Update `DEPLOYMENT_GUIDE.md` with Railway section
3. Create DNS CNAME records if using custom domain
4. Monitor application performance
5. Set up error tracking (e.g., Sentry)
6. Configure email for password recovery
