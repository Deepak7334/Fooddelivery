const fs = require('fs');
let file = fs.readFileSync('backend/models/Food.js', 'utf8');
if (!file.includes('orderCount')) {
  file = file.replace(
    'isBestseller: {\n    type: Boolean,\n    default: false,\n  },',
    `isBestseller: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  orderCount: {
    type: Number,
    default: 0,
  },`
  );
  fs.writeFileSync('backend/models/Food.js', file);
  console.log("Fixed Food.js");
}
