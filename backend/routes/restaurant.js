const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');
const { getDeliveryOtpEmailHtml } = require('../utils/emailTemplates');

// All restaurant routes require auth + restaurant role
router.use(protect, authorize('restaurant'));

// ========== MY RESTAURANT ==========
router.get('/my-restaurant', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/my-restaurant', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user.restaurantId,
      { isOpen: req.body.isOpen, deliveryTime: req.body.deliveryTime, phone: req.body.phone },
      { new: true }
    );
    res.json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== DASHBOARD STATS ==========
router.get('/stats', async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const [totalOrders, pendingOrders, revenueAgg, totalFoods] = await Promise.all([
      Order.countDocuments({ restaurantId }),
      Order.countDocuments({ restaurantId, status: { $in: ['pending', 'accepted', 'preparing'] } }),
      Order.aggregate([
        { $match: { restaurantId: restaurantId, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Food.countDocuments({ restaurantId }),
    ]);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ restaurantId, createdAt: { $gte: todayStart } });
    res.json({
      success: true,
      stats: {
        totalOrders, pendingOrders, todayOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
        totalFoods,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== MENU MANAGEMENT ==========
router.get('/menu', async (req, res) => {
  try {
    const foods = await Food.find({ restaurantId: req.user.restaurantId }).lean();
    res.json({ success: true, foods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/menu', async (req, res) => {
  try {
    const food = await Food.create({ ...req.body, restaurantId: req.user.restaurantId });
    res.status(201).json({ success: true, food });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/menu/:id', async (req, res) => {
  try {
    const food = await Food.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId },
      req.body,
      { new: true }
    );
    if (!food) return res.status(404).json({ success: false, message: 'Food item not found' });
    res.json({ success: true, food });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/menu/:id', async (req, res) => {
  try {
    await Food.findOneAndDelete({ _id: req.params.id, restaurantId: req.user.restaurantId });
    res.json({ success: true, message: 'Food item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== ORDER MANAGEMENT ==========
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { restaurantId: req.user.restaurantId };
    if (status) filter.status = status;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email phone').lean();
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId })
      .populate('customerId', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date() });

    // Auto-generate and send OTP when order goes out for delivery (only once)
    if (status === 'out_for_delivery') {
      const otp = order.deliveryOTP || generateOTP();
      const hadOtp = !!order.deliveryOTP;
      order.deliveryOTP = otp;

      const customerEmail = order.customerEmail || order.customerId?.email;
      const customerName = (order.customerId?.name || 'Customer').replace(/^[0-9.eE+]+\s+/, '').trim() || 'Customer';

      // Send OTP email only if not already sent
      if (!hadOtp && customerEmail) {
        const agentName = order.deliveryAgentName || order.deliveryAgentId?.name || '';
        await sendEmail({
          to: customerEmail,
          subject: 'Your Delivery OTP - JDkart',
          html: getDeliveryOtpEmailHtml({ customerName, agentName, otp }),
        }).catch(err => console.error('Failed to send restaurant OTP email:', err));

        console.log(` OTP for Order ${order._id}: ${otp} → sent to ${customerEmail}`);
      }
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'cod') {
        order.paymentStatus = 'paid';
      }
      if (order.deliveryAgentId) {
        const User = require('../models/User');
        await User.findByIdAndUpdate(order.deliveryAgentId, { deliveryStatus: 'available' });
      }
    }

    await order.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:status_update', {
      orderId: order._id,
      status: order.status,
      statusHistory: order.statusHistory,
    });
    io.to(`restaurant_${req.user.restaurantId}`).emit('order:updated', order);

    const NotificationService = require('../services/notificationService');
    await NotificationService.sendToCustomer(
      order.customerId._id || order.customerId,
      'Order Status Updated',
      `Your order is now ${status.replace(/_/g, ' ')}.`,
      'ORDER_STATUS',
      io
    ).catch(console.error);

    res.json({
      success: true,
      order,
      // Return OTP in dev mode so restaurant can see it during testing
      ...(status === 'out_for_delivery' && process.env.NODE_ENV !== 'production' ? { devOtp: order.deliveryOTP } : {})
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send OTP when out for delivery
router.post('/orders/:id/send-otp', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId })
      .populate('customerId', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ success: false, message: 'Order must be out for delivery to send OTP' });
    }

    const otp = generateOTP();
    order.deliveryOTP = otp;
    await order.save();

    // Send email
    await sendEmail({
      to: order.customerEmail || order.customerId?.email,
      subject: 'JDkart - Delivery OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
          <h2 style="color:#FF5722">JDkart Delivery OTP</h2>
          <p>Hi <strong>${order.customerId?.name || 'Customer'}</strong>,</p>
          <p>Your order is arriving! Share this OTP with the delivery agent:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#FF5722;padding:20px;background:#FFF3E0;border-radius:8px;margin:20px 0">${otp}</div>
          <p style="color:#666;font-size:13px">Do NOT share this OTP before delivery. Valid for this delivery only.</p>
        </div>
      `,
    });

    console.log(` OTP for Order ${order._id}: ${otp}`);

    // Emit to customer
    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order:otp_sent', { message: 'OTP sent to your email' });

    res.json({ success: true, message: 'OTP sent to customer', otp: process.env.NODE_ENV === 'development' ? otp : undefined });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
