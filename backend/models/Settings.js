const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  globalTaxRate: {
    type: Number,
    default: 5, // 5% default
    min: 0,
    max: 100
  },
  platformCommissionRate: {
    type: Number,
    default: 15, // 15% default commission
    min: 0,
    max: 100
  },
  promoBannerActive: { type: Boolean, default: false },
  promoBannerText: { type: String, default: '' },
  firstOrderFreeDelivery: { type: Boolean, default: true },
  firstOrderMinAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
