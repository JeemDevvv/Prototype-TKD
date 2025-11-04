const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');

router.get('/recent', auth, async (req, res) => {
  try {
    console.log('Fetching recent activity logs');
    
    const limit = parseInt(req.query.limit) || 20;
    const activities = await ActivityLog.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    console.log(`Found ${activities.length} recent activities`);
    
    res.json({
      success: true,
      activities: activities
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch activity logs',
      error: error.message 
    });
  }
});

router.post('/log', auth, async (req, res) => {
  try {
    const { activity, details = '' } = req.body;
    
    if (!activity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Activity description is required' 
      });
    }
    
    const userId = req.session.userId;
    const userRole = req.session.role;
    
    if (!userId || !userRole) {
      return res.status(401).json({ 
        success: false, 
        message: 'User session not found' 
      });
    }
    
    let userModel, userName;
    
    if (userRole === 'admin') {
      userModel = 'Admin';
      const Admin = require('../models/Admin');
      const admin = await Admin.findById(userId);
      userName = admin ? admin.username : 'Unknown Admin';
    } else if (userRole === 'coach') {
      userModel = 'Coach';
      const Coach = require('../models/Coach');
      const coach = await Coach.findById(userId);
      userName = coach ? coach.name : 'Unknown Coach';
    } else if (userRole === 'assistant') {
      userModel = 'AssistantCoach';
      const AssistantCoach = require('../models/AssistantCoach');
      const assistant = await AssistantCoach.findById(userId);
      userName = assistant ? assistant.name : 'Unknown Assistant';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user role' 
      });
    }
    
    const activityLog = new ActivityLog({
      userId: userId,
      userModel: userModel,
      userName: userName,
      userRole: userRole,
      activity: activity,
      details: details,
      timestamp: new Date()
    });
    
    await activityLog.save();
    
    console.log(`Activity logged: ${userName} (${userRole}) - ${activity}`);
    
    res.json({
      success: true,
      message: 'Activity logged successfully',
      activityLog: activityLog
    });
    
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to log activity',
      error: error.message 
    });
  }
});

module.exports = router;

