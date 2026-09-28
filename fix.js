const fs = require('fs');
let file = fs.readFileSync('backend/models/Product.js', 'utf8');
file = file.replace('isFeatured: { type: Boolean, default: false },\\n  orderCount: { type: Number, default: 0 },', 
`isFeatured: { type: Boolean, default: false },
  orderCount: { type: Number, default: 0 },`);
fs.writeFileSync('backend/models/Product.js', file);
