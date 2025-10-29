const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const auth = require('../middleware/auth');

// Public: Search by NCC Reference or get all players
router.get('/search', async (req, res) => {
  const { nccRef } = req.query;
  if (nccRef) {
    const player = await Player.findOne({ nccRef });
    if (!player) return res.status(404).json({ message: 'Record not found' });
    return res.json(player);
  } else {
    // No nccRef provided, return all players
    const players = await Player.find();
    return res.json(players);
  }
});

// Public: Get player by ID
router.get('/:id', async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ message: 'Record not found' });
  res.json(player);
});

// Admin: Add player
router.post('/', auth, async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Edit player
router.put('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!player) return res.status(404).json({ message: 'Record not found' });
    res.json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Delete player
router.delete('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 