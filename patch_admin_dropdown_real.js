const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

const newUI = `            <div className="ai-type-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {itemTypes.map(t => (
                <button
                  key={t}
                  className={\`ai-type-filter\${typeFilter === t ? ' active' : ''}\`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
              <div style={{ width: 1, height: 24, background: 'var(--glass-border)', margin: '0 4px' }} />
              <select
                className="ai-type-filter active"
                style={{ padding: '6px 32px 6px 16px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', outline: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', appearance: 'auto', fontFamily: 'inherit' }}
                value={specialFilter}
                onChange={(e) => setSpecialFilter(e.target.value)}
              >
                <option value="all" style={{ background: '#111827' }}>Any Status</option>
                <option value="featured" style={{ background: '#111827' }}>Featured Items</option>
                <option value="freeDelivery" style={{ background: '#111827' }}>Free Delivery</option>
                <option value="offers" style={{ background: '#111827' }}> Offers</option>
              </select>
            </div>`;

content = content.replace(/<div className="ai-type-filters">[\s\S]*?<\/div>/, newUI);

fs.writeFileSync(file, content);
console.log('Fixed dropdown in AdminItems UI properly');
