const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Table = require('../models/Table');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

// ========== DASHBOARD STATS ==========
router.get('/stats', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const Store = require('../models/Store');
    const [totalUsers, totalRestaurants, totalStores, totalOrders, revenueAgg, totalDeliveryAgents, totalBookings] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Restaurant.countDocuments(),
      Store.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' }, adminEarnings: { $sum: '$adminCommission' }, vendorPayouts: { $sum: '$vendorPayout' } } }]),
      User.countDocuments({ role: 'delivery' }),
      Booking.countDocuments(),
    ]);
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10)
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name')
      .populate('deliveryAgentId', 'name phone');
    res.json({ success: true, stats: { totalUsers, totalRestaurants, totalStores, totalOrders, totalRevenue: revenueAgg[0]?.total || 0, adminEarnings: revenueAgg[0]?.adminEarnings || 0, vendorPayouts: revenueAgg[0]?.vendorPayouts || 0, totalDeliveryAgents, totalBookings }, recentOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== SETTINGS ==========
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ globalTaxRate: 5 });
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    if (req.body.globalTaxRate !== undefined) {
      settings.globalTaxRate = req.body.globalTaxRate;
    }
    await settings.save();
    res.json({ success: true, settings });
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
      const owner = await User.create({ name: ownerName || name + ' Owner', email: ownerEmail, password: hashed, role: 'restaurant', phone: phone || '', address: address || '' });
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

// ========== TABLE MANAGEMENT ==========
router.get('/restaurants/:id/tables', async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.params.id }).sort({ number: 1 });
    res.json({ success: true, tables });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/restaurants/:id/tables', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const { number, maxGuests, description } = req.body;
    
    const existingTable = await Table.findOne({ restaurantId: restaurant._id, number });
    if (existingTable) return res.status(400).json({ success: false, message: 'Table number already exists' });

    const table = new Table({
      restaurantId: restaurant._id,
      number,
      maxGuests,
      description
    });
    await table.save();
    res.status(201).json({ success: true, table });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/restaurants/:id/tables/:tableId', async (req, res) => {
  try {
    const { number, maxGuests, description } = req.body;
    
    if (number) {
      const existingTable = await Table.findOne({ restaurantId: req.params.id, number, _id: { $ne: req.params.tableId } });
      if (existingTable) return res.status(400).json({ success: false, message: 'Table number already exists' });
    }

    const table = await Table.findOneAndUpdate(
      { _id: req.params.tableId, restaurantId: req.params.id },
      { number, maxGuests, description },
      { new: true }
    );
    
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
    res.json({ success: true, table });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/restaurants/:id/tables/:tableId', async (req, res) => {
  try {
    const table = await Table.findOneAndDelete({ _id: req.params.tableId, restaurantId: req.params.id });
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
    res.json({ success: true, message: 'Table removed' });
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

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Prevent deleting admin
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin user' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
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

router.get('/delivery-agents/:id/details', async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'delivery' }).select('-password');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    
    const orders = await Order.find({ deliveryAgentId: agent._id })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name phone')
      .populate('restaurantId', 'name address');
      
    // Calculate stats
    const stats = {
      totalAssigned: orders.length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      active: orders.filter(o => !['delivered', 'cancelled', 'pending', 'accepted', 'preparing', 'assignment_pending'].includes(o.status)).length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalEarnings: orders.filter(o => o.status === 'delivered').reduce((acc, curr) => acc + (curr.deliveryFee || 0), 0) // Approximation if delivery fee exists, else 0
    };

    res.json({ success: true, agent, orders, stats });
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
      .populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus')
      .lean();
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
      .populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus')
      .lean();
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
        subject: 'JDkart — Thank you for ordering from JDkart! your order is on the way. Please share this OTP with the delivery agent to confirm delivery. Do not share this OTP with anyone else before the agent arrives.',
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#FF5722,#FF9800);padding:28px 24px;text-align:center"><h1 style="color:#fff;margin:0">🍕 JDkart</h1><p style="color:rgba(255,255,255,0.9);margin:6px 0 0">Your order is on the way!</p></div><div style="padding:28px 24px"><p>Hi <strong>${customerName}</strong>,</p><p>Share this OTP with the delivery agent to confirm delivery:</p><div style="text-align:center;margin:24px 0"><div style="display:inline-block;background:#FFF3E0;border:2px dashed #FF5722;border-radius:12px;padding:16px 32px"><div style="font-size:11px;font-weight:700;color:#FF5722;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Delivery OTP</div><div style="font-size:42px;font-weight:900;color:#FF5722;letter-spacing:12px;font-family:monospace">${otp}</div></div></div><p style="font-size:13px;color:#888;text-align:center">⚠️ Do NOT share before the agent arrives.</p></div></div>`,
      });
      
      // Send Push Notification
      const NotificationService = require('../services/notificationService');
      await NotificationService.sendToCustomer(
        order.customerId._id || order.customerId,
        'Order Out for Delivery!',
        `Your order is on the way. Your delivery OTP is: ${otp}`,
        'ORDER_STATUS',
        req.app.get('io')
      ).catch(console.error);
      
      // Do NOT set agent to busy here yet — agent becomes busy when they *accept* it (picked_up)
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'cod') {
        order.paymentStatus = 'paid';
      }
      if (order.deliveryAgentId) {
        await User.findByIdAndUpdate(order.deliveryAgentId, { deliveryStatus: 'available' });
      }
    }

    await order.save();

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', { orderId: order._id, status: order.status, statusHistory: order.statusHistory });
    if (order.restaurantId) io.to(`restaurant_${order.restaurantId._id || order.restaurantId}`).emit('order:updated', order);
    if (order.storeId) io.to(`store_${order.storeId._id || order.storeId}`).emit('order:updated', order);
    
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
    
    if (agent.deliveryStatus === 'offline') {
      return res.status(400).json({ success: false, message: 'Agent is offline and cannot be assigned.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        deliveryAgentId: agentId, 
        deliveryAgentName: agent.name,
        status: 'assignment_pending',
        agentAccepted: false
      },
      { new: true }
    ).populate('customerId', 'name email phone').populate('restaurantId', 'name address phone').populate('storeId', 'name address phone').populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    order.statusHistory.push({ status: 'assignment_pending', timestamp: new Date(), note: 'Admin assigned. Waiting for agent to accept.' });
    await order.save();

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:agent_assigned', { orderId: order._id, agent: { name: agent.name, phone: agent.phone } });
    
    // Notify delivery agent
    io.to(`delivery_${order.deliveryAgentId._id || order.deliveryAgentId}`).emit('delivery:new_assignment', order);

    const NotificationService = require('../services/notificationService');
    await NotificationService.sendToDeliveryPartner(
      order.deliveryAgentId._id || order.deliveryAgentId,
      'New Delivery Assigned',
      'Pickup order from the restaurant.',
      'DELIVERY_ASSIGNED',
      io
    ).catch(console.error);

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: bulk assign delivery agent to multiple orders
router.patch('/orders/bulk-assign', async (req, res) => {
  try {
    const { orderIds, agentId } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No orders selected' });
    }

    const agent = await User.findOne({ _id: agentId, role: 'delivery', isActive: true });
    if (!agent) return res.status(404).json({ success: false, message: 'Delivery agent not found or inactive' });
    if (agent.deliveryStatus === 'offline') return res.status(400).json({ success: false, message: 'Agent is offline.' });

    const io = req.app.get('io');
    const updatedOrders = [];

    for (const orderId of orderIds) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { 
          deliveryAgentId: agentId, 
          deliveryAgentName: agent.name,
          status: 'assignment_pending',
          agentAccepted: false
        },
        { new: true }
      ).populate('customerId', 'name email phone').populate('restaurantId', 'name address phone').populate('storeId', 'name address phone').populate('deliveryAgentId', 'name phone vehicleNumber deliveryStatus');
      
      if (order) {
        order.statusHistory.push({ status: 'assignment_pending', timestamp: new Date(), note: 'Admin assigned (Bulk). Waiting for agent.' });
        await order.save();
        updatedOrders.push(order);
        
        io.to(`order_${order._id}`).emit('order:agent_assigned', { orderId: order._id, agent: { name: agent.name, phone: agent.phone } });
        io.to(`delivery_${agentId}`).emit('delivery:new_assignment', order);
      }
    }

    res.json({ success: true, message: `Successfully assigned ${updatedOrders.length} orders to ${agent.name}`, updatedOrders });
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

// ========== BOOKING MANAGEMENT (Admin View) ==========
router.get('/bookings', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const pageNum  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limitNum = Math.max(1, parseInt(req.query.limit || '20', 10));
    const { status, restaurantId } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (restaurantId)               filter.restaurantId = restaurantId;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('restaurantId', 'name city')
        .populate('userId',       'name email phone')
        .populate('tableId',      'number maxGuests'),
      Booking.countDocuments(filter),
    ]);

    res.json({ success: true, bookings, total, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Admin /bookings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin action on bookings (confirm / reject / cancel)
router.put('/bookings/:id/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const validActions = ['confirm', 'reject', 'cancel'];
    if (!validActions.includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });
    
    const statusMap = { confirm: 'confirmed', reject: 'rejected', cancel: 'cancelled' };
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    booking.status = statusMap[action];
    await booking.save();
    
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== STORE MANAGEMENT (Admin) ==========

router.get('/stores', async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};
    if (type && type !== 'all') filter.storeType = type;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const stores = await Store.find(filter)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/stores', async (req, res) => {
  try {
    const { ownerEmail, ownerName, ownerPassword, ...storeData } = req.body;
    let ownerId = null;

    // Create store owner account if email provided
    if (ownerEmail) {
      let owner = await User.findOne({ email: ownerEmail });
      if (!owner) {
        if (!ownerName || !ownerPassword) {
          return res.status(400).json({ success: false, message: 'ownerName and ownerPassword required to create new owner' });
        }
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(ownerPassword, 10);
        owner = await User.create({ name: ownerName, email: ownerEmail, password: hashed, role: 'store_owner', phone: storeData.phone || '', address: storeData.address || '' });
      } else {
        await User.findByIdAndUpdate(owner._id, { role: 'store_owner', phone: storeData.phone || owner.phone, address: storeData.address || owner.address });
      }
      ownerId = owner._id;
    }

    const store = await Store.create({ ...storeData, ownerId, ownerEmail: ownerEmail || '' });

    // Link storeId back to owner
    if (ownerId) await User.findByIdAndUpdate(ownerId, { storeId: store._id });

    res.status(201).json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/stores/:id', async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
    res.json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/stores/:id', async (req, res) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    await Product.deleteMany({ storeId: req.params.id });
    res.json({ success: true, message: 'Store and its products deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Manage ALL Items (Foods & Products) for Delivery Fees
router.get('/manage-items', async (req, res) => {
  try {
    const foods = await Food.find().populate('restaurantId', 'name').lean();
    const products = await Product.find().populate('storeId', 'name storeType').lean();
    
    const formattedFoods = foods.map(f => ({ ...f, itemType: 'food', vendorName: f.restaurantId?.name || 'Unknown' }));
    const formattedProducts = products.map(p => ({ ...p, itemType: 'product', vendorName: p.storeId?.name || 'Unknown' }));
    
    res.json({ success: true, items: [...formattedFoods, ...formattedProducts].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Update Item (Food or Product)
router.patch('/manage-items/:id', async (req, res) => {
  try {
    const { itemType, price, discountedPrice, offer, description, isAvailable } = req.body;
    
    if (!itemType || !['food', 'product'].includes(itemType)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing itemType' });
    }

    const updateData = {};
    
    // Safely parse price
    if (price !== undefined && price !== null && price !== '') {
      const p = Number(price);
      if (!isNaN(p)) updateData.price = p;
    }

    // Safely parse discountedPrice
    if (discountedPrice !== undefined && discountedPrice !== null && discountedPrice !== '') {
      const dp = Number(discountedPrice);
      if (!isNaN(dp)) updateData.discountedPrice = dp;
    } else if (discountedPrice === '' || discountedPrice === null) {
      updateData.discountedPrice = null;
    }

    // Safely parse offer
    if (offer !== undefined) {
      updateData.offer = offer;
    }

    // Safely parse description
    if (description !== undefined) {
      updateData.description = description;
    }

    // Safely parse isAvailable
    if (typeof isAvailable !== 'undefined') {
      updateData.isAvailable = Boolean(isAvailable);
    }

    let updatedItem;
    if (itemType === 'food') {
      updatedItem = await Food.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true });
    } else if (itemType === 'product') {
      updatedItem = await Product.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true });
    }

    if (!updatedItem) return res.status(404).json({ success: false, message: 'Item not found in database' });
    
    res.json({ success: true, item: { ...updatedItem.toObject(), itemType } });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ success: false, message: 'Backend error: ' + err.message });
  }
});

// Get user profile audit logs
router.get('/users/:id/audit-log', async (req, res) => {
  try {
    const ProfileAuditLog = require('../models/ProfileAuditLog');
    const logs = await ProfileAuditLog.find({ userId: req.params.id })
      .sort({ createdAt: -1 });
    res.json({ success: true, logs });
  } catch (err) {
    console.error('Fetch audit log error:', err);
    res.status(500).json({ success: false, message: 'Backend error: ' + err.message });
  }
});
// ========== VENDOR PAYOUTS ==========
router.get('/payouts', async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus: 'paid',
      vendorPayoutStatus: 'pending',
      $or: [{ restaurantId: { $ne: null } }, { storeId: { $ne: null } }]
    }).populate('restaurantId', 'name').populate('storeId', 'name');

    const payouts = {};
    for (const order of orders) {
      const isRestaurant = !!order.restaurantId;
      const vendorId = isRestaurant ? order.restaurantId._id : order.storeId._id;
      const vendorName = isRestaurant ? order.restaurantId.name : order.storeId.name;
      const key = `${isRestaurant ? 'restaurant' : 'store'}_${vendorId}`;
      
      if (!payouts[key]) {
        payouts[key] = {
          vendorId,
          vendorName,
          vendorType: isRestaurant ? 'restaurant' : 'store',
          pendingOrdersCount: 0,
          totalOwed: 0,
        };
      }
      payouts[key].pendingOrdersCount += 1;
      payouts[key].totalOwed += (order.vendorPayout || 0);
    }

    res.json({ success: true, payouts: Object.values(payouts) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payouts/settle', async (req, res) => {
  try {
    const { vendorId, vendorType, vendorName } = req.body;
    if (!vendorId || !vendorType) return res.status(400).json({ success: false, message: 'Vendor ID and Type required' });

    const filter = {
      paymentStatus: 'paid',
      vendorPayoutStatus: 'pending'
    };
    if (vendorType === 'restaurant') filter.restaurantId = vendorId;
    else filter.storeId = vendorId;

    const pendingOrders = await Order.find(filter);
    if (pendingOrders.length === 0) {
      return res.status(400).json({ success: false, message: 'No pending orders found for this vendor' });
    }

    const totalOwed = pendingOrders.reduce((sum, order) => sum + (order.vendorPayout || 0), 0);
    const orderIds = pendingOrders.map(order => order._id);

    // Create Payout Record
    const Payout = require('../models/Payout');
    await Payout.create({
      vendorId,
      vendorType,
      vendorName: vendorName || 'Vendor',
      amountPaid: totalOwed,
      orderCount: pendingOrders.length,
      orderIds
    });

    // Mark as paid
    const result = await Order.updateMany(filter, { $set: { vendorPayoutStatus: 'paid' } });
    res.json({ success: true, message: `Successfully settled ₹${totalOwed.toFixed(2)} across ${result.modifiedCount} orders.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/payout-history', async (req, res) => {
  try {
    const Payout = require('../models/Payout');
    const payouts = await Payout.find().sort({ createdAt: -1 });
    res.json({ success: true, payouts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
