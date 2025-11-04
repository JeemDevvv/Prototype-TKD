const mongoose = require('mongoose');

const CoachSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  team: { type: String } 
});

module.exports = mongoose.model('Coach', CoachSchema);

