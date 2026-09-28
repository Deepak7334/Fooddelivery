const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  discountedPrice: { type: Number, default: null },
  offer: { type: String, default: '' },
  deliveryFee: { type: Number, default: 0 },
  category: { type: String, required: true },   // e.g. "Fruits & Veggies", "Dairy", "Snacks"
  image: { type: String, default: '' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  brand: { type: String, default: '' },
  unit: { type: String, default: '' },          // e.g. "500g", "1L", "1 pc", "Pack of 6"
  stock: { type: Number, default: -1 },         // -1 = unlimited
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  orderCount: { type: Number, default: 0 },
  rating: { type: Number, default: 4.0 },
  totalRatings: { type: Number, default: 0 },
  tags: [{ type: String }],
  // --- New Advanced PDP Fields ---
  images: [{ type: String }],
  variants: [{
    weight: { type: String, required: true }, // e.g. "100g", "1kg", "1L"
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: null },
    stock: { type: Number, default: -1 },
    isAvailable: { type: Boolean, default: true },
  }],
  mfgDate: { type: Date },
  expiryDate: { type: Date },
  ingredients: { type: String, default: '' },
  nutritionalInfo: { type: String, default: '' },
  storageInstructions: { type: String, default: '' },
  freeDelivery: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
