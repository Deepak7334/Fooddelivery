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
    const { orderIds } = req.body;
    if (!orderIds || orderIds.length === 0) return res.status(400).json({ success: false, message: 'No orders provided' });
    
    const orders = await Order.find({ _id: { $in: orderIds }, customerId: req.user._id });
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Orders not found' });
    
    const finalAmount = orders.reduce((sum, o) => sum + o.finalAmount, 0);

    // If no real Razorpay key, return mock
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_yourkeyhere') {
      const mockRzpOrderId = 'order_mock_' + Date.now();
      await Order.updateMany(
        { _id: { $in: orderIds }, customerId: req.user._id },
        { razorpayOrderId: mockRzpOrderId, paymentStatus: 'paid', status: 'pending' }
      );
      return res.json({
        success: true,
        mock: true,
        razorpayOrderId: mockRzpOrderId,
        amount: finalAmount * 100,
        currency: 'INR',
        key: 'rzp_test_mock',
        orderIds,
      });
    }

    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: orders[0]._id.toString(), // just use first order id as receipt
    });

    await Order.updateMany(
      { _id: { $in: orderIds }, customerId: req.user._id },
      { razorpayOrderId: rzpOrder.id }
    );

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      orderIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify payment signature
router.post('/verify', protect, authorize('customer'), async (req, res) => {
  try {
    const { orderIds, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Mock payment success
    if (razorpayPaymentId === 'mock_payment') {
      await Order.updateMany(
        { _id: { $in: orderIds }, customerId: req.user._id },
        { paymentStatus: 'paid', razorpayPaymentId, status: 'pending' }
      );
      
      // Notify vendors
      const updatedOrders = await Order.find({ _id: { $in: orderIds } });
      const io = req.app.get('io');
      updatedOrders.forEach(o => {
        const room = o.orderType === 'food' ? `restaurant_${o.restaurantId}` : `store_${o.storeId}`;
        io.to(room).emit('order:new', o);
      });
      
      return res.json({ success: true, message: 'Payment verified' });
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

    await Order.updateMany(
      { _id: { $in: orderIds }, customerId: req.user._id },
      { paymentStatus: 'paid', razorpayPaymentId, razorpayOrderId, status: 'pending' }
    );

    // Notify vendors
    const updatedOrders = await Order.find({ _id: { $in: orderIds } });
    const io = req.app.get('io');
    updatedOrders.forEach(o => {
      const room = o.orderType === 'food' ? `restaurant_${o.restaurantId}` : `store_${o.storeId}`;
      io.to(room).emit('order:new', o);
    });

    res.json({ success: true, message: 'Payment verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
