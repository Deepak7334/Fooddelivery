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
    enum: ['customer', 'restaurant', 'admin', 'delivery', 'store_owner'],
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
    label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Other' },
    name: String,
    address: String, // Full address string
    district: String,
    state: String,
    pincode: String,
    alternatePhone: String,
    landmark: String,
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
  fcmToken: {
    type: String,
    default: null,
  },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
