const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    default: null,           // null for store/product orders
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,           // null for food orders
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  image: String,
  unit: String,              // e.g. "500g", "1L" — for store products
  // --- New Advanced PDP Fields ---
  basePrice: Number,         // The price of the base item or variant before addons
  variantName: String,       // e.g. "Half Plate", "500g"
  addOns: [{
    name: String,
    price: Number
  }],
  spiceLevel: String,
  specialInstructions: String,
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
    default: null,           // null for store orders
  },
  restaurantName: String,
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null,           // null for food orders
  },
  storeName: String,
  orderType: {
    type: String,
    enum: ['food', 'product'],
    default: 'food',
  },
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
  isFirstOrder: {
    type: Boolean,
    default: false,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  adminCommission: {
    type: Number,
    default: 0,
  },
  vendorPayout: {
    type: Number,
    default: 0,
  },
  vendorPayoutStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'assignment_pending', 'out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer', 'delivered', 'cancelled'],
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
    addressLine1: String,
    addressLine2: String,
    landmark: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number
  },
  serviceAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceArea',
    default: null
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
  agentAccepted: {
    type: Boolean,
    default: false,
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
  alternatePhone: {
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
  deliveredAt: {
    type: Date,
    default: null
  },
  isReviewed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.deliveryAddress && typeof ret.deliveryAddress === 'object') {
      const { addressLine1, addressLine2, landmark, area, city, state, pincode } = ret.deliveryAddress;
      ret.deliveryAddress = [addressLine1, addressLine2, landmark, area, city, state, pincode].filter(Boolean).join(', ');
    }
    return ret;
  }
});


// ── Indexes for fast queries ──────────────────────────────────────────────────
// Customer order history (most common query)
orderSchema.index({ customerId: 1, createdAt: -1 });
// Restaurant/Store dashboard queries
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, status: 1, createdAt: -1 });
// Delivery agent assigned orders
orderSchema.index({ deliveryAgentId: 1, status: 1 });
// Admin: all pending orders sorted by time
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
