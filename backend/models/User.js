const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'admin', 'delivery'],
    default: 'customer',
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
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
  vehicleNumber: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
