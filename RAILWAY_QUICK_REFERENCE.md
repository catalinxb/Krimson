# 🚀 Railway Deployment Quick Reference

## Before You Start
- [ ] Code pushed to GitHub
- [ ] Generate AUTH_SECRET: `openssl rand -hex 32`
- [ ] Have Railway account ready: https://railway.app

---

## Railway Dashboard: 3 Simple Steps

### 1️⃣ Create Project
```
railway.app → New Project → Deploy from GitHub
Select: untitled1 repository → Deploy Now
```

### 2️⃣ Configure Backend Service
```
Name: backend
Root Directory: backend
Build: npm install && npx prisma generate && npx prisma migrate deploy
Start: npm start

Environment Variables:
  AUTH_SECRET = [your-generated-secret]
  NODE_ENV = production
  DATABASE_URL = file:./dev.db
  USE_HTTPS = false
  SERVER_HOST = 0.0.0.0
  ALLOWED_ORIGINS = *
```

### 3️⃣ Configure Frontend Service
```
Click "New" → GitHub Repo → Select untitled1 again

Name: frontend
Root Directory: .
Build: npm install && npm run build
Start: npm run preview

Environment Variables:
  VITE_API_URL = https://[backend-url-from-railway]
  NODE_ENV = production
```

---

## After Deploy: 3 Tests

### Test 1: Backend
```bash
curl https://[your-backend].up.railway.app/api/auth/login
# Should work (no 404)
```

### Test 2: Frontend
```
Open: https://[your-frontend].up.railway.app
Should show login page ✓
```

### Test 3: Login
```
Email: trader@example.com
Pass: TraderPass123!
Should work ✓
```

---

## If Something Fails

| Problem | Fix |
|---------|-----|
| Build error | Click "Build Logs" - read error message |
| Login fails | Check `VITE_API_URL` is correct in frontend |
| 404 error | Verify root directories in Railway |
| Can't reach backend | Check backend public URL exists |

---

## Auth Secret Generation

**Windows:**
```powershell
[System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

**Mac/Linux:**
```bash
openssl rand -hex 32
```

Copy the output → paste in Railway `AUTH_SECRET` variable

---

## Environment Variables: Copy-Paste

### Backend
```
AUTH_SECRET=your-generated-secret-here
NODE_ENV=production
DATABASE_URL=file:./dev.db
USE_HTTPS=false
SERVER_HOST=0.0.0.0
ALLOWED_ORIGINS=*
SESSION_TIMEOUT_SECONDS=1800
```

### Frontend
```
VITE_API_URL=https://backend-production.up.railway.app
NODE_ENV=production
```

---

## URLs You'll Get
```
Frontend: https://frontend-xxxxx.up.railway.app
Backend: https://backend-xxxxx.up.railway.app
```

These are publicly accessible immediately after deploy! ✓

---

## Success Indicators
- [ ] Backend service shows green "Running"
- [ ] Frontend service shows green "Running"
- [ ] No errors in "Build Logs"
- [ ] Login page loads
- [ ] Can login with test account
- [ ] Can create a trade

**If all check: Deployment complete! 🎉**

---

## Need Help?
- **Step-by-step guide:** `RAILWAY_DEPLOYMENT_STEPS.md`
- **Detailed config:** `RAILWAY_DEPLOYMENT.md`
- **Full checklist:** `RAILWAY_DEPLOYMENT_CHECKLIST.md`
- **Railway docs:** https://docs.railway.app

---

## One More Thing
After login works, consider:
- [ ] Add PostgreSQL for persistent database (click "New" → Database → PostgreSQL)
- [ ] Set custom domain (Project → Domain settings)
- [ ] Create admin user via login
- [ ] Enable monitoring/logs

**That's it! Happy deploying! 🚀**
