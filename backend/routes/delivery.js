const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');

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
      .populate('storeId', 'name address phone');

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
      .populate('storeId', 'name address phone');

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

    // Generate and send OTP to customer
    if (!order.deliveryOTP) {
      const otp = generateOTP();
      order.deliveryOTP = otp;
      const customerEmail = order.customerEmail || order.customerId?.email;
      const customerName = order.customerId?.name || 'Customer';

      try {
        await sendEmail({
          to: customerEmail,
          subject: '🚴 JDmart — Your Delivery Agent is Assigned',
          html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#FF5722,#FF9800);padding:28px 24px;text-align:center"><h1 style="color:#fff;margin:0">🍕 JDmart</h1><p style="color:rgba(255,255,255,0.9);margin:6px 0 0">Delivery Partner Assigned!</p></div><div style="padding:28px 24px"><p>Hi <strong>${customerName}</strong>,</p><p><strong>${req.user.name}</strong> has been assigned to your order and is heading out.</p><p>Share this OTP with them to confirm delivery:</p><div style="text-align:center;margin:24px 0"><div style="display:inline-block;background:#FFF3E0;border:2px dashed #FF5722;border-radius:12px;padding:16px 32px"><div style="font-size:11px;font-weight:700;color:#FF5722;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Delivery OTP</div><div style="font-size:42px;font-weight:900;color:#FF5722;letter-spacing:12px;font-family:monospace">${otp}</div></div></div><p style="font-size:13px;color:#888;text-align:center">⚠️ Do NOT share before the agent arrives.</p></div></div>`,
        });
      } catch (err) {
        console.error('Failed to send OTP email on agent accept', err);
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
      // Generate OTP
      const otp = generateOTP();
      order.deliveryOTP = otp;

      // Send Email (do not await so it doesn't block response)
      if (order.customerId && order.customerId.email) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #F97316; text-align: center;">Delivery Arrived! 🚴</h2>
            <p>Hi ${order.customerId.name || 'Customer'},</p>
            <p>Your delivery agent <strong>${req.user.name}</strong> has reached your location with your order.</p>
            <p>Please provide the following OTP to the agent to securely receive your order:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: 800; background: #f3f4f6; padding: 10px 24px; border-radius: 8px; letter-spacing: 4px; color: #111827;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Do not share this OTP with anyone else. The agent needs it to mark your order as delivered.</p>
            <p style="margin-top: 30px;">Thank you for choosing us!<br><strong>The JDmart Team</strong></p>
          </div>
        `;
        sendEmail({
          to: order.customerId.email,
          subject: 'Your Delivery OTP - JDmart',
          html
        }).catch(err => console.error('Failed to send OTP email:', err));
      }
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
      location: { lat, lng, lastUpdated: new Date() }
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
