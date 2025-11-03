# 🚀 Complete Deployment Guide - TKD Project

This guide will walk you through deploying your Taekwondo web system to production step-by-step.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Set Up MongoDB Atlas](#step-1-set-up-mongodb-atlas)
3. [Step 2: Prepare Your Code](#step-2-prepare-your-code)
4. [Step 3: Deploy Backend to Render](#step-3-deploy-backend-to-render)
5. [Step 4: Deploy Frontend to Render](#step-4-deploy-frontend-to-render)
6. [Step 5: Update Frontend API URLs](#step-5-update-frontend-api-urls)
7. [Step 6: Test Your Deployment](#step-6-test-your-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, make sure you have:
- ✅ A GitHub account
- ✅ A Render account (sign up at [render.com](https://render.com) - free tier available)
- ✅ A MongoDB Atlas account (sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas) - free tier available)

---

## Step 1: Set Up MongoDB Atlas

### 1.1 Create MongoDB Atlas Account
1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"** or **"Sign Up"**
3. Fill in your details and create an account

### 1.2 Create a Cluster
1. After logging in, click **"Build a Database"**
2. Choose **"M0 Free"** tier (Free Forever)
3. Select a cloud provider and region (choose closest to your users)
4. Click **"Create"** (takes 1-3 minutes)

### 1.3 Create Database User
1. In the **"Database Access"** section (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter a username (e.g., `tkd-admin`)
5. Enter a strong password (save this!)
6. Set user privileges to **"Atlas Admin"**
7. Click **"Add User"**

### 1.4 Configure Network Access
1. In the **"Network Access"** section (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for Render deployment)
   - This adds `0.0.0.0/0` to your whitelist
4. Click **"Confirm"**

### 1.5 Get Connection String
1. Go to **"Database"** section (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
5. Replace `<password>` with your database user password
6. Replace the `?retryWrites=true&w=majority` part with `/prototype-tkd?retryWrites=true&w=majority`
   - Final string: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/prototype-tkd?retryWrites=true&w=majority`
7. **Save this connection string** - you'll need it in Step 3!

---

## Step 2: Prepare Your Code

### 2.1 Push Code to GitHub
1. Make sure all your code is committed:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```
   (Replace `main` with your branch name if different)

### 2.2 Verify Key Files Exist
Make sure these files exist in your repository:
- ✅ `package.json`
- ✅ `backend/app.js`
- ✅ `Procfile`
- ✅ `frontend/` folder with all HTML/CSS/JS files

---

## Step 3: Deploy Backend to Render

### 3.1 Create New Web Service
1. Go to [https://render.com](https://render.com)
2. Sign up or log in with your GitHub account
3. Click **"New +"** → **"Web Service"**

### 3.2 Connect Repository
1. If this is your first time:
   - Click **"Connect account"** next to GitHub
   - Authorize Render to access your repositories
2. Find your repository (e.g., `Prototype-TKD`)
3. Click **"Connect"**

### 3.3 Configure Backend Service
Fill in the following settings:

- **Name**: `prototype-tkd-backend` (or your preferred name)
- **Region**: Choose closest to your users (e.g., Singapore, US East)
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (or upgrade if needed)

### 3.4 Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"** and add:

1. **NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`

2. **MONGODB_URI**
   - Key: `MONGODB_URI`
   - Value: Paste the connection string from Step 1.5
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/prototype-tkd?retryWrites=true&w=majority`

3. **SESSION_SECRET**
   - Key: `SESSION_SECRET`
   - Value: Generate a random string (e.g., use: https://randomkeygen.com/)
   - Minimum 32 characters recommended

4. **PORT** (Optional - Render sets this automatically)
   - Key: `PORT`
   - Value: `4000`

5. **USE_HTTPS** (For production)
   - Key: `USE_HTTPS`
   - Value: `true`

### 3.5 Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (usually 2-5 minutes)
3. You'll see build logs - wait for: **"Your service is live"**
4. **Copy your backend URL** (e.g., `https://prototype-tkd-backend.onrender.com`)
   - You'll need this in Step 5!

### 3.6 Test Backend
1. Visit: `https://your-backend-url.onrender.com/api/health`
2. You should see: `{"status":"OK","timestamp":"...","uptime":...}`
3. If you see an error, check the logs in Render dashboard

---

## Step 4: Deploy Frontend to Render

### 4.1 Create Static Site
1. In Render dashboard, click **"New +"** → **"Static Site"**

### 4.2 Connect Repository
1. Connect the same GitHub repository
2. Click **"Connect"**

### 4.3 Configure Frontend Service
Fill in the following:

- **Name**: `prototype-tkd-frontend` (or your preferred name)
- **Region**: Same as backend (or closest to users)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `frontend`
- **Build Command**: Leave empty (no build needed)
- **Publish Directory**: `frontend`

### 4.4 Deploy
1. Click **"Create Static Site"**
2. Wait for deployment (usually 1-2 minutes)
3. **Copy your frontend URL** (e.g., `https://prototype-tkd-frontend.onrender.com`)
   - You'll need this in Step 5!

---

## Step 5: Update Frontend API URLs

### 5.1 Update Backend URL
The frontend automatically detects production vs local, but you may want to verify:

1. Open `frontend/js/main.js`
2. Find the `getApiBase()` function (around line 3)
3. Verify it returns your backend URL in production:
   ```javascript
   // Should automatically detect production, but verify:
   return 'https://prototype-tkd-backend.onrender.com/api';
   ```

### 5.2 Update Socket.io URL
1. In the same file, find `getSocketUrl()` function
2. Verify it returns your backend URL (without `/api`):
   ```javascript
   return 'https://prototype-tkd-backend.onrender.com';
   ```

### 5.3 Commit and Push Changes
```bash
git add frontend/js/main.js
git commit -m "Update production API URLs"
git push origin main
```

### 5.4 Wait for Automatic Redeploy
- Render will automatically detect the push and redeploy
- Wait 1-2 minutes for the new deployment

---

## Step 6: Test Your Deployment

### 6.1 Test Frontend
1. Visit your frontend URL: `https://prototype-tkd-frontend.onrender.com`
2. You should see the homepage

### 6.2 Test Login
1. Go to login page
2. Use default admin credentials:
   - **Username**: `aldrin`
   - **Password**: `aldrin`
   - (If admin doesn't exist, see Troubleshooting section)

### 6.3 Test Features
Test these features to ensure everything works:
- ✅ Login/Logout
- ✅ View dashboard
- ✅ Add/Edit/Delete players
- ✅ Filter players by team
- ✅ Add/Edit accounts
- ✅ Export Excel

### 6.4 Test Real-time Updates
1. Open dashboard in two browser windows
2. Make a change in one window
3. Verify it updates in the other window (real-time feature)

---

## Troubleshooting

### ❌ Backend Won't Start

**Problem**: Backend shows error in logs

**Solutions**:
1. Check MongoDB connection string format
2. Verify all environment variables are set correctly
3. Check Render logs: Dashboard → Your Service → Logs
4. Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0`

### ❌ CORS Errors

**Problem**: Browser console shows CORS errors

**Solutions**:
1. Verify backend CORS settings in `backend/app.js` allow your frontend URL
2. Current code should allow all Render domains automatically
3. Check that `credentials: true` is set in CORS config

### ❌ Can't Login / 401 Errors

**Problem**: Login fails or shows "Unauthorized"

**Solutions**:
1. Admin user may not exist - Create it:
   ```bash
   # SSH into Render shell (if available) or use local script:
   node backend/create-admin.js
   ```
2. Or create admin via API:
   - First, temporarily allow admin creation
   - Or manually insert into MongoDB

### ❌ Database Connection Fails

**Problem**: "MongoServerError: bad auth" or connection timeout

**Solutions**:
1. Verify MongoDB username/password in connection string
2. Check MongoDB Atlas Network Access whitelist
3. Ensure connection string includes database name: `/prototype-tkd?`
4. Test connection string in MongoDB Compass

### ❌ Frontend Shows Blank Page

**Problem**: Frontend loads but shows nothing

**Solutions**:
1. Open browser console (F12) and check for errors
2. Verify API calls are going to correct backend URL
3. Check that all file paths are relative (not absolute)
4. Verify frontend files are in `frontend/` directory

### ❌ Real-time Updates Not Working

**Problem**: Socket.io not connecting

**Solutions**:
1. Check Socket.io URL in `frontend/js/main.js`
2. Verify backend Socket.io CORS settings
3. Check browser console for Socket.io errors
4. Ensure both frontend and backend are using HTTPS

### ❌ Session/Cookie Issues

**Problem**: Logged out after refresh

**Solutions**:
1. Ensure `USE_HTTPS=true` environment variable is set
2. Verify cookie settings in `backend/app.js`:
   ```javascript
   sameSite: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true' ? 'none' : 'lax',
   secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true'
   ```
3. Check that frontend and backend are on same domain or configured for cross-domain cookies

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] Strong `SESSION_SECRET` (32+ characters, random)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] All environment variables set (no defaults in code)
- [ ] HTTPS enabled (automatic on Render)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (already in code)
- [ ] Input validation enabled (already in code)

---

## 📝 Quick Reference

### Your URLs
- **Backend**: `https://prototype-tkd-backend.onrender.com`
- **Frontend**: `https://prototype-tkd-frontend.onrender.com`
- **Health Check**: `https://prototype-tkd-backend.onrender.com/api/health`

### Important Files
- `backend/app.js` - Main backend server
- `frontend/js/main.js` - Frontend API configuration
- `package.json` - Dependencies
- `Procfile` - Start command for Render
- `.env` - Environment variables (create in Render dashboard, not in repo!)

### Useful Commands
```bash
# Local development
npm run dev

# Production start
npm start

# Create admin user locally
node backend/create-admin.js
```

---

## 🆘 Need Help?

1. **Check Render Logs**: Dashboard → Service → Logs
2. **Check Browser Console**: F12 → Console tab
3. **Check Network Tab**: F12 → Network tab (see API calls)
4. **Render Support**: https://render.com/docs
5. **MongoDB Atlas Support**: https://docs.atlas.mongodb.com

---

## ✅ Deployment Complete!

Once everything is working:
- ✅ Share your frontend URL with users
- ✅ Set up proper admin account
- ✅ Test all features
- ✅ Monitor logs for any issues
- ✅ Set up regular backups (MongoDB Atlas has automatic backups on paid plans)

**Congratulations! Your TKD system is now live! 🎉**

