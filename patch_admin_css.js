const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove All Types, Food, Product buttons
const oldButtons = `{itemTypes.map(t => (
                <button
                  key={t}
                  className={\`ai-type-filter\${typeFilter === t ? ' active' : ''}\`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
              <div style={{ width: 1, height: 24, background: 'var(--glass-border)', margin: '0 4px' }} />`;

content = content.replace(oldButtons, '');

// 2. Replace hardcoded colors in CSS with variables
const cssReplacements = [
  { search: /#111827/g, replace: 'var(--bg-card)' },
  { search: /#0B0F19/g, replace: 'var(--bg-body)' },
  { search: /#1c222b/g, replace: 'rgba(128,128,128,0.1)' },
  { search: /#F1F5F9/g, replace: 'var(--text-primary)' },
  { search: /#E5E7EB/g, replace: 'var(--text-primary)' },
  { search: /#D1D5DB/g, replace: 'var(--text-primary)' },
  { search: /#9CA3AF/g, replace: 'var(--text-secondary)' },
  { search: /#6B7280/g, replace: 'var(--text-muted)' },
  { search: /#4B5563/g, replace: 'var(--text-muted)' },
  { search: /#F97316/g, replace: 'var(--primary)' },
  { search: /#EA6C0C/g, replace: 'var(--primary)' },
  { search: /rgba\(255,255,255,0\.02\)/g, replace: 'var(--bg-card)' },
  { search: /rgba\(255,255,255,0\.04\)/g, replace: 'rgba(128,128,128,0.05)' },
  { search: /rgba\(255,255,255,0\.015\)/g, replace: 'rgba(128,128,128,0.03)' },
  { search: /rgba\(255,255,255,0\.03\)/g, replace: 'var(--bg-card)' },
  { search: /#22C55E/g, replace: 'var(--success, #22C55E)' },
  { search: /#EF4444/g, replace: 'var(--danger, #EF4444)' },
];

cssReplacements.forEach(({ search, replace }) => {
  content = content.replace(search, replace);
});

// Since some inline styles used #111827 for options, they are already replaced to var(--bg-card) which is good!

fs.writeFileSync(file, content);
console.log('Fixed CSS color variables and removed type filters');
