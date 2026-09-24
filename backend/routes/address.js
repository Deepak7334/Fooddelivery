const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Get all addresses for customer
router.get('/', protect, authorize('customer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, addresses: user.addresses || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add new address
router.post('/', protect, authorize('customer'), async (req, res) => {
  try {
    const { label, addressLine1, addressLine2, landmark, area, city, state, pincode, latitude, longitude, isDefault } = req.body;
    const user = await User.findById(req.user.id);
    
    // If setting as default, unset others
    if (isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }
    
    // If first address, make it default
    const makeDefault = isDefault || user.addresses.length === 0;

    user.addresses.push({
      label: label || 'OTHER',
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault: makeDefault
    });

    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update address
router.patch('/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const fields = ['label', 'addressLine1', 'addressLine2', 'landmark', 'area', 'city', 'state', 'pincode', 'latitude', 'longitude'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        address[field] = req.body[field];
      }
    });

    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
      address.isDefault = true;
    }

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Set address as default
router.patch('/:id/default', protect, authorize('customer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    user.addresses.forEach(a => a.isDefault = false);
    address.isDefault = true;
    
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete address
router.delete('/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.id);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
