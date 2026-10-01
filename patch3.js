const fs = require('fs');
let file = 'frontend/src/pages/customer/CartPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });\n            }\n          } else if (cartType === 'product' && storeId) {",
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });\n            }\n            if (res.data?.restaurant?.deliveryFee !== undefined) setVendorFee(res.data.restaurant.deliveryFee);\n            if (res.data?.restaurant?.deliveryTime) setVendorTime(res.data.restaurant.deliveryTime);\n          } else if (cartType === 'product' && storeId) {"
);

c = c.replace(
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });\n            }\n          }\n        } catch (err) {",
  "if (lat != null && lng != null) setVendorLocation({ lat, lng });\n            }\n            if (res.data?.store?.deliveryFee !== undefined) setVendorFee(res.data.store.deliveryFee);\n            if (res.data?.store?.deliveryTime) setVendorTime(res.data.store.deliveryTime);\n          }\n        } catch (err) {"
);

c = c.replace("<span>Delivery Fee</span>", "<span>Delivery Fee ({vendorTime})</span>");

fs.writeFileSync(file, c);
console.log('patched');
