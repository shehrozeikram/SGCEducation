const express = require('express');
const router = express.Router();
const Test = require('../models/Test');

// Create a test document
router.post('/create', async (req, res) => {
  try {
    const testDoc = new Test({
      message: 'Hello from SGCEducation! Database is working.'
    });

    await testDoc.save();
    res.json({ success: true, data: testDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all test documents
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find();
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
