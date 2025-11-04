const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const auth = require('../middleware/auth');

// Helper function to get io from request
function getIO(req) {
  return req.app.get('io');
}

// Public: Search by NCC Reference or get all players
// For authenticated users, filter by team if they're Assistant Coach
router.get('/search', async (req, res) => {
  const { nccRef } = req.query;
  if (nccRef) {
    let query = { nccRef };
    // Filter by team if user is Assistant Coach
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      query.team = req.session.team;
    }
    const player = await Player.findOne(query);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    return res.json(player);
  } else {
    // No nccRef provided, return all players or filtered by team
    let query = {};
    // Filter by team if user is Assistant Coach
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      query.team = req.session.team;
    }
    const players = await Player.find(query);
    return res.json(players);
  }
});

// Public: Get player by ID
router.get('/:id', async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ message: 'Record not found' });
  res.json(player);
});

// Admin/Coach/Assistant Coach: Add player
router.post('/', auth, async (req, res) => {
  try {
    // For Assistant Coach, ensure they can only add players to their team
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      if (req.body.team && req.body.team !== req.session.team) {
        return res.status(403).json({ message: 'You can only add players to your assigned team' });
      }
      // Auto-assign team if not provided
      if (!req.body.team) {
        req.body.team = req.session.team;
      }
    }
    const player = new Player(req.body);
    await player.save();
    
    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.emit('player:created', player.toObject());
    }
    
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin/Coach/Assistant Coach: Edit player
router.put('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    
    // For Assistant Coach, ensure they can only edit players from their team
    // But allow them to transfer players to other teams
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      // Normalize team values for comparison (trim and uppercase for consistency)
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
      
      // Primary check: player must currently belong to assistant coach's team
      // This ensures Assistant Coaches can only edit/transfer players from their assigned team
      if (playerTeam !== sessionTeam) {
        console.log('[Assistant Coach Edit] Rejected: Player team does not match session team');
        return res.status(403).json({ message: 'You can only edit players from your assigned team' });
      }
      
      // Allow Assistant Coach to change the team (transfer player to another team)
      // Validate that the new team is one of the valid teams if provided
      const validTeams = ['EARIST', 'ERVHS', 'ARISE', 'TONDO', 'RECTO'];
      if (newTeam && !validTeams.includes(newTeam)) {
        return res.status(400).json({ message: 'Invalid team selected' });
      }
      
      // If team is provided in request, use it (allows transfer to any valid team)
      // Preserve the original case from the request (e.g., "ERVHS" not "ervhs")
      if (req.body.team && req.body.team.trim() !== '') {
        req.body.team = String(req.body.team).trim();
        if (newTeam && newTeam !== playerTeam) {
          console.log('[Assistant Coach Edit] Validation passed, allowing edit and team transfer from', playerTeam, 'to', req.body.team);
        } else {
          console.log('[Assistant Coach Edit] Validation passed, allowing edit (team unchanged:', req.body.team, ')');
        }
      } else {
        // If no team provided in request, keep current team
        req.body.team = player.team;
        console.log('[Assistant Coach Edit] Validation passed, allowing edit (no team field in request, keeping:', player.team, ')');
      }
    }
    
    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.emit('player:updated', updatedPlayer.toObject());
    }
    
    res.json(updatedPlayer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin/Coach/Assistant Coach: Delete player
router.delete('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    
    // For Assistant Coach, ensure they can only delete players from their team
    if (req.session && req.session.role === 'assistant' && req.session.team) {
      if (player.team !== req.session.team) {
        return res.status(403).json({ message: 'You can only delete players from your assigned team' });
      }
    }
    
    const playerId = req.params.id;
    await Player.findByIdAndDelete(playerId);
    
    // Emit real-time event
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