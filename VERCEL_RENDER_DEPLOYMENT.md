# Deploy to Vercel (Frontend) + Render (Backend)

## 🚀 Quick Deploy Guide

### 1️⃣ Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will read `render.yaml` and create the service automatically
5. **Important:** After deploy, note your backend URL (e.g., `https://krimson-backend.onrender.com`)
6. Go to **Environment Variables** in Render dashboard and update:
   - `ALLOWED_ORIGINS` = Your Vercel URL (you'll get this after step 2)

### 2️⃣ Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Root Directory**: `./` (default)
5. Add **Environment Variable**:
   - `VITE_API_URL` = `https://your-render-backend.onrender.com`
6. Click **Deploy**
7. After deploy, copy your Vercel URL (e.g., `https://krimson-frontend.vercel.app`)
8. Update Render backend's `ALLOWED_ORIGINS` with your Vercel URL

---

## 📁 Configuration Files Created

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel deployment config |
| `render.yaml` | Render blueprint config |

---

## 🔧 Environment Variables

### Backend (Render)

| Variable | Value | Notes |
|----------|-------|-------|
| `AUTH_SECRET` | Auto-generated | Keep secret! |
| `NODE_ENV` | `production` | ✅ Pre-configured |
| `PORT` | `10000` | Render default |
| `SERVER_HOST` | `0.0.0.0` | ✅ Pre-configured |
| `USE_HTTPS` | `false` | ✅ Pre-configured |
| `DATABASE_URL` | `file:./dev.db` | ✅ Pre-configured |
| `ALLOWED_ORIGINS` | Your Vercel URL | Set after Vercel deploy |

### Frontend (Vercel)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` | Your Render backend URL |

---

## 🔗 Test Your Deployment

**Backend Health Check:**
```bash
curl https://your-backend.onrender.com/api/trades/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Test Login:**
- Frontend URL: `https://your-frontend.vercel.app`
- Login with: `trader@example.com` / `TraderPass123!`

---

## 🔄 Updating After Deploy

### Frontend Changes
- Push to GitHub → Vercel auto-deploys

### Backend Changes
- Push to GitHub → Render auto-deploys
- Database persists in ephemeral storage (resets on redeploy)

### Using PostgreSQL (Recommended)
In Render dashboard:
1. Add **PostgreSQL** service
2. Copy the `DATABASE_URL`
3. Update backend environment variable

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Update `ALLOWED_ORIGINS` in Render with exact Vercel URL |
| 404 on refresh | `vercel.json` handles SPA routing - should work |
| Build fails | Check build logs in Vercel/Render dashboards |
| Can't connect | Ensure `VITE_API_URL` has no trailing slash |
| Database resets | Use PostgreSQL instead of SQLite |

---

## 🎉 Done!

Your app will be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
- **API**: `https://your-backend.onrender.com/api/...`
