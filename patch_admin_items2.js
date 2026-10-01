const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for bulkFeatured if it doesn't exist
if (!content.includes('const [bulkFeatured, setBulkFeatured]')) {
  content = content.replace(
    "const [bulkFreeDelivery, setBulkFreeDelivery] = useState(false);",
    "const [bulkFreeDelivery, setBulkFreeDelivery] = useState(false);\n  const [bulkFeatured, setBulkFeatured] = useState(false);"
  );
}

// 2. Add bulkFeatured to payload in handleBulkApply
if (!content.includes('payload.isFeatured = bulkFeatured;')) {
  content = content.replace(
    "payload.freeDelivery = bulkFreeDelivery;",
    "payload.freeDelivery = bulkFreeDelivery;\n      if(typeof bulkFeatured !== 'undefined') payload.isFeatured = bulkFeatured;"
  );
}

// 3. Reset bulkFeatured
if (!content.includes('setBulkFeatured(false);')) {
  content = content.replace(
    "setBulkFreeDelivery(false);",
    "setBulkFreeDelivery(false);\n      setBulkFeatured(false);"
  );
}

// 4. Render checkbox using regex for the exact HTML block to ensure whitespace matching
const targetHTML = `
                  <label className="ai-checkbox-label">
                    <input
                      type="checkbox"
                      checked={bulkFreeDelivery}
                      onChange={(e) => setBulkFreeDelivery(e.target.checked)}
                      className="ai-checkbox"
                    />
                    <span>Free Delivery</span>
                  </label>
`;

const replacementHTML = `
                  <label className="ai-checkbox-label">
                    <input
                      type="checkbox"
                      checked={bulkFreeDelivery}
                      onChange={(e) => setBulkFreeDelivery(e.target.checked)}
                      className="ai-checkbox"
                    />
                    <span>Free Delivery</span>
                  </label>
                  <label className="ai-checkbox-label">
                    <input
                      type="checkbox"
                      checked={bulkFeatured}
                      onChange={(e) => setBulkFeatured(e.target.checked)}
                      className="ai-checkbox"
                    />
                    <span>Featured Item</span>
                  </label>
`;

// Replace using regex, ignoring exact whitespace
content = content.replace(/<label className="ai-checkbox-label">\s*<input\s*type="checkbox"\s*checked=\{bulkFreeDelivery\}\s*onChange=\{\(e\) => setBulkFreeDelivery\(e\.target\.checked\)\}\s*className="ai-checkbox"\s*\/>\s*<span>Free Delivery<\/span>\s*<\/label>/, replacementHTML);

fs.writeFileSync(file, content);
console.log('Fixed AdminItems bulk featured');
