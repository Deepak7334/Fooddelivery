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
  preparationTime: {
    type: String,
    default: '15-20 mins',
  },
  tags: [{
    type: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Food', foodSchema);
