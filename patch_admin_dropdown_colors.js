const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

const newDropdown = `<select
                className="ai-type-filter active"
                style={{ padding: '6px 32px 6px 16px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', outline: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', appearance: 'auto', fontFamily: 'inherit' }}
                value={specialFilter}
                onChange={(e) => setSpecialFilter(e.target.value)}
              >
                <option value="all" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Any Status</option>
                <option value="featured" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Featured Items</option>
                <option value="freeDelivery" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Free Delivery</option>
                <option value="offers" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Offers</option>
              </select>`;

content = content.replace(oldDropdown, newDropdown);

fs.writeFileSync(file, content);
console.log('Fixed dropdown colors in AdminItems.jsx');
