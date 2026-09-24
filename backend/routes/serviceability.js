const express = require('express');
const router = express.Router();
const { checkServiceability } = require('../utils/serviceabilityEngine');

router.post('/check', async (req, res) => {
  try {
    const { address } = req.body;
    const result = await checkServiceability(address);
    res.json(result);
  } catch (error) {
    console.error('Serviceability check error:', error);
    res.status(500).json({ message: 'Server error checking serviceability' });
  }
});

module.exports = router;
