const fs = require('fs');
let file = 'backend/routes/customer.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "if (rest) fee = rest.deliveryFee || 0;",
  "if (rest) fee = rest.deliveryFee !== undefined ? rest.deliveryFee : 30;"
);

content = content.replace(
  "if (store) fee = store.deliveryFee || 0;",
  "if (store) fee = store.deliveryFee !== undefined ? store.deliveryFee : 30;"
);

fs.writeFileSync(file, content);
console.log('Customer route patched');
