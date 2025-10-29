const mongoose = require('mongoose');

const AssistantCoachSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  email: { type: String }
});

module.exports = mongoose.model('AssistantCoach', AssistantCoachSchema);


