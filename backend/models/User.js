const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'admin', 'sub_admin', 'delivery', 'store_owner'],
    default: 'customer',
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    default: undefined, // Mongoose sparse indexes need undefined/null to not collide
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },
  loginProvider: {
    type: String,
    enum: ['local', 'phone', 'google', 'email_otp'],
    default: 'local',
  },
  emailOtp: {
    type: String,
    default: null,
  },
  emailOtpExpiry: {
    type: Date,
    default: null,
  },
  addresses: [{
    label: { type: String, enum: ['HOME', 'WORK', 'OTHER'], default: 'OTHER' },
    addressLine1: String,
    addressLine2: String,
    landmark: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number,
    isDefault: { type: Boolean, default: false }
  }],
  serviceAreaIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceArea'
  }],
  address: {
    type: String,
    default: '',
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  profileImage: {
    type: String,
    default: '',
  },
  // For delivery agents
  deliveryStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available',
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    lastUpdated: Date
  },
  vehicleNumber: {
    type: String,
    default: '',
  },
  rating: {
    type: Number,
    default: 4.0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  fcmToken: {
    type: String,
    default: null,
  },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
