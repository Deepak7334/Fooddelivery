const fs = require('fs');
let file = 'frontend/src/pages/customer/HomePage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\.sort\(\(a, b\) => a\._id > b\._id \? 1 : -1\);/g,
  `.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) {
          return a.isFeatured ? -1 : 1;
        }
        return a._id > b._id ? 1 : -1;
      });`
);

fs.writeFileSync(file, content);
console.log('Fixed mixedItems sorting in HomePage.jsx');
