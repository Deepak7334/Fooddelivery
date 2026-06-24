const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Store = require('../models/Store');
const Settings = require('../models/Settings');

// ========== PUBLIC ROUTES ==========
// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get checkout info (delivery fees & global taxes)
router.post('/checkout-info', async (req, res) => {
  try {
    const { restaurantIds = [], storeIds = [] } = req.body;
    let deliveryFees = 0;
    
    // Filter to ensure only valid 24-character hex strings (MongoDB ObjectIds) are queried
    const validRestIds = restaurantIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    const validStoreIds = storeIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    
    if (validRestIds.length > 0) {
      const rests = await Restaurant.find({ _id: { $in: validRestIds } });
      rests.forEach(r => deliveryFees += (r.deliveryFee || 0));
    }
    
    if (validStoreIds.length > 0) {
      const stores = await Store.find({ _id: { $in: validStoreIds } });
      stores.forEach(s => deliveryFees += (s.deliveryFee || 0));
    }

    res.json({ success: true, deliveryFees, globalTaxRate: 0 }); // Taxes removed
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get popular foods
router.get('/foods', async (req, res) => {
  try {
    const { search } = req.query;
    let filter = { isAvailable: true };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') }
      ];
    }
    const foods = await Food.find(filter).limit(24).populate('restaurantId', 'name image address cuisine');
    res.json({ success: true, foods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all restaurants (with search & filter)
router.get('/restaurants', async (req, res) => {
  try {
    const { search, cuisine, sort, city } = req.query;
    let filter = { isActive: true };
    if (city) filter.city = new RegExp(city, 'i');
    if (cuisine) filter.cuisine = new RegExp(cuisine, 'i');
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { cuisine: { $elemMatch: { $regex: search, $options: 'i' } } },
    ];
    let query = Restaurant.find(filter);
    if (sort === 'rating') query = query.sort({ rating: -1 });
    else if (sort === 'deliveryTime') query = query.sort({ deliveryTime: 1 });
    else if (sort === 'deliveryFee') query = query.sort({ deliveryFee: 1 });
    else query = query.sort({ createdAt: -1 });
    const restaurants = await query;
    res.json({ success: true, restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single restaurant with menu
router.get('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('tables');
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    // Default tables if none
    if (restaurant.tables.length === 0) {
      restaurant.tables = [{ number: 1, maxGuests: 4 }, { number: 2, maxGuests: 6 }];
    }
    const menu = await Food.find({ restaurantId: restaurant._id, isAvailable: true });
    // Group by category
    const menuGrouped = {};
    menu.forEach(item => {
      if (!menuGrouped[item.category]) menuGrouped[item.category] = [];
      menuGrouped[item.category].push(item);
    });
    res.json({ success: true, restaurant, menu, menuGrouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== PROTECTED CUSTOMER ROUTES ==========
// Place order
router.post('/orders', protect, authorize('customer'), async (req, res) => {
  try {
    const { items, deliveryAddress, specialInstructions, paymentMethod } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const Restaurant = require('../models/Restaurant');
    const Store = require('../models/Store');
    
    // Group items by vendor
    const vendorGroups = {};
    for (const item of items) {
      const vendorId = item.restaurantId || item.storeId;
      const vendorType = item.type === 'food' ? 'restaurant' : 'store';
      const key = `${vendorType}_${vendorId}`;
      if (!vendorGroups[key]) {
        vendorGroups[key] = { vendorId, vendorType, items: [] };
      }
      vendorGroups[key].items.push(item);
    }

    const createdOrders = [];
    const io = req.app.get('io');

    for (const key of Object.keys(vendorGroups)) {
      const group = vendorGroups[key];
      let vendorName = 'JDmart';
      if (group.vendorType === 'restaurant' && group.vendorId) {
        const rest = await Restaurant.findById(group.vendorId);
        if (rest) vendorName = rest.name;
      } else if (group.vendorType === 'store' && group.vendorId) {
        const store = await Store.findById(group.vendorId);
        if (store) vendorName = store.name;
      }

      // Calculate total delivery fee for this vendor group
      let groupDeliveryFee = 0;
      if (group.vendorType === 'restaurant' && group.vendorId) {
        const rest = await Restaurant.findById(group.vendorId);
        if (rest) groupDeliveryFee = rest.deliveryFee || 0;
      } else if (group.vendorType === 'store' && group.vendorId) {
        const store = await Store.findById(group.vendorId);
        if (store) groupDeliveryFee = store.deliveryFee || 0;
      }

      const totalAmount = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const finalAmount = totalAmount + groupDeliveryFee;

      const order = await Order.create({
        customerId: req.user._id,
        restaurantId: group.vendorType === 'restaurant' ? group.vendorId : null,
        restaurantName: group.vendorType === 'restaurant' ? vendorName : null,
        storeId: group.vendorType === 'store' ? group.vendorId : null,
        storeName: group.vendorType === 'store' ? vendorName : null,
        orderType: group.vendorType === 'restaurant' ? 'food' : 'product',
        items: group.items,
        totalAmount,
        deliveryFee: groupDeliveryFee,
        finalAmount,
        deliveryAddress,
        specialInstructions,
        paymentMethod: paymentMethod || 'razorpay',
        customerEmail: req.user.email,
        customerPhone: req.user.phone,
        alternatePhone: req.body.alternatePhone || '',
        statusHistory: [{ status: 'pending', timestamp: new Date() }],
      });
      
      createdOrders.push(order);
      io.to(`${group.vendorType}_${group.vendorId}`).emit('order:new', order);
    }

    res.status(201).json({ success: true, orders: createdOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get my orders
router.get('/orders', protect, authorize('customer'), async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name image address')
      .populate('storeId', 'name image address');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single order (for tracking)
router.get('/orders/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id })
      .populate('restaurantId', 'name image address phone')
      .populate('storeId', 'name image address phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify delivery OTP
router.post('/orders/:id/verify-otp', protect, authorize('customer'), async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ success: false, message: 'Order is not out for delivery' });
    }
    if (order.deliveryOTP !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    order.status = 'delivered';
    order.otpVerified = true;
    order.statusHistory.push({ status: 'delivered', timestamp: new Date(), note: 'OTP verified by customer' });
    await order.save();

    // Notify restaurant
    const io = req.app.get('io');
    io.to(`restaurant_${order.restaurantId}`).emit('order:delivered', {
      orderId: order._id,
      status: 'delivered',
    });
    io.to(`order_${order._id}`).emit('order:status_update', {
      orderId: order._id,
      status: 'delivered',
      statusHistory: order.statusHistory,
    });

    res.json({ success: true, message: 'Delivery confirmed! Enjoy your meal! ', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel order
router.patch('/orders/:id/cancel', protect, authorize('customer'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['pending', 'accepted'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order at this stage' });
    }
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', timestamp: new Date() });
    await order.save();
    const io = req.app.get('io');
    io.to(`restaurant_${order.restaurantId}`).emit('order:cancelled', { orderId: order._id });
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== STORE ORDER PLACEMENT ==========
router.post('/store-orders', protect, authorize('customer'), async (req, res) => {
  try {
    const { storeId, items, deliveryAddress, paymentMethod, totalAmount, deliveryFee, finalAmount, specialInstructions } = req.body;
    if (!storeId || !items?.length) return res.status(400).json({ success: false, message: 'storeId and items are required' });

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const order = await Order.create({
      customerId: req.user.id,
      storeId,
      storeName: store.name,
      orderType: 'product',
      items,
      totalAmount,
      deliveryFee, // Trusted from frontend or we could compute it
      finalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      specialInstructions: specialInstructions || '',
      customerPhone: req.user.phone || '',
      customerEmail: req.user.email || '',
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
