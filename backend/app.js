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
      if (!origin || /^http:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else if (/^https:\/\/.*\.(onrender|railway|vercel|netlify)\.(com|app)$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); 
      }
    },
    credentials: true
  }
});

app.set('io', io);


app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS origin check:', origin);
    
    if (!origin) {
      console.log('No origin - allowing');
      return callback(null, true);
    }
    
    const allowedLocal = /^http:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?$/;
    if (allowedLocal.test(origin)) {
      console.log('Localhost origin - allowing:', origin);
      return callback(null, true);
    }
    
    if (origin && (origin.includes('127.0.0.1') || origin.includes('localhost'))) {
      console.log('Local development origin detected - allowing:', origin);
      return callback(null, true);
    }
    
    const allowedRender = /^https:\/\/.*\.onrender\.com$/;
    if (allowedRender.test(origin)) {
      console.log('Render origin - allowing:', origin);
      return callback(null, true);
    }
    
    const allowedRailway = /^https:\/\/.*\.railway\.app$/;
    if (allowedRailway.test(origin)) {
      console.log('Railway origin - allowing:', origin);
      return callback(null, true);
    }
    
    const allowedVercel = /^https:\/\/.*\.vercel\.app$/;
    if (allowedVercel.test(origin)) {
      console.log('Vercel origin - allowing:', origin);
      return callback(null, true);
    }
    
    const allowedNetlify = /^https:\/\/.*\.netlify\.app$/;
    if (allowedNetlify.test(origin)) {
      console.log('Netlify origin - allowing:', origin);
      return callback(null, true);
    }
    
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

app.options('*', (req, res) => {
  console.log('OPTIONS preflight request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(securityLogger);
app.use(generalLimiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, 
    ttl: 24 * 60 * 60, 
    autoRemove: 'native'
  }),
  cookie: {
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000, 
    httpOnly: true,
    path: '/', 
    domain: undefined 
  }
}));

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in backend/.env. Example: mongodb://127.0.0.1:27017/prototype-tkd');
  process.exit(1);
}

const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB connected');
  
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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/player', require('./routes/player'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/activity', require('./routes/activityLog'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const FRONTEND_PAGES = path.join(FRONTEND_DIR, 'pages');

if (process.env.NODE_ENV !== 'production') {
  const fs = require('fs');
  console.log('Frontend directory:', FRONTEND_DIR);
  console.log('Frontend pages directory:', FRONTEND_PAGES);
  console.log('Frontend dir exists:', fs.existsSync(FRONTEND_DIR));
  console.log('Frontend pages exists:', fs.existsSync(FRONTEND_PAGES));
}

const setNoCacheHeaders = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

app.use('/css', setNoCacheHeaders, express.static(path.join(FRONTEND_DIR, 'css')));
app.use('/js', setNoCacheHeaders, express.static(path.join(FRONTEND_DIR, 'js')));
app.use('/public', express.static(path.join(FRONTEND_DIR, 'public')));

app.get('/', (req, res) => {
  const indexPath = path.join(FRONTEND_PAGES, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(FRONTEND_PAGES, 'dashboard.html'), (err) => {
    if (err) {
      console.error('Error sending dashboard.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get('/achievements', (req, res) => {
  res.sendFile(path.join(FRONTEND_PAGES, 'achievements.html'), (err) => {
    if (err) {
      console.error('Error sending achievements.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get('/players', (req, res) => {
  res.sendFile(path.join(FRONTEND_PAGES, 'player-profile.html'), (err) => {
    if (err) {
      console.error('Error sending player-profile.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get('/accounts', (req, res) => {
  res.sendFile(path.join(FRONTEND_PAGES, 'dashboard.html'), (err) => {
    if (err) {
      console.error('Error sending dashboard.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(FRONTEND_PAGES, 'dashboard.html'), (err) => {
    if (err) {
      console.error('Error sending dashboard.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(FRONTEND_PAGES, 'about.html'), (err) => {
    if (err) {
      console.error('Error sending about.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.get(['/index.html', '/dashboard.html', '/achievements.html', '/player-profile.html', '/about.html'], (req, res) => {
  const map = {
    '/index.html': '/',
    '/dashboard.html': '/dashboard',
    '/achievements.html': '/achievements',
    '/player-profile.html': '/players',
    '/about.html': '/about'
  };
  const redirectTo = map[req.path] || '/';
  res.redirect(301, redirectTo);
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/public/')) {
    return res.status(404).send('File not found');
  }
  res.redirect(302, '/');
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
