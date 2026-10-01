const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update ai-checkbox-label CSS
content = content.replace(
  "color: #D1D5DB; cursor: pointer;",
  "color: var(--text-primary); font-weight: 600; cursor: pointer;"
);

// 2. Update ai-bulk-bar CSS
content = content.replace(
  "background: rgba(255,255,255,0.03);",
  "background: var(--bg-card); box-shadow: 0 4px 12px rgba(0,0,0,0.05);"
);

// 3. Update grid card onClick
content = content.replace(
  /<div key=\{item\._id\} className=\{\`ai-card \$\{selectedIds\.has\(item\._id\) \? 'selected' : ''\}\`\}>/g,
  "<div key={item._id} className={`ai-card ${selectedIds.has(item._id) ? 'selected' : ''}`} onClick={() => toggleSelection(item._id)} style={{ cursor: 'pointer' }}>"
);

// 4. Update Edit button to stop propagation
content = content.replace(
  /<button className="ai-edit-btn" onClick=\{\(\) => handleEditClick\(item\)\}>Edit<\/button>/g,
  "<button className=\"ai-edit-btn\" onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}>Edit</button>"
);

fs.writeFileSync(file, content);
console.log('Fixed AdminItems UI and click handlers');
