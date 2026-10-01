const fs = require('fs');
let file = 'frontend/src/pages/customer/CartPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `
      const fetchVendor = async () => {
        try {
          if (cartType === 'food' && restaurantId) {
            const res = await api.get(\`/customer/restaurants/\${restaurantId}\`);
            const loc = res.data?.restaurant?.location;
            if (loc) {
              let lat = loc.lat != null ? loc.lat : (loc.coordinates ? loc.coordinates[1] : null);
              let lng = loc.lng != null ? loc.lng : (loc.coordinates ? loc.coordinates[0] : null);
              if (lat != null && lng != null) setVendorLocation({ lat, lng });
              if (res.data.store.deliveryFee !== undefined) setVendorFee(res.data.store.deliveryFee);
              if (res.data.store.deliveryTime) setVendorTime(res.data.store.deliveryTime);
              if (res.data.restaurant.deliveryFee !== undefined) setVendorFee(res.data.restaurant.deliveryFee);
              if (res.data.restaurant.deliveryTime) setVendorTime(res.data.restaurant.deliveryTime);
            }
          } else if (cartType === 'product' && storeId) {
            const res = await api.get(\`/store/stores/\${storeId}\`);
            const loc = res.data?.store?.location;
            if (loc) {
              let lat = loc.lat != null ? loc.lat : (loc.coordinates ? loc.coordinates[1] : null);
              let lng = loc.lng != null ? loc.lng : (loc.coordinates ? loc.coordinates[0] : null);
              if (lat != null && lng != null) setVendorLocation({ lat, lng });
            }
          }
        } catch (err) {
          console.error("Failed to fetch vendor details", err);
        }
      };
`;

const newBlock = `
      const fetchVendor = async () => {
        try {
          if (cartType === 'food' && restaurantId) {
            const res = await api.get(\`/customer/restaurants/\${restaurantId}\`);
            const loc = res.data?.restaurant?.location;
            if (res.data?.restaurant?.deliveryFee !== undefined) setVendorFee(res.data.restaurant.deliveryFee);
            if (res.data?.restaurant?.deliveryTime) setVendorTime(res.data.restaurant.deliveryTime);
            if (loc) {
              let lat = loc.lat != null ? loc.lat : (loc.coordinates ? loc.coordinates[1] : null);
              let lng = loc.lng != null ? loc.lng : (loc.coordinates ? loc.coordinates[0] : null);
              if (lat != null && lng != null) setVendorLocation({ lat, lng });
            }
          } else if (cartType === 'product' && storeId) {
            const res = await api.get(\`/store/stores/\${storeId}\`);
            const loc = res.data?.store?.location;
            if (res.data?.store?.deliveryFee !== undefined) setVendorFee(res.data.store.deliveryFee);
            if (res.data?.store?.deliveryTime) setVendorTime(res.data.store.deliveryTime);
            if (loc) {
              let lat = loc.lat != null ? loc.lat : (loc.coordinates ? loc.coordinates[1] : null);
              let lng = loc.lng != null ? loc.lng : (loc.coordinates ? loc.coordinates[0] : null);
              if (lat != null && lng != null) setVendorLocation({ lat, lng });
            }
          }
        } catch (err) {
          console.error("Failed to fetch vendor details", err);
        }
      };
`;

let cleanedOldBlock = oldBlock.trim().replace(/\s+/g, ' ');
let currentContent = content.replace(/\s+/g, ' ');

// Using a slightly more robust regex or direct replace
content = content.replace(/const fetchVendor = async \(\) => \{[\s\S]*?\} catch \(err\) \{[\s\S]*?console\.error\("Failed to fetch vendor details", err\);[\s\S]*?\}[\s\S]*?\};/, newBlock.trim());

fs.writeFileSync(file, content);
console.log('Fixed CartPage fetchVendor');
