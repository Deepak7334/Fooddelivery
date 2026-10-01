const fs = require('fs');
let file = 'frontend/src/pages/customer/HomePage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove pharmacy, electronics, beauty
content = content.replace(
  "{ _id: 'pharmacy', name: 'Pharmacy', icon: '💊', color: '#2196F3', type: 'store' },",
  ""
);
content = content.replace(
  "{ _id: 'electronics', name: 'Electronics', icon: '📱', color: '#9C27B0', type: 'store' },",
  ""
);
content = content.replace(
  "{ _id: 'beauty', name: 'Beauty', icon: '🧴', color: '#E91E63', type: 'store' },",
  ""
);

fs.writeFileSync(file, content);
console.log('Removed categories');
