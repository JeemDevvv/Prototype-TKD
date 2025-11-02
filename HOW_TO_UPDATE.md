# 🔄 How to Update Your Website

Your website is deployed at: **https://prototype-tkd.onrender.com**

## Quick Steps to Update Your Site

### Option 1: Auto-Deploy (Recommended)
Simply push your changes to GitHub and Render will automatically redeploy:

1. **Make your changes locally**
   - Edit files in `frontend/` or `backend/`
   - Test locally with `npm run dev`

2. **Commit and push your changes**
   ```bash
   git add .
   git commit -m "Add new feature or fix bug"
   git push origin main
   ```

3. **Wait for deployment** (~2-5 minutes)
   - Render will automatically detect the push
   - Check status at: https://dashboard.render.com

4. **Your changes are live!**
   - New deployment replaces the old one
   - No downtime if changes are compatible

### Option 2: Pause/Restart Deployment
If you need to temporarily take the site offline:

1. **In Render Dashboard:**
   - Go to your service
   - Click "Pause" to stop the service
   - Make your changes
   - Click "Resume" to restart

### Option 3: Manual Deploy
If auto-deploy is disabled:

1. **In Render Dashboard:**
   - Go to your service
   - Click "Manual Deploy"
   - Select your branch
   - Click "Deploy"

## Making Changes

### Frontend Changes (HTML, CSS, JS)
```bash
# Edit files in frontend/
frontend/pages/index.html
frontend/css/styles.css
frontend/js/main.js
```

### Backend Changes (API, Routes)
```bash
# Edit files in backend/
backend/app.js
backend/routes/*.js
backend/models/*.js
```

### Database Changes
```bash
# Modify models in:
backend/models/*.js

# Create database scripts:
backend/create-admin.js
```

## Testing Before Deploy

1. **Run locally:**
   ```bash
   npm run dev
   ```

2. **Test at:** http://localhost:4000

3. **Check for errors in console**

## Important Notes

⚠️ **Environment Variables:**
- Don't commit `.env` files (they're in .gitignore)
- Update them in Render Dashboard → Environment tab

⚠️ **Database:**
- Changes to models will affect existing data
- Always backup before major schema changes

⚠️ **CORS Settings:**
- Current settings in `backend/app.js` allow Render domains
- Don't change CORS unless you know what you're doing

## Current Deployment Info

- **Repository:** https://github.com/JeemDevvv/Prototype-TKD
- **Backend URL:** https://prototype-tkd.onrender.com/api
- **Frontend:** Served from same domain
- **Database:** MongoDB Atlas

## Need Help?

- **Render Docs:** https://render.com/docs
- **Check Logs:** Render Dashboard → Logs tab
- **Health Check:** https://prototype-tkd.onrender.com/api/health

## Quick Commands Reference

```bash
# Start development server
npm run dev

# Install dependencies
npm install

# Check git status
git status

# View deployment history
git log --oneline

# Rollback (if needed)
git revert HEAD
git push origin main
```

---

**Remember:** You don't need to "undeploy" anything. Just push your changes and Render handles the rest! 🚀

