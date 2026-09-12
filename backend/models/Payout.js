const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  vendorType: {
    type: String,
    enum: ['restaurant', 'store'],
    required: true,
  },
  vendorName: {
    type: String,
    required: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  totalOrderAmount: {
    type: Number,
    default: 0,
  },
  orderCount: {
    type: Number,
    required: true,
  },
  orderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);
