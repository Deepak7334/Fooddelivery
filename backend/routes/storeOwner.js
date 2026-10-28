const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');

// All store-owner routes require auth + store_owner role
router.use(protect, authorize('store_owner'));

// ── Dashboard Stats ────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store linked to your account' });

    const [totalProducts, totalOrders, pendingOrders] = await Promise.all([
      Product.countDocuments({ storeId: store._id }),
      Order.countDocuments({ storeId: store._id }),
      Order.countDocuments({ storeId: store._id, status: 'pending' }),
    ]);

    const revenue = await Order.aggregate([
      { $match: { storeId: store._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]);

    res.json({
      success: true,
      store,
      stats: {
        totalProducts,
        totalOrders,
        pendingOrders,
        totalRevenue: revenue[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Products ───────────────────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });

    const products = await Product.find({ storeId: store._id }).sort({ category: 1, name: 1 });
    res.json({ success: true, products, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });

    const { name, description, price, discountedPrice, category, image, brand, unit, stock, isAvailable, isFeatured, tags, variants, ingredients, nutritionalInfo, storageInstructions, mfgDate, expiryDate, images } = req.body;
    if (!name || !price || !category) return res.status(400).json({ success: false, message: 'name, price and category are required' });

    const product = await Product.create({ name, description, price, discountedPrice, category, image, brand, unit, stock, isAvailable, isFeatured, tags, variants, ingredients, nutritionalInfo, storageInstructions, mfgDate, expiryDate, images, storeId: store._id });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId: store._id },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });

    const product = await Product.findOneAndDelete({ _id: req.params.id, storeId: store._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Orders ─────────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });

    const { status } = req.query;
    const filter = { storeId: store._id };
    if (status && status !== 'all') filter.status = status;

    const orders = await Order.find(filter)
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    const { status, otp } = req.body;
    const valid = ['accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findOne({ _id: req.params.id, storeId: store._id })
      .populate('customerId', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Verify OTP if marking as delivered
    if (status === 'delivered') {
      if (!otp) return res.status(400).json({ success: false, message: 'OTP is required to mark as delivered' });
      if (order.deliveryOTP !== otp.toString().trim()) {
        return res.status(400).json({ success: false, message: 'Incorrect OTP' });
      }
      order.otpVerified = true;
    }

    order.status = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status, timestamp: new Date() });

    // Generate and send OTP if marking out for delivery (only once)
    if (status === 'out_for_delivery') {
      const generatedOtp = order.deliveryOTP || Math.floor(100000 + Math.random() * 900000).toString();
      const hadOtp = !!order.deliveryOTP;
      order.deliveryOTP = generatedOtp;

      const customerEmail = order.customerEmail || order.customerId?.email;
      const customerName = (order.customerId?.name || 'Customer').replace(/^[0-9.eE+]+\s+/, '').trim() || 'Customer';
      if (!hadOtp && customerEmail) {
        const sendEmail = require('../utils/sendEmail');
        const { getDeliveryOtpEmailHtml } = require('../utils/emailTemplates');
        const agentName = order.deliveryAgentName || order.deliveryAgentId?.name || '';
        await sendEmail({
          to: customerEmail,
          subject: 'Your Delivery OTP - JDkart',
          html: getDeliveryOtpEmailHtml({ customerName, agentName, otp: generatedOtp }),
        }).catch(err => console.error('Failed to send store OTP email:', err));
        console.log(`📦 OTP for Store Order ${order._id}: ${generatedOtp} → sent to ${customerEmail}`);
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

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order:status_update', {
        orderId: order._id,
        status: order.status,
        statusHistory: order.statusHistory,
      });

      const NotificationService = require('../services/notificationService');
      await NotificationService.sendToCustomer(
        order.customerId._id || order.customerId,
        'Store Order Status Updated',
        `Your store order is now ${status.replace(/_/g, ' ')}.`,
        'ORDER_STATUS',
        io
      ).catch(console.error);
    }

    res.json({
      success: true,
      order,
      ...(status === 'out_for_delivery' && process.env.NODE_ENV !== 'production' ? { devOtp: order.deliveryOTP } : {})
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Store Profile ───────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });
    res.json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const store = await Store.findOneAndUpdate(
      { ownerId: req.user.id },
      req.body,
      { new: true }
    );
    if (!store) return res.status(404).json({ success: false, message: 'No store found' });
    res.json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
