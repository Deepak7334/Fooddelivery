const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');
const { getDeliveryOtpEmailHtml } = require('../utils/emailTemplates');

// All delivery routes require auth + delivery role
router.use(protect, authorize('delivery'));

// ── Get My Assigned Orders ────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { deliveryAgentId: req.user._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ updatedAt: -1 })
      .populate('customerId', 'name phone email')
      .populate('restaurantId', 'name address phone')
      .populate('storeId', 'name address phone')
      .lean();

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get Active (current) orders for delivery boy ───────────────────────────────
router.get('/orders/active', async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryAgentId: req.user._id,
      status: { $in: ['out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer'] },
    })
      .populate('customerId', 'name phone email')
      .populate('restaurantId', 'name address phone')
      .populate('storeId', 'name address phone')
      .lean();

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get Single Order for delivery boy ───────────────────────────────────────
router.get('/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name phone email')
      .populate('restaurantId', 'name address phone')
      .populate('storeId', 'name address phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found in database' });
    
    // Check if the agent is authorized to view this order
    if (order.deliveryAgentId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Accept assigned order ─────────────────────────────────────────────────────
router.patch('/orders/:id/accept', async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      deliveryAgentId: req.user._id,
      status: { $in: ['assignment_pending', 'out_for_delivery'] },
    }).populate('customerId', 'name phone email').populate('restaurantId', 'name address phone').populate('storeId', 'name address phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });

    order.status = 'accepted_by_driver';
    order.agentAccepted = true;
    order.statusHistory.push({ status: 'accepted_by_driver', timestamp: new Date(), note: 'Accepted by delivery agent' });

    // Generate and send OTP to customer (only once)
    if (!order.deliveryOTP) {
      const otp = generateOTP();
      order.deliveryOTP = otp;
      const customerEmail = order.customerEmail || order.customerId?.email;
      const customerName = order.customerId?.name || 'Customer';
      const agentName = req.user.name || order.deliveryAgentName || '';

      if (customerEmail) {
        sendEmail({
          to: customerEmail,
          subject: 'Your Delivery OTP - JDkart',
          html: getDeliveryOtpEmailHtml({ customerName, agentName, otp }),
        }).catch(err => console.error('Failed to send OTP email on agent accept', err));
      }
    }

    await order.save();

    // Mark agent as busy (they can still accept more, but they are technically busy delivering)
    await User.findByIdAndUpdate(req.user._id, { deliveryStatus: 'busy' });

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', { orderId: order._id, status: order.status, statusHistory: order.statusHistory });

    res.json({ success: true, order, ...(process.env.NODE_ENV !== 'production' && order.deliveryOTP ? { devOtp: order.deliveryOTP } : {}) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Reject assigned order (admin will reassign) ───────────────────────────────
router.patch('/orders/:id/reject', async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      deliveryAgentId: req.user._id,
      status: { $in: ['assignment_pending', 'out_for_delivery'] },
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });

    // Un-assign the agent
    order.deliveryAgentId = null;
    order.deliveryAgentName = '';
    order.agentAccepted = false;
    order.status = 'preparing'; // Revert to preparing so admin can reassign
    order.statusHistory.push({ status: 'preparing', timestamp: new Date(), note: `Rejected by delivery agent ${req.user.name}` });
    await order.save();

    // Set agent back to available
    await User.findByIdAndUpdate(req.user._id, { deliveryStatus: 'available' });

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', { orderId: order._id, status: order.status, statusHistory: order.statusHistory });
    if (order.restaurantId) io.to(`restaurant_${order.restaurantId}`).emit('order:updated', order);
    if (order.storeId) io.to(`store_${order.storeId}`).emit('order:updated', order);

    res.json({ success: true, message: 'Order rejected. Admin will reassign.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update delivery status ────────────────────────────────────────────────────
// Delivery boy can progress through granular states
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update for delivery agent.' });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      deliveryAgentId: req.user._id,
      status: { $in: ['accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer'] }
    }).populate('customerId', 'name phone email').populate('restaurantId', 'name address phone').populate('storeId', 'name address phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found or wrong state' });

    if (status === 'reached_customer' && order.status !== 'reached_customer') {
      // Ensure OTP exists (reuse existing OTP, never overwrite it with a new one)
      if (!order.deliveryOTP) {
        order.deliveryOTP = generateOTP();
      }
      const otp = order.deliveryOTP;

      // Send In-App & Push Notification only (no duplicate email)
      const NotificationService = require('../services/notificationService');
      await NotificationService.sendToCustomer(
        order.customerId?._id || order.customerId,
        'Delivery Arrived!',
        `Your delivery agent ${req.user.name} has arrived. Please share your delivery OTP: ${otp}`,
        'ORDER_STATUS',
        req.app.get('io')
      ).catch(console.error);
    }

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note: `Delivery agent: ${status}` });
    await order.save();

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', { orderId: order._id, status: order.status, statusHistory: order.statusHistory });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Verify OTP and complete delivery ─────────────────────────────────────────
router.post('/orders/:id/verify-otp', async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      deliveryAgentId: req.user._id,
      status: 'reached_customer',
    }).populate('customerId', 'name phone email');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found or wrong state' });
    if (order.deliveryOTP !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please ask customer to confirm the code.' });
    }

    order.status = 'delivered';
    order.otpVerified = true;
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }
    order.statusHistory.push({ status: 'delivered', timestamp: order.deliveredAt, note: 'OTP verified by delivery agent' });
    await order.save();

    // Check if agent has other active orders
    const otherActiveOrders = await Order.countDocuments({
      deliveryAgentId: req.user._id,
      status: { $in: ['out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer'] }
    });

    if (otherActiveOrders === 0) {
      // Set agent back to available only if no other active deliveries
      await User.findByIdAndUpdate(req.user._id, { deliveryStatus: 'available' });
    }

    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', { orderId: order._id, status: 'delivered', statusHistory: order.statusHistory });
    if (order.restaurantId) io.to(`restaurant_${order.restaurantId}`).emit('order:delivered', { orderId: order._id });
    if (order.storeId) io.to(`store_${order.storeId}`).emit('order:delivered', { orderId: order._id });

    res.json({ success: true, message: '🎉 Delivery confirmed! Earn ₹' + (order.deliveryFee || 0) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Earnings & History ────────────────────────────────────────────────────────
router.get('/earnings', async (req, res) => {
  try {
    const allOrders = await Order.find({ deliveryAgentId: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('restaurantId', 'name');

    const delivered = allOrders.filter(o => o.status === 'delivered');
    const totalEarnings = delivered.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    // Weekly breakdown
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeek = delivered.filter(o => new Date(o.updatedAt) >= startOfWeek);
    const weeklyEarnings = thisWeek.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    // Today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const today = delivered.filter(o => new Date(o.updatedAt) >= todayStart);
    const todayEarnings = today.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    res.json({
      success: true,
      stats: {
        totalDeliveries: delivered.length,
        totalEarnings,
        weeklyEarnings,
        todayEarnings,
        todayDeliveries: today.length,
        activeOrders: allOrders.filter(o => ['out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer'].includes(o.status)).length,
      },
      history: allOrders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Toggle availability ───────────────────────────────────────────────────────
router.patch('/availability', async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    if (!['available', 'offline'].includes(deliveryStatus)) {
      return res.status(400).json({ success: false, message: 'Can only set available or offline' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { deliveryStatus }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update Location (GPS polling from driver app) ──────────────────────────
router.patch('/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ success: false, message: 'Coords required' });

    const user = await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)], lastUpdated: new Date() }
    }, { new: true });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get my profile ────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
