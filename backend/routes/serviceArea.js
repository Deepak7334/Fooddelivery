const express = require('express');
const router = express.Router();
const ServiceArea = require('../models/ServiceArea');
const { protect, authorize } = require('../middleware/auth');

// Get all service areas (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const areas = await ServiceArea.find();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new service area
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const newArea = new ServiceArea(req.body);
    await newArea.save();
    res.status(201).json(newArea);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update service area
router.patch('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const area = await ServiceArea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(area);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update status
router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const area = await ServiceArea.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(area);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete service area
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await ServiceArea.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service Area deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
