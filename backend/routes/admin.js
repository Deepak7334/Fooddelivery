const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const Category = require('../models/Category');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

// ========== DASHBOARD STATS ==========
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalRestaurants, totalOrders, revenueAgg, totalDeliveryAgents] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Restaurant.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      User.countDocuments({ role: 'delivery' }),
    ]);
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10)
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name')
      .populate('deliveryAgentId', 'name phone');
    res.json({ success: true, stats: { totalUsers, totalRestaurants, totalOrders, totalRevenue: revenueAgg[0]?.total || 0, totalDeliveryAgents }, recentOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== RESTAURANT MANAGEMENT ==========
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('ownerId', 'name email');
    res.json({ success: true, restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/restaurants', async (req, res) => {
  try {
    const { name, description, cuisine, address, city, image, deliveryTime, deliveryFee, minOrder, phone, ownerEmail, ownerPassword, ownerName } = req.body;
    let ownerId = null;
    if (ownerEmail && ownerPassword) {
      const existing = await User.findOne({ email: ownerEmail });
      if (existing) return res.status(400).json({ success: false, message: 'Owner email already exists' });
      const hashed = await bcrypt.hash(ownerPassword, 10);
      const owner = await User.create({ name: ownerName || name + ' Owner', email: ownerEmail, password: hashed, role: 'restaurant', phone: phone || '' });
      ownerId = owner._id;
    }
    const restaurant = await Restaurant.create({ name, description, cuisine: cuisine || [], address, city, image, deliveryTime, deliveryFee, minOrder, phone, ownerEmail, ownerId });
    if (ownerId) await User.findByIdAndUpdate(ownerId, { restaurantId: restaurant._id });
    res.status(201).json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    await Food.deleteMany({ restaurantId: restaurant._id });
    if (restaurant.ownerId) await User.findByIdAndUpdate(restaurant.ownerId, { isActive: false });
    await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Restaurant deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/restaurants/:id/toggle', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();
    res.json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== USER MANAGEMENT ==========
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== DELIVERY AGENT MANAGEMENT ==========

router.get('/delivery-agents', async (req, res) => {
  try {
    const agents = await User.find({ role: 'delivery' }).select('-password').sort({ createdAt: -1 });
    const agentIds = agents.map(a => a._id);
    const activeCounts = await Order.aggregate([
      { $match: { deliveryAgentId: { $in: agentIds }, status: 'out_for_delivery' } },
      { $group: { _id: '$deliveryAgentId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    activeCounts.forEach(a => { countMap[a._id.toString()] = a.count; });
    res.json({ success: true, agents: agents.map(a => ({ ...a.toObject(), activeOrders: countMap[a._id.toString()] || 0 })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/delivery-agents', async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
    const hashed = await bcrypt.hash(password, 10);
    const agent = await User.create({ name, email, password: hashed, role: 'delivery', phone: phone || '', vehicleNumber: vehicleNumber || '', deliveryStatus: 'available' });
    const { password: _p, ...agentData } = agent.toObject();
    res.status(201).json({ success: true, agent: agentData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/delivery-agents/:id', async (req, res) => {
  try {
    const { name, phone, vehicleNumber, deliveryStatus } = req.body;
    const agent = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'delivery' },
      { name, phone, vehicleNumber, deliveryStatus },
      { new: true }
    ).select('-password');
    if (!agent) return res.status(404).json({ success: false, message: 'Delivery agent not found' });
    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/delivery-agents/:id/toggle', async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'delivery' });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    agent.isActive = !agent.isActive;
    await agent.save();
    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/delivery-agents/:id', async (req, res) => {
  try {
    await User.findOneAndDelete({ _id: req.params.id, role: 'delivery' });
    res.json({ success: true, message: 'Delivery agent removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== ORDER MANAGEMENT (Full Admin Control) ==========

router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name')
      .populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus');
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name address phone')
      .populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: update any order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findById(req.params.id).populate('customerId', 'name email phone').populate('restaurantId', 'name address');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Auto-assign logic: When admin dispatches without an agent, find the first available agent
    if (status === 'out_for_delivery' && !order.deliveryAgentId) {
      const availableAgent = await User.findOne({ role: 'delivery', deliveryStatus: 'available', isActive: true });
      if (!availableAgent) {
        return res.status(400).json({ success: false, message: 'No delivery agents available. Please wait or add agents.' });
      }
      order.deliveryAgentId = availableAgent._id;
      order.deliveryAgentName = availableAgent.name;
    }

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note: 'Updated by admin' });

    let devOtp;
    if (status === 'out_for_delivery') {
      const otp = generateOTP();
      order.deliveryOTP = otp;
      devOtp = otp;
      const customerEmail = order.customerEmail || order.customerId?.email;
      const customerName = order.customerId?.name || 'Customer';
      await sendEmail({
        to: customerEmail,
        subject: '🚴 FoodHub — Your Delivery OTP',
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#FF5722,#FF9800);padding:28px 24px;text-align:center"><h1 style="color:#fff;margin:0">🍕 FoodHub</h1><p style="color:rgba(255,255,255,0.9);margin:6px 0 0">Your order is on the way!</p></div><div style="padding:28px 24px"><p>Hi <strong>${customerName}</strong>,</p><p>Share this OTP with the delivery agent to confirm delivery:</p><div style="text-align:center;margin:24px 0"><div style="display:inline-block;background:#FFF3E0;border:2px dashed #FF5722;border-radius:12px;padding:16px 32px"><div style="font-size:11px;font-weight:700;color:#FF5722;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Delivery OTP</div><div style="font-size:42px;font-weight:900;color:#FF5722;letter-spacing:12px;font-family:monospace">${otp}</div></div></div><p style="font-size:13px;color:#888;text-align:center">⚠️ Do NOT share before the agent arrives.</p></div></div>`,
      });
      // Do NOT set agent to busy here yet — agent becomes busy when they *accept* it (picked_up)
    }

    if (status === 'delivered' && order.deliveryAgentId) {
      await User.findByIdAndUpdate(order.deliveryAgentId, { deliveryStatus: 'available' });
    }

    await order.save();

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', { orderId: order._id, status: order.status, statusHistory: order.statusHistory });
    if (order.restaurantId) io.to(`restaurant_${order.restaurantId._id}`).emit('order:updated', order);
    
    // Notify delivery agent if assigned/dispatched
    if (status === 'out_for_delivery' && order.deliveryAgentId) {
      io.to(`delivery_${order.deliveryAgentId}`).emit('delivery:new_assignment', order);
    }

    res.json({ success: true, order, ...(devOtp && process.env.NODE_ENV !== 'production' ? { devOtp } : {}) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: assign delivery agent to order
router.patch('/orders/:id/assign-agent', async (req, res) => {
  try {
    const { agentId } = req.body;
    const agent = await User.findOne({ _id: agentId, role: 'delivery', isActive: true });
    if (!agent) return res.status(404).json({ success: false, message: 'Delivery agent not found or inactive' });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryAgentId: agentId, deliveryAgentName: agent.name },
      { new: true }
    ).populate('customerId', 'name email phone').populate('restaurantId', 'name').populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:agent_assigned', { orderId: order._id, agent: { name: agent.name, phone: agent.phone } });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== CATEGORY MANAGEMENT ==========
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
