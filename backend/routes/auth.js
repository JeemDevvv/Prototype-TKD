const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Coach = require('../models/Coach');
const AssistantCoach = require('../models/AssistantCoach');
const bcrypt = require('bcrypt');

// Support GET requests for login1 endpoint
router.get('/login1', (req, res) => {
  res.status(200).json({ message: 'Login endpoint is available. Please use POST method for authentication.' });
});

// Handle typo in login endpoint
router.post('/login1', async (req, res) => {
  // Simply use the same login logic
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
    res.json({ message: 'Login successful', role: resolvedRole });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Support GET requests for login endpoint (for browser preflight/direct access)
router.get('/login', (req, res) => {
  res.status(200).json({ message: 'Login endpoint is available. Please use POST method for authentication.' });
});

// Admin/Coach login
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
    res.json({ message: 'Login successful', role: resolvedRole });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user session
router.get('/me', async (req, res) => {
  try {
    console.log('Session data:', req.session);
    console.log('User ID:', req.session.userId);
    console.log('Role:', req.session.role);
    
    if (!req.session.userId || !req.session.role) {
      console.log('No session found, returning 401');
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
        name: user.username, // Admin doesn't have name field, use username
        role: role,
        email: null
      });
    } else if (role === 'coach') {
      user = await Coach.findById(userId).select('username name email');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        username: user.username,
        name: user.name || user.username,
        role: role,
        email: user.email || null
      });
    } else if (role === 'assistant') {
      user = await AssistantCoach.findById(userId).select('username name email');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        username: user.username,
        name: user.name || user.username,
        role: role,
        email: user.email || null
      });
    }

    return res.status(400).json({ message: 'Invalid role' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;