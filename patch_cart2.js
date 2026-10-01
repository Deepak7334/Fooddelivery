const fs = require('fs');
let file = 'frontend/src/pages/customer/CartPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace for restaurant
content = content.replace(
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });",
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });\n              if (res.data.restaurant.deliveryFee !== undefined) setVendorFee(res.data.restaurant.deliveryFee);\n              if (res.data.restaurant.deliveryTime) setVendorTime(res.data.restaurant.deliveryTime);"
);

// Replace for store
content = content.replace(
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });",
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });\n              if (res.data.store.deliveryFee !== undefined) setVendorFee(res.data.store.deliveryFee);\n              if (res.data.store.deliveryTime) setVendorTime(res.data.store.deliveryTime);"
);

// Also replace the hardcoded "30-45 mins" in the display!
content = content.replace(
  "<span>30-45 mins</span>",
  "<span>{vendorTime}</span>"
);
content = content.replace(
  "<span>30-45 mins</span>",
  "<span>{vendorTime}</span>"
);

fs.writeFileSync(file, content);
console.log('CartPage patched');
