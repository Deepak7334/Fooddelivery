const mongoose = require('mongoose');

const serviceAreaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincodes: [{ type: String }],
  deliveryFee: { type: Number, default: 30 },
  minimumOrderValue: { type: Number, default: 100 },
  estimatedDeliveryTime: { type: String, default: '30-45 mins' },
  operatingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '23:00' }
  },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });

module.exports = mongoose.model('ServiceArea', serviceAreaSchema);
