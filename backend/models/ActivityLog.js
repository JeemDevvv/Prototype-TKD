const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Coach', 'AssistantCoach']
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['admin', 'coach', 'assistant']
  },
  activity: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

