const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Admin = require('./models/Admin');
const Coach = require('./models/Coach');
const AssistantCoach = require('./models/AssistantCoach');
const Player = require('./models/Player');
const ActivityLog = require('./models/ActivityLog');

dotenv.config({ path: path.join(__dirname, '.env') });

async function clearAllData() {
  try {

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const playerCount = await Player.countDocuments();
    await Player.deleteMany({});
    console.log(`✅ Deleted ${playerCount} player(s)`);

    const coachCount = await Coach.countDocuments();
    await Coach.deleteMany({});
    console.log(`✅ Deleted ${coachCount} coach(es)`);

    const assistantCount = await AssistantCoach.countDocuments();
    await AssistantCoach.deleteMany({});
    console.log(`✅ Deleted ${assistantCount} assistant coach(es)`);

    const activityLogCount = await ActivityLog.countDocuments();
    await ActivityLog.deleteMany({});
    console.log(`✅ Deleted ${activityLogCount} activity log(s)`);

    const adminCount = await Admin.countDocuments();
    const defaultAdmin = await Admin.findOne({ username: 'aldrin' });
    
    if (defaultAdmin) {
      await Admin.deleteMany({ _id: { $ne: defaultAdmin._id } });
      const deletedAdminCount = adminCount - 1;
      console.log(`✅ Deleted ${deletedAdminCount} admin(s) (kept default admin: aldrin)`);
      console.log(`✅ Default admin preserved: ${defaultAdmin.username}`);
    } else {
      await Admin.deleteMany({});
      console.log(`⚠️  Deleted ${adminCount} admin(s) (default admin 'aldrin' not found)`);
      console.log('⚠️  Note: Default admin will be auto-created on next server start');
    }

    console.log('\n✅ Data cleanup completed successfully!');
    console.log('✅ Default admin (aldrin) has been preserved.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearAllData();

