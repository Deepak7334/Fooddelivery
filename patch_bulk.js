const fs = require('fs');
let file = 'backend/routes/admin.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const { itemIds, freeDelivery, offer } = req.body;",
  "const { itemIds, freeDelivery, offer, isFeatured } = req.body;"
);

content = content.replace(
  "if (offer !== undefined) {\n        updateData.offer = offer;\n      }",
  "if (offer !== undefined) {\n        updateData.offer = offer;\n      }\n      if (typeof isFeatured !== 'undefined') {\n        updateData.isFeatured = Boolean(isFeatured);\n      }"
);

fs.writeFileSync(file, content);
console.log('done');
