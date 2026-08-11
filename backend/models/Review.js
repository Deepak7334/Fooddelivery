const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can ref 'Restaurant' or 'Store', dynamically handled in logic
    default: null,
  },
  vendorType: {
    type: String,
    enum: ['restaurant', 'store'],
    default: 'restaurant',
  },
  vendorRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  vendorReview: {
    type: String,
    default: '',
  },
  deliveryAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deliveryRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  deliveryReview: {
    type: String,
    default: '',
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId, // Ref 'Food' or 'Product'
      required: true,
    },
    itemType: {
      type: String,
      enum: ['food', 'product'],
      default: 'food'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
