const mongoose = require('mongoose');

const AssistantCoachSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  team: { type: String } // Team assignment (EARIST, ERVHS, ARISE, TONDO, RECTO) - required for Assistant Coach
});

module.exports = mongoose.model('AssistantCoach', AssistantCoachSchema);


