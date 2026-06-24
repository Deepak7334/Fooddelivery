const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  globalTaxRate: {
    type: Number,
    default: 5, // 5% default
    min: 0,
    max: 100
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
