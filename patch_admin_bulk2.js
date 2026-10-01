const fs = require('fs');
let file = 'backend/routes/admin.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('updateData.isFeatured =')) {
  content = content.replace(
    "if (offer !== undefined) {\n      updateData.offer = offer;\n    }",
    "if (offer !== undefined) {\n      updateData.offer = offer;\n    }\n    if (typeof isFeatured !== 'undefined') {\n      updateData.isFeatured = Boolean(isFeatured);\n    }"
  );
}

fs.writeFileSync(file, content);
console.log('Fixed backend admin route for bulk isFeatured');
