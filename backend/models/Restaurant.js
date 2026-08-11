const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  cuisine: [{
    type: String,
  }],
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    default: '',
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  image: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  ownerEmail: {
    type: String,
    default: '',
  },
  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  deliveryTime: {
    type: String,
    default: '30-40 mins',
  },
  deliveryFee: {
    type: Number,
    default: 30,
  },
  minOrder: {
    type: Number,
    default: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  categories: [{
    type: String,
  }],
  offers: [{
    type: String,
  }],
  phone: {
    type: String,
    default: '',
  },
}, {
  timestamps: true
});

restaurantSchema.add({
  tables: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }],
  bookingEnabled: {
    type: Boolean,
    default: true
  }
});

restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
