#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 TKD Project Deployment Setup');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/tkd-database

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-session-key-here

# Port (optional, defaults to 4000)
PORT=4000

# Environment
NODE_ENV=development
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created in backend folder');
  console.log('⚠️  Please update the MONGODB_URI with your actual MongoDB connection string\n');
} else {
  console.log('✅ .env file already exists\n');
}

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('📦 Package.json found:');
  console.log(`   - Name: ${packageJson.name}`);
  console.log(`   - Version: ${packageJson.version}`);
  console.log(`   - Main: ${packageJson.main}\n`);
}

// Check if all required files exist
const requiredFiles = [
  'backend/app.js',
  'backend/config.js',
  'frontend/pages/dashboard.html',
  'frontend/js/main.js',
  'frontend/css/styles.css'
];

console.log('🔍 Checking required files...');
let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n🎉 All required files are present!');
} else {
  console.log('\n⚠️  Some files are missing. Please check the project structure.');
}

console.log('\n📋 Next Steps:');
console.log('1. Set up MongoDB Atlas (free at mongodb.com/atlas)');
console.log('2. Update the MONGODB_URI in backend/.env');
console.log('3. Push your code to GitHub');
console.log('4. Deploy to Render (render.com) or Railway (railway.app)');
console.log('5. Update frontend API URLs to point to your deployed backend');
console.log('\n📖 See DEPLOYMENT.md for detailed instructions');

console.log('\n🔧 Quick Commands:');
console.log('   npm install          # Install dependencies');
console.log('   npm start            # Start the server locally');
console.log('   npm run dev          # Start with nodemon (development)');
