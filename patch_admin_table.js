const fs = require('fs');
let file = 'frontend/src/pages/admin/AdminItems.jsx';
let content = fs.readFileSync(file, 'utf8');

// Table row onClick
content = content.replace(
  /<tr key=\{item\._id\} className=\{selectedIds\.has\(item\._id\) \? 'selected-row' : ''\}>/g,
  "<tr key={item._id} className={selectedIds.has(item._id) ? 'selected-row' : ''} onClick={() => toggleSelection(item._id)} style={{ cursor: 'pointer' }}>"
);

// Any remaining Edit buttons without stopPropagation
content = content.replace(
  /<button className="ai-edit-btn" onClick=\{\(\) => handleEditClick\(item\)\}>Edit<\/button>/g,
  "<button className=\"ai-edit-btn\" onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}>Edit</button>"
);

fs.writeFileSync(file, content);
console.log('Fixed table row click');
