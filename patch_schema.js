const fs = require('fs');

// Update Food.js
let foodFile = 'backend/models/Food.js';
let foodContent = fs.readFileSync(foodFile, 'utf8');
if (!foodContent.includes('isFeatured')) {
  foodContent = foodContent.replace('  isAvailable: {', "  isFeatured: {\n    type: Boolean,\n    default: false,\n  },\n  isAvailable: {");
  fs.writeFileSync(foodFile, foodContent);
}

// Update Product.js
let productFile = 'backend/models/Product.js';
let productContent = fs.readFileSync(productFile, 'utf8');
if (!productContent.includes('isFeatured')) {
  productContent = productContent.replace('  isAvailable: {', "  isFeatured: {\n    type: Boolean,\n    default: false,\n  },\n  isAvailable: {");
  fs.writeFileSync(productFile, productContent);
}
console.log('Schemas updated');
