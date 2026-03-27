const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true,
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  image: String,
});

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  restaurantName: String,
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  deliveryFee: {
    type: Number,
    default: 30,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'out_for_delivery', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod', 'wallet'],
    default: 'razorpay',
  },
  razorpayOrderId: {
    type: String,
    default: '',
  },
  razorpayPaymentId: {
    type: String,
    default: '',
  },
  deliveryAddress: {
    type: String,
    required: true,
  },
  deliveryAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deliveryAgentName: {
    type: String,
    default: '',
  },
  deliveryOTP: {
    type: String,
    default: null,
  },
  otpVerified: {
    type: Boolean,
    default: false,
  },
  estimatedDeliveryTime: {
    type: String,
    default: '30-45 mins',
  },
  customerPhone: {
    type: String,
    default: '',
  },
  customerEmail: {
    type: String,
    default: '',
  },
  specialInstructions: {
    type: String,
    default: '',
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
