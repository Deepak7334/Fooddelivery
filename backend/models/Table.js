const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  maxGuests: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Availability tracking (daily)
  availability: [{
    date: {
      type: Date,
      required: true
    },
    availableSlots: [{
      slot: {
        type: String, // e.g., '18:00-20:00'
        required: true
      },
      isBooked: {
        type: Boolean,
        default: false
      }
    }]
  }]
}, { timestamps: true });

// Ensure table numbers are unique per restaurant
tableSchema.index({ restaurantId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);

