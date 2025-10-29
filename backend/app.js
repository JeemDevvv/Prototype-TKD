const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const { generalLimiter } = require('./middleware/rateLimiter');
const { securityLogger } = require('./middleware/securityLogger');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();


app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    const allowedLocal = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;
    if (allowedLocal.test(origin)) return callback(null, true);
    
    // Allow Render domains for production
    const allowedRender = /^https:\/\/.*\.onrender\.com$/;
    if (allowedRender.test(origin)) return callback(null, true);
    
    // Allow Railway domains for production
    const allowedRailway = /^https:\/\/.*\.railway\.app$/;
    if (allowedRailway.test(origin)) return callback(null, true);
    
    // Allow Vercel domains for production
    const allowedVercel = /^https:\/\/.*\.vercel\.app$/;
    if (allowedVercel.test(origin)) return callback(null, true);
    
    // Allow Netlify domains for production
    const allowedNetlify = /^https:\/\/.*\.netlify\.app$/;
    if (allowedNetlify.test(origin)) return callback(null, true);
    
    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Security middleware
app.use(securityLogger);
app.use(generalLimiter);

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware (after CORS)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    sameSite: 'lax', // allow cross-origin for localhost
    secure: false,    // only false for HTTP (localhost)
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// MongoDB connection
if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in backend/.env. Example: mongodb://127.0.0.1:27017/prototype-tkd');
  process.exit(1);
}

// Import models for admin creation
const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB connected');
  
  // Create default admin if none exists
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultUsername = 'aldrin';
      const defaultPassword = 'aldrin';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const defaultAdmin = new Admin({
        username: defaultUsername,
        password: hashedPassword
      });
      await defaultAdmin.save();
      console.log(`Default admin created: username="${defaultUsername}", password="${defaultPassword}"`);
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
})
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/player', require('./routes/player'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/activity', require('./routes/activityLog'));

// Default route
app.get('/', (req, res) => {
  res.send('Arise Taekwonders API running');
});

// Health check endpoint for deployment monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 