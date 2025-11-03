const mongoose = require('mongoose');

const CoachSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  team: { type: String } // Team assignment (EARIST, ERVHS, ARISE, TONDO, RECTO) - null/all for access to all teams
});

module.exports = mongoose.model('Coach', CoachSchema);

















