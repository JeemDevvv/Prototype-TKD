# 🚀 Deployment Guide - TKD Project

## Prerequisites
- GitHub account
- Render account (free at render.com)
- MongoDB Atlas account (free at mongodb.com/atlas)

## Step 1: Prepare Your Project

### 1.1 Create Environment Variables
Create a `.env` file in the `backend` folder with:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tkd-database
SESSION_SECRET=your-super-secret-session-key-here
PORT=4000
```

### 1.2 Update CORS Settings
The current CORS settings only allow localhost. For production, update `backend/app.js`:

```javascript
app.use(cors({
  origin: [
    'https://your-frontend-url.onrender.com',
    'http://localhost:3000', // Keep for local development
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));
```

## Step 2: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Create a database user
5. Get your connection string
6. Replace `<password>` with your actual password
7. Replace `<dbname>` with `tkd-database`

## Step 3: Deploy to Render

### 3.1 Backend Deployment
1. Go to [Render](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `tkd-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: Leave empty (uses root)

### 3.2 Environment Variables
Add these in Render dashboard:
- `NODE_ENV`: `production`
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `SESSION_SECRET`: A random secret string

### 3.3 Frontend Deployment
1. In Render, click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `tkd-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: Leave empty
   - **Publish Directory**: `frontend`

### 3.4 Update Frontend API URLs
Update `frontend/js/main.js`:
```javascript
// Change this line:
const API_BASE = 'http://localhost:4000/api';

// To this (replace with your actual backend URL):
const API_BASE = 'https://tkd-backend.onrender.com/api';
```

## Step 4: Create Admin User

After deployment, you'll need to create the admin user. You can do this by:

1. Accessing your backend URL: `https://tkd-backend.onrender.com`
2. Running the create-admin script (if you have one)
3. Or manually creating the admin user through the API

## Step 5: Test Your Deployment

1. Visit your frontend URL
2. Try logging in with admin credentials
3. Test all features (add players, view dashboard, etc.)

## Alternative: Railway Deployment

If you prefer Railway:

1. Go to [Railway](https://railway.app)
2. Connect GitHub
3. Deploy from repository
4. Add MongoDB service
5. Set environment variables

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Update CORS settings to include your frontend URL
2. **Database Connection**: Check MongoDB Atlas IP whitelist
3. **Environment Variables**: Ensure all required variables are set
4. **Build Errors**: Check that all dependencies are in package.json

### Logs:
- Check Render logs for backend issues
- Check browser console for frontend issues

## Security Notes

1. Use strong session secrets
2. Enable MongoDB Atlas IP whitelisting
3. Use HTTPS in production
4. Regularly update dependencies

## Cost

- **Render**: Free tier available
- **MongoDB Atlas**: Free tier available (512MB)
- **Total**: $0/month for small projects

---

Need help? Check the logs in your Render dashboard or contact support.

