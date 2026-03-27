const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');

const getRazorpay = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder',
  });
};

// Create Razorpay order
router.post('/create-order', protect, authorize('customer'), async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // If no real Razorpay key, return mock
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_yourkeyhere') {
      const mockRzpOrderId = 'order_mock_' + Date.now();
      order.razorpayOrderId = mockRzpOrderId;
      order.paymentStatus = 'paid';
      order.status = 'pending';
      await order.save();
      return res.json({
        success: true,
        mock: true,
        razorpayOrderId: mockRzpOrderId,
        amount: order.finalAmount * 100,
        currency: 'INR',
        key: 'rzp_test_mock',
        orderId: order._id,
      });
    }

    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(order.finalAmount * 100),
      currency: 'INR',
      receipt: order._id.toString(),
    });

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify payment signature
router.post('/verify', protect, authorize('customer'), async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Mock payment success
    if (razorpayPaymentId === 'mock_payment') {
      const order = await Order.findOneAndUpdate(
        { _id: orderId, customerId: req.user._id },
        { paymentStatus: 'paid', razorpayPaymentId, status: 'pending' },
        { new: true }
      );
      const io = req.app.get('io');
      io.to(`restaurant_${order.restaurantId}`).emit('order:new', order);
      return res.json({ success: true, message: 'Payment verified', order });
    }

    // Real signature verification
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, customerId: req.user._id },
      { paymentStatus: 'paid', razorpayPaymentId, razorpayOrderId, status: 'pending' },
      { new: true }
    );

    const io = req.app.get('io');
    io.to(`restaurant_${order.restaurantId}`).emit('order:new', order);

    res.json({ success: true, message: 'Payment verified', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
