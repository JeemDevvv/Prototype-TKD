const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Coach = require('../models/Coach');
const AssistantCoach = require('../models/AssistantCoach');
const bcrypt = require('bcrypt');

function getIO(req) {
  return req.app.get('io');
}

router.get('/', async (req, res) => {
  try {
    console.log('=== GET ACCOUNTS REQUEST ===');
    
    const admins = await Admin.find().select('username createdAt');
    const coaches = await Coach.find().select('username name email team createdAt');
    const assistants = await AssistantCoach.find().select('username name email team createdAt');

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

router.post('/', async (req, res) => {
  try {
    const { username, password, role, name, email, team } = req.body;
    
    console.log('Received account data:', req.body);
    console.log('Role received:', role);
    console.log('Role type:', typeof role);

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    const existingAdmin = await Admin.findOne({ username });
    const existingCoach = await Coach.findOne({ username });
    const existingAssistant = await AssistantCoach.findOne({ username });

    if (existingAdmin || existingCoach || existingAssistant) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let newAccount;

    if (role === 'admin') {
      newAccount = new Admin({ username, password: hashedPassword });
    } else if (role === 'coach') {
      newAccount = new Coach({ 
        username, 
        password: hashedPassword, 
        name: name || username,
        email: email || null,
        team: team || null
      });
    } else if (role === 'assistant') {
      if (!team) {
        return res.status(400).json({ message: 'Team is required for Assistant Coach' });
      }
      newAccount = new AssistantCoach({ 
        username, 
        password: hashedPassword, 
        name: name || username,
        email: email || null,
        team: team
      });
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await newAccount.save();

    const accountData = {
      _id: newAccount._id,
      username: newAccount.username,
      role: role,
      name: newAccount.name || newAccount.username,
      email: newAccount.email || null,
      team: newAccount.team || null
    };

    const io = getIO(req);
    if (io) {
      io.emit('account:created', accountData);
    }

    res.json({ 
      message: 'Account created successfully',
      account: accountData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email, role, password, team } = req.body;

    console.log('=== UPDATE ACCOUNT REQUEST ===');
    console.log('Account ID:', id);
    console.log('Request body:', req.body);
    console.log('Username:', username);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Role:', role);
    console.log('Has password:', !!password);
    console.log('===============================');

    let account = await Admin.findById(id);
    let currentRole = 'admin';
    let currentModel = Admin;
    
    if (!account) {
      account = await Coach.findById(id);
      if (account) {
        currentRole = 'coach';
        currentModel = Coach;
      }
    }
    
    if (!account) {
      account = await AssistantCoach.findById(id);
      if (account) {
        currentRole = 'assistant';
        currentModel = AssistantCoach;
      }
    }

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    console.log('Account found in model:', currentRole);
    console.log('Current account data:', account);

    const roleChanged = role && role !== currentRole;
    
    if (roleChanged) {
      console.log('Role change detected:', currentRole, '->', role);
      
      let NewAccountModel;
      if (role === 'admin') {
        NewAccountModel = Admin;
      } else if (role === 'coach') {
        NewAccountModel = Coach;
      } else if (role === 'assistant') {
        NewAccountModel = AssistantCoach;
        if (!team) {
          return res.status(400).json({ message: 'Team is required for Assistant Coach' });
        }
      } else {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const accountData = {
        username: username || account.username,
        password: account.password,
        name: name || account.name || account.username,
        email: email !== undefined ? email : (account.email || null),
        team: role === 'admin' ? undefined : (team !== undefined ? team : (account.team || null))
      };

      if (password && password.trim() !== '') {
        accountData.password = await bcrypt.hash(password, 10);
      }

      Object.keys(accountData).forEach(key => {
        if (accountData[key] === undefined) delete accountData[key];
      });

      const newAccount = new NewAccountModel(accountData);
      await newAccount.save();

      console.log('New account created in', role, 'model with ID:', newAccount._id);

      await currentModel.findByIdAndDelete(id);
      console.log('Old account deleted from', currentRole, 'model');

      account = newAccount;
    } else {
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

      if (username) account.username = username;
      
      if (role !== 'admin') {
        if (name) account.name = name;
        if (email !== undefined) account.email = email;
        if (team !== undefined) {
          if (role === 'assistant' && !team) {
            return res.status(400).json({ message: 'Team is required for Assistant Coach' });
          }
          account.team = team;
        }
      } else {
        console.log('Admin account - skipping name, email, and team updates (not supported)');
      }
      
      if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        account.password = hashedPassword;
      }

      await account.save();
    }

    const accountData = {
      _id: account._id,
      username: account.username,
      role: role,
      name: account.name || account.username,
      email: account.email || null,
      team: account.team || null
    };

    const io = getIO(req);
    if (io) {
      io.emit('account:updated', accountData);
    }

    res.json({ 
      message: 'Account updated successfully',
      account: accountData
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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

    const io = getIO(req);
    if (io) {
      io.emit('account:deleted', { id, role });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
