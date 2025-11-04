const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Coach = require('../models/Coach');
const AssistantCoach = require('../models/AssistantCoach');
const bcrypt = require('bcrypt');
const { authLimiter } = require('../middleware/rateLimiter');
const { sanitizeInput, validateRequired } = require('../middleware/validation');
const { logAuthEvent, logSuspiciousActivity } = require('../middleware/securityLogger');
router.get('/login1', (req, res) => {
  res.status(200).json({ message: 'Login endpoint is available. Please use POST method for authentication.' });
});

router.post('/login1', 
  authLimiter,
  sanitizeInput,
  validateRequired(['username', 'password']),
  async (req, res) => {
  const { username, password, role } = req.body;
  let user = null;
  let resolvedRole = null;

  try {
      logAuthEvent('LOGIN_ATTEMPT', req, { username, role });

    if (role === 'admin') {
      user = await Admin.findOne({ username });
      resolvedRole = 'admin';
    } else if (role === 'coach') {
      user = await Coach.findOne({ username });
      resolvedRole = 'coach';
    } else if (role === 'assistant') {
      user = await AssistantCoach.findOne({ username });
      resolvedRole = 'assistant';
    } else {
      user = await Admin.findOne({ username }) || await Coach.findOne({ username }) || await AssistantCoach.findOne({ username });
        if (!user) {
          logSuspiciousActivity('FAILED_LOGIN_UNKNOWN_ROLE', req, { username, role });
          return res.status(401).json({ message: 'Invalid Credentials' });
        }
      
      resolvedRole = user instanceof Admin ? 'admin' : (user instanceof Coach ? 'coach' : 'assistant');
    }

      if (!user) {
        logSuspiciousActivity('FAILED_LOGIN_USER_NOT_FOUND', req, { username, role });
        return res.status(401).json({ message: 'Invalid Credentials' });
      }

    const match = await bcrypt.compare(password, user.password);
      if (!match) {
        logSuspiciousActivity('FAILED_LOGIN_WRONG_PASSWORD', req, { username, role });
        return res.status(401).json({ message: 'Invalid Credentials' });
      }

    req.session.userId = user._id;
    req.session.role = resolvedRole;
      req.session.createdAt = Date.now();
      req.session.userStatus = 'active';

      logAuthEvent('LOGIN_SUCCESS', req, { username, role, userId: user._id });

    res.json({ message: 'Login successful', role: resolvedRole });
  } catch (e) {
      logSuspiciousActivity('LOGIN_ERROR', req, { error: e.message, username, role });
    res.status(500).json({ message: 'Server error' });
    }
  }
);

router.get('/login', (req, res) => {
  res.status(200).json({ message: 'Login endpoint is available. Please use POST method for authentication.' });
});

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  let user = null;
  let resolvedRole = null;

  try {
    if (role === 'admin') {
      user = await Admin.findOne({ username });
      resolvedRole = 'admin';
    } else if (role === 'coach') {
      user = await Coach.findOne({ username });
      resolvedRole = 'coach';
    } else if (role === 'assistant') {
      user = await AssistantCoach.findOne({ username });
      resolvedRole = 'assistant';
    } else {
    
      user = await Admin.findOne({ username }) || await Coach.findOne({ username }) || await AssistantCoach.findOne({ username });
      if (!user) return res.status(401).json({ message: 'Invalid Credentials' });
      
      resolvedRole = user instanceof Admin ? 'admin' : (user instanceof Coach ? 'coach' : 'assistant');
    }

    if (!user) return res.status(401).json({ message: 'Invalid Credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid Credentials' });
    
    req.session.userId = user._id;
    req.session.role = resolvedRole;
    req.session.createdAt = Date.now();
    req.session.userStatus = 'active';
    
    if (resolvedRole === 'coach' || resolvedRole === 'assistant') {
      req.session.team = user.team || null;
    } else {
      req.session.team = null;
    }
    
    console.log('Session set:', {
      userId: req.session.userId,
      role: req.session.role,
      team: req.session.team,
      sessionId: req.sessionID
    });
    
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ message: 'Failed to save session' });
      }
      
      console.log('Session saved successfully, sending response');
    res.json({ message: 'Login successful', role: resolvedRole });
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    console.log('=== /me endpoint called ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('User ID:', req.session.userId);
    console.log('Role:', req.session.role);
    console.log('Session exists:', !!req.session);
    
    if (!req.session || !req.session.userId || !req.session.role) {
      console.log('No valid session found, returning 401');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    let user = null;
    const { userId, role } = req.session;

    if (role === 'admin') {
      user = await Admin.findById(userId).select('username');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        username: user.username,
        name: user.username,
        role: role,
        email: null
      });
    } else if (role === 'coach') {
      user = await Coach.findById(userId).select('username name email team');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        username: user.username,
        name: user.name || user.username,
        role: role,
        email: user.email || null,
        team: user.team || null
      });
    } else if (role === 'assistant') {
      user = await AssistantCoach.findById(userId).select('username name email team');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        username: user.username,
        name: user.name || user.username,
        role: role,
        email: user.email || null,
        team: user.team || null
      });
    }

    return res.status(400).json({ message: 'Invalid role' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;