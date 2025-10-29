const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Coach = require('../models/Coach');
const AssistantCoach = require('../models/AssistantCoach');
const bcrypt = require('bcrypt');

// Get all accounts
router.get('/', async (req, res) => {
  try {
    console.log('=== GET ACCOUNTS REQUEST ===');
    
    const admins = await Admin.find().select('username createdAt');
    const coaches = await Coach.find().select('username name email createdAt');
    const assistants = await AssistantCoach.find().select('username name email createdAt');

    console.log('Admins found:', admins.length);
    console.log('Coaches found:', coaches.length);
    console.log('Assistants found:', assistants.length);

    const accounts = [
      ...admins.map(admin => ({ ...admin.toObject(), role: 'admin' })),
      ...coaches.map(coach => ({ ...coach.toObject(), role: 'coach' })),
      ...assistants.map(assistant => ({ ...assistant.toObject(), role: 'assistant' }))
    ];

    console.log('Total accounts to return:', accounts.length);
    console.log('Accounts data:', accounts);
    console.log('=============================');

    res.json(accounts);
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new account
router.post('/', async (req, res) => {
  try {
    const { username, password, role, name, email } = req.body;
    
    console.log('Received account data:', req.body);
    console.log('Role received:', role);
    console.log('Role type:', typeof role);

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username });
    const existingCoach = await Coach.findOne({ username });
    const existingAssistant = await AssistantCoach.findOne({ username });

    if (existingAdmin || existingCoach || existingAssistant) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let newAccount;

    if (role === 'admin') {
      newAccount = new Admin({ username, password: hashedPassword });
    } else if (role === 'coach') {
      newAccount = new Coach({ 
        username, 
        password: hashedPassword, 
        name: name || username,
        email: email || null 
      });
    } else if (role === 'assistant') {
      newAccount = new AssistantCoach({ 
        username, 
        password: hashedPassword, 
        name: name || username,
        email: email || null 
      });
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await newAccount.save();

    res.json({ 
      message: 'Account created successfully',
      account: {
        username: newAccount.username,
        role: role,
        name: newAccount.name || newAccount.username,
        email: newAccount.email || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email, role, password } = req.body;

    console.log('=== UPDATE ACCOUNT REQUEST ===');
    console.log('Account ID:', id);
    console.log('Request body:', req.body);
    console.log('Username:', username);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Role:', role);
    console.log('Has password:', !!password);
    console.log('===============================');

    let account;
    let AccountModel;

    if (role === 'admin') {
      AccountModel = Admin;
    } else if (role === 'coach') {
      AccountModel = Coach;
    } else if (role === 'assistant') {
      AccountModel = AssistantCoach;
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    account = await AccountModel.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (username) account.username = username;
    
    // Only update name and email for roles that support them
    if (role !== 'admin') {
      if (name) account.name = name;
      if (email !== undefined) account.email = email;
    } else {
      console.log('Admin account - skipping name and email updates (not supported)');
    }
    
    // Only update password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      account.password = hashedPassword;
    }

    await account.save();

    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    let AccountModel;

    if (role === 'admin') {
      AccountModel = Admin;
    } else if (role === 'coach') {
      AccountModel = Coach;
    } else if (role === 'assistant') {
      AccountModel = AssistantCoach;
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const account = await AccountModel.findByIdAndDelete(id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
