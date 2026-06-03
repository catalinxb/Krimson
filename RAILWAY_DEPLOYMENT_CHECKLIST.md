# Railway Deployment Checklist

## Pre-Deployment (Do Before Railway Setup)

- [ ] All code committed and pushed to GitHub
- [ ] `.env.production` file created
- [ ] `AUTH_SECRET` generated (save in secure location)
- [ ] Backend port configuration reads `process.env.PORT`
- [ ] Frontend environment variables use `VITE_API_URL`
- [ ] No hardcoded localhost URLs in production code
- [ ] All tests passing locally
- [ ] `.gitignore` includes sensitive files

## Railway Dashboard Setup

### Backend Service
- [ ] Service name set to `backend`
- [ ] Root Directory set to `backend`
- [ ] Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
- [ ] Start command: `npm start`
- [ ] Public URL generated (note it down)

### Backend Environment Variables
- [ ] `AUTH_SECRET` = [strong random value]
- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` = set correctly
- [ ] `USE_HTTPS` = `false`
- [ ] `SERVER_HOST` = `0.0.0.0`
- [ ] `ALLOWED_ORIGINS` = `*`
- [ ] `SESSION_TIMEOUT_SECONDS` = `1800`
- [ ] Backend deployed successfully

### Frontend Service
- [ ] Service name set to `frontend`
- [ ] Root Directory set to `.` (root)
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm run preview`
- [ ] Public URL generated (note it down)

### Frontend Environment Variables
- [ ] `VITE_API_URL` = [backend URL from above]
- [ ] `NODE_ENV` = `production`
- [ ] Frontend deployed successfully

### Database (Choose One)

#### Option A: SQLite (Simpler)
- [ ] `DATABASE_URL` = `file:./dev.db`
- [ ] Data persists during deployment
- [ ] Note: Data resets on new deployment (unless volumes added)

#### Option B: PostgreSQL (Recommended for Production)
- [ ] PostgreSQL service created in Railway
- [ ] `DATABASE_URL` auto-populated from Railway
- [ ] Persistent storage across deployments
- [ ] Backups available

## Deployment Verification

### Backend Tests
- [ ] Backend service shows "Running" status
- [ ] Check logs: No errors in "Build Logs"
- [ ] Test endpoint:
  ```bash
  curl https://[backend-url]/api/auth/login
  # Should return some response
  ```

### Frontend Tests
- [ ] Frontend service shows "Running" status
- [ ] Check logs: No errors in "Build Logs"
- [ ] Visit frontend URL in browser
- [ ] Login page loads successfully

### Application Tests
- [ ] Can access login page
- [ ] Can login with test credentials:
  - Email: `trader@example.com`
  - Password: `TraderPass123!`
- [ ] Can create a new trade
- [ ] Can view trades in table
- [ ] Can send chat message
- [ ] Can logout
- [ ] Session timeout works
- [ ] (Admin) Can view audit logs

## Post-Deployment

### Security
- [ ] Change `ALLOWED_ORIGINS` from `*` to specific frontend URL
- [ ] Review `AUTH_SECRET` is strong
- [ ] Test HTTPS connection works
- [ ] Verify no sensitive data in logs

### Monitoring
- [ ] Set up log monitoring
- [ ] Test error alerts (if configured)
- [ ] Check database connection status
- [ ] Monitor resource usage

### Database
- [ ] Seed test data if needed:
  ```bash
  npx prisma db seed
  ```
- [ ] Create production admin user
- [ ] Verify audit logging works
- [ ] Backup configuration (if using PostgreSQL)

### Features
- [ ] Password reset flow tested (if email configured)
- [ ] 2FA tested (if enabled)
- [ ] Permission system works (test as different roles)
- [ ] Chat works in real-time
- [ ] Trades persist after logout/login

## Domain & HTTPS (Optional)

- [ ] Custom domain added to Railway (if desired)
- [ ] HTTPS certificate auto-generated
- [ ] DNS records updated (CNAME)
- [ ] Domain resolves and works

## Documentation

- [ ] `RAILWAY_DEPLOYMENT_STEPS.md` added to repo
- [ ] `README.md` updated with deployment URLs
- [ ] `QUICK_START.md` updated with production URLs
- [ ] `.env.production` template created
- [ ] Team notified of production URLs

## Ongoing Maintenance

- [ ] Monitor application performance
- [ ] Review logs regularly
- [ ] Update dependencies monthly
- [ ] Test backup restoration (for PostgreSQL)
- [ ] Monitor costs on Railway dashboard
- [ ] Keep auth secret secure
- [ ] Update admin user list as needed

---

## Quick Troubleshooting

If build fails:
1. Check "Build Logs" tab for error message
2. Verify root directory is correct
3. Ensure build command is correct
4. Check environment variables are set

If login doesn't work:
1. Verify `VITE_API_URL` points to backend
2. Test backend directly via curl
3. Check frontend logs for errors
4. Verify CORS is configured correctly

If database fails:
1. Check `DATABASE_URL` is set
2. Verify database service is running
3. Check migrations ran successfully
4. For PostgreSQL, verify connection

---

## Rollback Procedure

If deployment has issues:

1. Click service → **Settings**
2. Click **"Rollback"** 
3. Select previous deployment
4. Click **"Deploy"**
5. Service reverts to previous working version

---

## Success Indicators ✅

- [x] Both services show "Running"
- [x] No errors in recent logs
- [x] Frontend URL loads login page
- [x] Can login with test account
- [x] Backend API responds correctly
- [x] Database has test data
- [x] Real-time features work (chat)

**Deployment successful! 🎉**

---

## Performance Notes

- Build time: ~2-5 minutes
- Deployment time: ~1-2 minutes
- First response may be slow (cold start)
- After warm: Very fast responses

## Support

- Railway Documentation: https://docs.railway.app
- GitHub Issues: Report bugs with details
- Check logs first before asking for help

---

## Additional Resources

- **RAILWAY_DEPLOYMENT.md** - Configuration details
- **RAILWAY_DEPLOYMENT_STEPS.md** - Step-by-step guide
- **QUICK_START.md** - Local testing
- **DEPLOYMENT_GUIDE.md** - General deployment info
