# Deploy KRIMSON Trading Terminal to Railway.app - Step by Step

## 🚀 Quick Start (5 minutes)

### Prerequisites
- GitHub account (with your repo pushed)
- Railway account at https://railway.app (sign up free)
- About 5-10 minutes

---

## Step 1: Generate AUTH_SECRET

Railway needs a strong secret. Generate one:

**On Windows PowerShell:**
```powershell
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
$secret | Set-Clipboard
Write-Host "Secret copied to clipboard: $secret"
```

**On Mac/Linux:**
```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

Save this value - you'll need it for Railway.

---

## Step 2: Push to GitHub

Make sure your code is on GitHub:
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## Step 3: Create Railway Project

1. Go to **https://railway.app**
2. Sign in or create account
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Click **"Configure GitHub App"** if needed
6. Select your **untitled1** repository
7. Click **"Deploy Now"**

Railway will create an initial service - we'll configure it next.

---

## Step 4: Configure Backend Service

Railway just created a service. Let's configure it as the backend:

### In Railway Dashboard:

1. **Project Settings** (gear icon)
   - Name the service `backend`
   - Set "Root Directory" to `backend` ✓

2. **Settings Tab** → **Deployment**
   - Build Command:
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - Start Command:
     ```
     npm start
     ```
   - Save ✓

3. **Variables Tab** → Add these environment variables:
   ```
   AUTH_SECRET = [paste your generated secret]
   NODE_ENV = production
   USE_HTTPS = false
   SERVER_HOST = 0.0.0.0
   ALLOWED_ORIGINS = *
   SESSION_TIMEOUT_SECONDS = 1800
   DATABASE_URL = file:./dev.db
   ```

   **OR** if using PostgreSQL:
   - Add PostgreSQL service (see Step 5)
   - Set `DATABASE_URL` to Railway's auto-generated value

4. **Click Deploy** button in top right

---

## Step 5: (Optional) Add PostgreSQL Database

For production, PostgreSQL is better than SQLite:

1. In your Railway project, click **"New"** (bottom left)
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for PostgreSQL to provision
4. Go back to **backend** service
5. In **Variables** tab, you'll see `DATABASE_URL` auto-populated ✓
6. Click **Deploy** again

---

## Step 6: Get Backend URL

Once backend is deployed:

1. Click on **backend** service
2. Click **"Settings"** tab
3. Copy the **Public URL** (looks like: `backend-production.up.railway.app`)
4. Note it down - you'll use it for frontend ✓

---

## Step 7: Add Frontend Service

1. Click **"New"** button (bottom left)
2. Select **"GitHub Repo"**
3. Select your **untitled1** repo again
4. Click **"Add"**

### Configure Frontend:

1. **Settings** → **Deployment**
   - Build Command:
     ```
     npm install && npm run build
     ```
   - Start Command:
     ```
     npm run preview
     ```
   - Save ✓

2. **Variables** tab → Add:
   ```
   VITE_API_URL = https://backend-production.up.railway.app
   VITE_HOST = 0.0.0.0
   NODE_ENV = production
   ```
   
   Replace `backend-production.up.railway.app` with your actual backend URL from Step 6 ✓

3. **Click Deploy**

---

## Step 8: Get Frontend URL

Once frontend is deployed:

1. Click on **frontend** service
2. Click **"Settings"** tab
3. Copy the **Public URL** (looks like: `frontend-production.up.railway.app`)
4. Visit it in your browser! ✓

---

## Step 9: Test the Application

1. Open your **frontend URL** (from Step 8)
2. You should see the **KRIMSON login page**
3. Login with test account:
   ```
   Email: trader@example.com
   Password: TraderPass123!
   ```
4. Try these features:
   - ✅ Create a new trade
   - ✅ View trades table
   - ✅ Send chat message
   - ✅ Check stats
   - ✅ (Admin) View audit logs

**If login works, deployment is successful!** 🎉

---

## Troubleshooting

### Build Fails
**In Railway Dashboard:**
1. Click failed service
2. Click **"Build Logs"** tab
3. Read the error message
4. Common fixes:
   - Missing `node_modules` → check build command includes `npm install`
   - Missing Prisma → check build includes `npx prisma generate`
   - Wrong root directory → verify "Root Directory" is set correctly

### Login Doesn't Work
1. Check backend URL in frontend environment variables
2. Test the backend directly:
   ```bash
   curl https://backend-production.up.railway.app/api/auth/login
   # Should return some response (not 404)
   ```
3. Check frontend logs: Click frontend service → Logs tab

### Frontend Shows 404
1. Check start command is `npm run preview`
2. Check build command includes `npm run build`
3. Rebuild: Click "Deploy" again

### Database Connection Error
1. If using PostgreSQL, verify `DATABASE_URL` is set
2. Try clicking service → **"Reset Database"** (careful!)
3. If using SQLite, data persists during same deployment but resets on redeploy
4. For persistent SQLite: Add Railway Volume (advanced)

---

## Environment Variables Checklist

### Backend Service Must Have:
- [ ] `AUTH_SECRET` - Strong random value
- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` - Set correctly
- [ ] `SERVER_HOST` = `0.0.0.0`
- [ ] `ALLOWED_ORIGINS` = `*` or your frontend URL

### Frontend Service Must Have:
- [ ] `VITE_API_URL` - Points to backend
- [ ] `NODE_ENV` = `production`

---

## Monitoring After Deployment

### View Logs
1. Click service → **"Logs"** tab
2. See real-time output as users interact
3. Errors will show here

### Restart Service
1. Click service → **Settings**
2. Click **"Restart"** button
3. Service will redeploy

### Redeploy After Changes
1. Push changes to GitHub
2. Railway will auto-deploy (if enabled)
3. Or click **"Deploy"** button manually

---

## Custom Domain (Optional)

Railway allows custom domains:

1. Click **project name** (top)
2. Click **"Domain"** tab
3. Add your custom domain (e.g., `trading.example.com`)
4. Follow DNS instructions
5. Railway will auto-generate HTTPS cert (via Let's Encrypt)

---

## Database Access

### PostgreSQL
If using Railway PostgreSQL:
1. Click **postgres** service
2. Click **"Connect"** tab
3. Copy connection string
4. Use with tools like pgAdmin or DBeaver

### SQLite
Data is stored in `dev.db` on the Railway filesystem.
Current data resets when you redeploy (unless you add a Volume).

To make SQLite persistent:
1. Click **backend** service
2. **Settings** → **"Volumes"**
3. Add volume pointing to `/app/backend/`
4. Saves database between deploys

---

## Security Considerations

### Before Going Live:
- [ ] Change `ALLOWED_ORIGINS` from `*` to your frontend domain
- [ ] Use strong `AUTH_SECRET` (generated with openssl)
- [ ] Use PostgreSQL for production database
- [ ] Set up email for password recovery (add SMTP vars)
- [ ] Enable custom domain with HTTPS
- [ ] Review audit logs regularly

### Production Checklist:
- [ ] Database backups configured
- [ ] Error logging set up
- [ ] Monitor costs (Railway has free tier)
- [ ] Load testing done
- [ ] Admin users created in database

---

## Cost Estimate

**Free Tier (Usually enough):**
- 5 GB RAM (shared)
- 100 GB bandwidth
- One database
- Multiple services

**Paid Tier:**
- $5/month per service (backend/frontend)
- $12/month PostgreSQL
- Hourly billing

---

## Next Steps After Deployment

1. **Share your URL** with team/users
2. **Monitor logs** for errors
3. **Create admin user** via login endpoint (or seed database)
4. **Configure email** for password recovery
5. **Set custom domain** for professional appearance
6. **Enable backups** for database

---

## Helpful Commands

**Check if backend is responding:**
```bash
curl https://your-backend-railway.up.railway.app/api/auth/login
# Should return some response
```

**Check if frontend loads:**
```bash
curl https://your-frontend-railway.up.railway.app
# Should return HTML
```

**View Railway CLI logs:**
```bash
railway login
railway link  # Select your project
railway logs -s backend
railway logs -s frontend
```

---

## Questions?

**Railway Docs**: https://docs.railway.app  
**Your Project Dashboard**: https://railway.app/dashboard  

---

## ✅ You're Live!

Once everything is working:
- **Frontend**: https://your-frontend.up.railway.app
- **Backend API**: https://your-backend.up.railway.app
- **Database**: Running and ready
- **Users**: Can login and trade in real-time

**Congratulations! 🎉 Your application is deployed!**
