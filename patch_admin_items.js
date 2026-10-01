const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for bulkFeatured
content = content.replace(
  "const [bulkFreeDelivery, setBulkFreeDelivery] = useState(false);",
  "const [bulkFreeDelivery, setBulkFreeDelivery] = useState(false);\n  const [bulkFeatured, setBulkFeatured] = useState(false);"
);

// 2. Add bulkFeatured to payload in handleBulkApply
content = content.replace(
  "// Always send freeDelivery to allow toggling it OFF in bulk\n      payload.freeDelivery = bulkFreeDelivery;",
  "// Always send freeDelivery to allow toggling it OFF in bulk\n      payload.freeDelivery = bulkFreeDelivery;\n      payload.isFeatured = bulkFeatured;"
);

// 3. Reset bulkFeatured
content = content.replace(
  "setBulkFreeDelivery(false);",
  "setBulkFreeDelivery(false);\n      setBulkFeatured(false);"
);

// 4. Render checkbox
content = content.replace(
  `                  <label className="ai-checkbox-label">
                    <input
                      type="checkbox"
                      checked={bulkFreeDelivery}
                      onChange={(e) => setBulkFreeDelivery(e.target.checked)}
                      className="ai-checkbox"
                    />
                    <span>Free Delivery</span>
                  </label>`,
  `                  <label className="ai-checkbox-label">
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
                  </label>`
);

fs.writeFileSync(file, content);
console.log('done frontend patch');
