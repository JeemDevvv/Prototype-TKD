// Script to update existing admin records with new fields
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function updateAdmins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find all admins without name field
    const admins = await Admin.find({ name: { $exists: false } });
    console.log(`Found ${admins.length} admins to update`);
    
    for (const admin of admins) {
      // Update admin with default values
      admin.name = admin.username;
      admin.email = `${admin.username}@arise-tkd.com`;
      admin.status = 'active';
      admin.createdAt = new Date();
      
      await admin.save();
      console.log(`Updated admin: ${admin.username}`);
    }
    
    console.log('All admins updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating admins:', error);
    process.exit(1);
  }
}

updateAdmins();
