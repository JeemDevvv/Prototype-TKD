const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { generalLimiter } = require('./middleware/rateLimiter');
const { securityLogger } = require('./middleware/securityLogger');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all localhost and 127.0.0.1 origins
      if (!origin || /^http:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else if (/^https:\/\/.*\.(onrender|railway|vercel|netlify)\.(com|app)$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now
      }
    },
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);


app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS origin check:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('No origin - allowing');
      return callback(null, true);
    }
    
    // Allow localhost for development (any port, including Live Server ports like 5500)
    const allowedLocal = /^http:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?$/;
    if (allowedLocal.test(origin)) {
      console.log('Localhost origin - allowing:', origin);
      return callback(null, true);
    }
    
    // Also allow common development server ports explicitly
    if (origin && (origin.includes('127.0.0.1') || origin.includes('localhost'))) {
      console.log('Local development origin detected - allowing:', origin);
      return callback(null, true);
    }
    
    // Allow ALL Render domains for production
    const allowedRender = /^https:\/\/.*\.onrender\.com$/;
    if (allowedRender.test(origin)) {
      console.log('Render origin - allowing:', origin);
      return callback(null, true);
    }
    
    // Allow Railway domains for production
    const allowedRailway = /^https:\/\/.*\.railway\.app$/;
    if (allowedRailway.test(origin)) {
      console.log('Railway origin - allowing:', origin);
      return callback(null, true);
    }
    
    // Allow Vercel domains for production
    const allowedVercel = /^https:\/\/.*\.vercel\.app$/;
    if (allowedVercel.test(origin)) {
      console.log('Vercel origin - allowing:', origin);
      return callback(null, true);
    }
    
    // Allow Netlify domains for production
    const allowedNetlify = /^https:\/\/.*\.netlify\.app$/;
    if (allowedNetlify.test(origin)) {
      console.log('Netlify origin - allowing:', origin);
      return callback(null, true);
    }
    
    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode - allowing all origins');
      return callback(null, true);
    }
    
    console.log('Origin not allowed:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests
app.options('*', (req, res) => {
  console.log('OPTIONS preflight request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

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
    touchAfter: 24 * 3600, // lazy session update
    ttl: 24 * 60 * 60, // 24 hours in seconds
    autoRemove: 'native'
  }),
  cookie: {
    // Use 'lax' and 'false' for localhost HTTP, 'none' and 'true' only for actual HTTPS production
    sameSite: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true', // true only for actual HTTPS production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    path: '/' // Ensure cookie is available for all paths
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
// Listen on all interfaces (0.0.0.0) to accept connections from both localhost and 127.0.0.1
// Only use server.listen() since app is already attached to the server
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`)); 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 