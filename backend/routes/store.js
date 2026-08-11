const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const Product = require('../models/Product');

// GET /api/store/types — list all store type constants
router.get('/types', (req, res) => {
  res.json({
    types: [
      { key: 'grocery',     label: 'Grocery',     icon: '🛒', color: '#4CAF50' },
      { key: 'pharmacy',    label: 'Pharmacy',    icon: '💊', color: '#2196F3' },
      { key: 'electronics', label: 'Electronics', icon: '📱', color: '#9C27B0' },
      { key: 'beauty',      label: 'Beauty',      icon: '🧴', color: '#E91E63' },
      { key: 'pets',        label: 'Pets',        icon: '🐾', color: '#FF9800' },
      { key: 'bakery',      label: 'Bakery',      icon: '🥐', color: '#FF5722' },
      { key: 'supermarket', label: 'Supermarket', icon: '🏪', color: '#607D8B' },
      { key: 'stationery',  label: 'Stationery',  icon: '📚', color: '#795548' },
      { key: 'sports',      label: 'Sports',      icon: '⚽', color: '#00BCD4' },
      { key: 'other',       label: 'Other',       icon: '🏬', color: '#9E9E9E' },
    ]
  });
});

// GET /api/store/stores — list all active stores (with filters)
router.get('/stores', async (req, res) => {
  try {
    const { type, city, search, lat, lng } = req.query;
    const filter = { isActive: true };
    
    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 5000 // 5 km radius
        }
      };
    } else if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (type && type !== 'all') filter.storeType = type;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];

    const stores = await Store.find(filter);
    res.json({ success: true, stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/store/stores/:id — single store with grouped products
router.get('/stores/:id', async (req, res) => {
  try {
    const store = await Store.findOne({ _id: req.params.id, isActive: true });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const products = await Product.find({ storeId: store._id, isAvailable: true }).sort({ category: 1, name: 1 });

    // Group products by category
    const grouped = {};
    products.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    res.json({ success: true, store, products, grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/store/products — browse products across all stores
router.get('/products', async (req, res) => {
  try {
    const { storeId, category, search, featured } = req.query;
    const filter = { isAvailable: true };
    if (storeId) filter.storeId = storeId;
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (featured === 'true') filter.isFeatured = true;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];

    const products = await Product.find(filter)
      .populate('storeId', 'name storeType city deliveryTime deliveryFee')
      .limit(60);

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
