const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const auth = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'), false);
    }
  }
});

router.get('/summary', async (req, res) => {
  const totalPlayers = await Player.countDocuments();
  const beltRanks = await Player.aggregate([
    { $group: { _id: '$beltRank', count: { $sum: 1 } } }
  ]);
  const nccIds = await Player.find({}, 'nccRef');
  res.json({ totalPlayers, beltRanks, nccIds });
});

router.get('/export/excel', auth, async (req, res) => {
  try {
    console.log('Excel export requested');
    console.log('Session data:', req.session);
    console.log('User ID:', req.session.userId);
    console.log('User role:', req.session.role);
    
    const players = await Player.find({}).sort({ name: 1 });
    console.log(`Found ${players.length} players to export`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Players');
    
    worksheet.columns = [
      { header: 'NCC Reference', key: 'nccRef', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Belt Rank', key: 'beltRank', width: 15 },
      { header: 'Birthdate', key: 'birthdate', width: 12 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Contact Number', key: 'contactNumber', width: 15 },
      { header: 'Required Forms', key: 'requiredForms', width: 20 },
      { header: 'Created Date', key: 'createdAt', width: 15 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    players.forEach(player => {
      worksheet.addRow({
        nccRef: player.nccRef || '',
        name: player.name || '',
        gender: player.gender || '',
        beltRank: player.beltRank || '',
        birthdate: player.birthdate ? new Date(player.birthdate).toLocaleDateString() : '',
        address: player.address || '',
        contactNumber: player.contactNumber || '',
        requiredForms: player.requiredForms || '',
        createdAt: player.createdAt ? new Date(player.createdAt).toLocaleDateString() : ''
      });
    });
    
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width, 10);
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=players_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    console.log('Excel export completed successfully');
    
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: 'Excel export failed', error: error.message });
  }
});

router.get('/export/pdf', auth, (req, res) => {
  res.status(501).json({ message: 'PDF export not implemented' });
});

router.post('/import/excel', auth, upload.single('excelFile'), async (req, res) => {
  try {
    console.log('Excel import requested');
    console.log('Session data:', req.session);
    console.log('User ID:', req.session.userId);
    console.log('User role:', req.session.role);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const worksheet = workbook.getWorksheet(1); // Get first worksheet
    if (!worksheet) {
      return res.status(400).json({ message: 'No worksheet found in Excel file' });
    }

    console.log('Worksheet found, rows:', worksheet.rowCount);
    
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    
    console.log('Headers found:', headers);
    
    const columnMapping = {
      'NCC Reference': 'nccRef',
      'Name': 'name',
      'Gender': 'gender',
      'Belt Rank': 'beltRank',
      'Birthdate': 'birthdate',
      'Address': 'address',
      'Contact Number': 'contactNumber',
      'Email': 'email',
      'Emergency Contact': 'emergencyContact',
      'Emergency Number': 'emergencyNumber',
      'Required Forms': 'requiredForms'
    };
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];
    
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const playerData = {};
        
        row.eachCell((cell, colNumber) => {
          const headerName = headers[colNumber];
          const fieldName = columnMapping[headerName];
          if (fieldName && cell.value !== null && cell.value !== undefined) {
            playerData[fieldName] = cell.value;
          }
        });
        
        if (!playerData.name && !playerData.nccRef) {
          console.log(`Skipping empty row ${rowNumber}`);
          continue;
        }
        
        console.log(`Processing row ${rowNumber}:`, playerData);
        
        if (!playerData.name || playerData.name.trim() === '') {
          errors++;
          errorDetails.push(`Row ${rowNumber}: Name is required`);
          console.log(`Row ${rowNumber}: Missing name`);
          continue;
        }
        
        if (!playerData.beltRank || playerData.beltRank.trim() === '') {
          errors++;
          errorDetails.push(`Row ${rowNumber}: Belt Rank is required`);
          console.log(`Row ${rowNumber}: Missing belt rank`);
          continue;
        }
        
        if (playerData.birthdate) {
          try {
            playerData.birthdate = new Date(playerData.birthdate);
          } catch (e) {
            console.warn(`Invalid date format in row ${rowNumber}:`, playerData.birthdate);
          }
        }
        
        const existingPlayer = await Player.findOne({
          $or: [
            { name: playerData.name },
            { nccRef: playerData.nccRef }
          ]
        });
        
        if (existingPlayer) {
          await Player.findByIdAndUpdate(existingPlayer._id, playerData);
          console.log(`Updated existing player: ${playerData.name}`);
          updated++;
        } else {
          const newPlayer = new Player(playerData);
          await newPlayer.save();
          console.log(`Created new player: ${playerData.name}`);
          imported++;
        }
        
      } catch (error) {
        errors++;
        errorDetails.push(`Row ${rowNumber}: ${error.message}`);
        console.error(`Error processing row ${rowNumber}:`, error);
      }
    }
    
    console.log(`Import completed: ${imported} imported, ${updated} updated, ${errors} errors`);
    console.log('Error details:', errorDetails);
    
    res.json({
      message: 'Import completed',
      imported: imported,
      updated: updated,
      errors: errors,
      errorDetails: errorDetails.slice(0, 10) // Limit error details to first 10
    });
    
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ message: 'Excel import failed', error: error.message });
  }
});

module.exports = router;
