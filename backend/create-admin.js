const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');
const Admin = require('./models/Admin');
const Coach = require('./models/Coach');
const AssistantCoach = require('./models/AssistantCoach');

// Load env from backend/.env regardless of where script is executed
dotenv.config({ path: path.join(__dirname, '.env') });

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const username = 'aldrin';
  const password = 'aldrin';

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log('Admin user already exists.');
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = new Admin({ username, password: hashed });
  await admin.save();
  console.log('Admin user created successfully!');
  process.exit(0);
}

createAdmin().catch(err => {
  console.error(err);
  process.exit(1);
}); 

// Optional: quick coach seeder
async function createCoach(username = 'coach', password = 'coach') {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const exists = await Coach.findOne({ username });
  if (exists) {
    console.log('Coach already exists');
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  await new Coach({ username, password: hashed, name: 'Coach User' }).save();
  console.log('Coach user created successfully!');
  process.exit(0);
}

// To seed a coach instead, run: node backend/create-admin.js coach
if (process.argv[2] === 'coach') {
  createCoach().catch(err => { console.error(err); process.exit(1); });
}

async function createAssistant(username = 'assistant', password = 'assistant') {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const exists = await AssistantCoach.findOne({ username });
  if (exists) {
    console.log('Assistant Coach already exists');
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  await new AssistantCoach({ username, password: hashed, name: 'Assistant Coach' }).save();
  console.log('Assistant coach created successfully!');
  process.exit(0);
}

// To seed an assistant coach: node backend/create-admin.js assistant
if (process.argv[2] === 'assistant') {
  createAssistant().catch(err => { console.error(err); process.exit(1); });
}