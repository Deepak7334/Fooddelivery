const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discountedPrice: {
    type: Number,
    default: null,
  },
  offer: {
    type: String,
    default: '',
  },
  deliveryFee: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isVeg: {
    type: Boolean,
    default: false,
  },
  isBestseller: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 4.0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  preparationTime: {
    type: String,
    default: '15-20 mins',
  },
  tags: [{
    type: String,
  }],
  // --- New Advanced PDP Fields ---
  images: [{
    type: String
  }],
  variants: [{
    name: { type: String, required: true }, // e.g. "Half", "Full", "Family Pack"
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: null },
    isAvailable: { type: Boolean, default: true },
  }],
  addOns: [{
    name: { type: String, required: true }, // e.g. "Extra Cheese"
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
  }],
  spiceLevels: [{
    type: String // e.g. "Mild", "Medium", "Spicy"
  }],
  freeDelivery: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });


// ── Indexes for fast queries ──────────────────────────────────────────────────
// Menu page: GET foods for a restaurant (most common query)
foodSchema.index({ restaurantId: 1, isAvailable: 1 });
// Homepage: sorted by isFeatured then createdAt
foodSchema.index({ isFeatured: -1, createdAt: -1 });
// Category filter
foodSchema.index({ category: 1, isAvailable: 1 });

module.exports = mongoose.model('Food', foodSchema);
