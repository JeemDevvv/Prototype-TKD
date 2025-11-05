const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const auth = require('../middleware/auth');

function getIO(req) {
  return req.app.get('io');
}

router.get('/search', async (req, res) => {
  const { nccRef } = req.query;
  if (nccRef) {
    let query = { nccRef };
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      query.team = req.session.team;
    }
    const player = await Player.findOne(query);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    return res.json(player);
  } else {
    let query = {};
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      query.team = req.session.team;
    }
    const players = await Player.find(query);
    return res.json(players);
  }
});

router.get('/:id', async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ message: 'Record not found' });
  res.json(player);
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      if (req.body.team && req.body.team !== req.session.team) {
        return res.status(403).json({ message: 'You can only add players to your assigned team' });
      }
      if (!req.body.team) {
        req.body.team = req.session.team;
      }
    }
    const player = new Player(req.body);
    await player.save();
    
    const io = getIO(req);
    if (io) {
      io.emit('player:created', player.toObject());
    }
    
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      const playerTeam = (player.team || '').trim().toUpperCase();
      const sessionTeam = (req.session.team || '').trim().toUpperCase();
      const newTeam = req.body.team ? (req.body.team || '').trim().toUpperCase() : null;
      
      console.log('[Assistant Coach Edit] Validation:', {
        playerId: req.params.id,
        playerTeam,
        sessionTeam,
        newTeam,
        requestBodyTeam: req.body.team,
        playerTeamMatchesSession: playerTeam === sessionTeam
      });
      
      if (playerTeam !== sessionTeam) {
        console.log('[Assistant Coach Edit] Rejected: Player team does not match session team');
        return res.status(403).json({ message: 'You can only edit players from your assigned team' });
      }
      
      const validTeams = ['EARIST', 'ERVHS', 'ARISE', 'TONDO', 'RECTO'];
      if (newTeam && !validTeams.includes(newTeam)) {
        return res.status(400).json({ message: 'Invalid team selected' });
      }
      
      if (req.body.team && req.body.team.trim() !== '') {
        req.body.team = String(req.body.team).trim();
        if (newTeam && newTeam !== playerTeam) {
          console.log('[Assistant Coach Edit] Validation passed, allowing edit and team transfer from', playerTeam, 'to', req.body.team);
        } else {
          console.log('[Assistant Coach Edit] Validation passed, allowing edit (team unchanged:', req.body.team, ')');
        }
      } else {
        req.body.team = player.team;
        console.log('[Assistant Coach Edit] Validation passed, allowing edit (no team field in request, keeping:', player.team, ')');
      }
    }
    
    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    const io = getIO(req);
    if (io) {
      io.emit('player:updated', updatedPlayer.toObject());
    }
    
    res.json(updatedPlayer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      if (player.team !== req.session.team) {
        return res.status(403).json({ message: 'You can only delete players from your assigned team' });
      }
    }
    
    const playerId = req.params.id;
    await Player.findByIdAndDelete(playerId);
    
    const io = getIO(req);
    if (io) {
      io.emit('player:deleted', { id: playerId });
    }
    
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
