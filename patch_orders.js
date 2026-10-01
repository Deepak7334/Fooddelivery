const fs = require('fs');
const file = 'backend/routes/admin.js';
let content = fs.readFileSync(file, 'utf8');

// PATCH /orders/:id/status
content = content.replace(
  "const order = await Order.findById(req.params.id).populate('customerId', 'name email phone').populate('restaurantId', 'name address');",
  "const order = await Order.findOne({ _id: req.params.id, ...req.adminOrderFilter }).populate('customerId', 'name email phone').populate('restaurantId', 'name address');"
);

// PATCH /orders/bulk-assign
content = content.replace(
  "const agent = await User.findOne({ _id: agentId, role: 'delivery', isActive: true });",
  "const agent = await User.findOne({ _id: agentId, role: 'delivery', isActive: true, ...req.adminFilter });"
);
content = content.replace(
  "const result = await Order.updateMany(\n        { _id: { $in: orderIds } },",
  "const result = await Order.updateMany(\n        { _id: { $in: orderIds }, ...req.adminOrderFilter },"
);

// PATCH /orders/:id/assign-agent
content = content.replace(
  "const agent = await User.findOne({ _id: agentId, role: 'delivery', isActive: true });",
  "const agent = await User.findOne({ _id: agentId, role: 'delivery', isActive: true, ...req.adminFilter });"
);
content = content.replace(
  "const order = await Order.findByIdAndUpdate(\n        req.params.id,",
  "const order = await Order.findOneAndUpdate(\n        { _id: req.params.id, ...req.adminOrderFilter },"
);

fs.writeFileSync(file, content);
console.log('done');
