const fs = require('fs');
const file = 'backend/routes/admin.js';
let content = fs.readFileSync(file, 'utf8');

// POST /restaurants
content = content.replace(
  "const restaurantData = { name, description, cuisine: cuisine || [], address, city, image, deliveryTime, deliveryFee, minOrder, phone, ownerEmail, ownerId, location: locationData };",
  "const restaurantData = { name, description, cuisine: cuisine || [], address, city, image, deliveryTime, deliveryFee, minOrder, phone, ownerEmail, ownerId, location: locationData };\n      if (req.user.role === 'sub_admin' && req.user.serviceAreaIds.length > 0) restaurantData.serviceAreaIds = [req.user.serviceAreaIds[0]];\n      else if (req.body.serviceAreaId) restaurantData.serviceAreaIds = [req.body.serviceAreaId];"
);

// PUT /restaurants/:id
content = content.replace(
  "router.put('/restaurants/:id', async (req, res) => {\n    try {\n      let updateData = { ...req.body };",
  "router.put('/restaurants/:id', async (req, res) => {\n    try {\n      const existingRest = await Restaurant.findOne({ _id: req.params.id, ...req.adminFilter });\n      if (!existingRest) return res.status(403).json({ success: false, message: 'Access denied' });\n      let updateData = { ...req.body };\n      if (req.user.role === 'admin' && req.body.serviceAreaId !== undefined) updateData.serviceAreaIds = req.body.serviceAreaId ? [req.body.serviceAreaId] : [];"
);

// DELETE /restaurants/:id
content = content.replace(
  "router.delete('/restaurants/:id', async (req, res) => {\n    try {\n      const restaurant = await Restaurant.findById(req.params.id);",
  "router.delete('/restaurants/:id', async (req, res) => {\n    try {\n      const restaurant = await Restaurant.findOne({ _id: req.params.id, ...req.adminFilter });"
);

// PATCH /restaurants/:id/toggle
content = content.replace(
  "router.patch('/restaurants/:id/toggle', async (req, res) => {\n    try {\n      const restaurant = await Restaurant.findById(req.params.id);",
  "router.patch('/restaurants/:id/toggle', async (req, res) => {\n    try {\n      const restaurant = await Restaurant.findOne({ _id: req.params.id, ...req.adminFilter });"
);

// POST /stores
content = content.replace(
  "const store = await Store.create(storeData);",
  "if (req.user.role === 'sub_admin' && req.user.serviceAreaIds.length > 0) storeData.serviceAreaIds = [req.user.serviceAreaIds[0]];\n      else if (req.body.serviceAreaId) storeData.serviceAreaIds = [req.body.serviceAreaId];\n      const store = await Store.create(storeData);"
);

// PUT /stores/:id
content = content.replace(
  "router.put('/stores/:id', async (req, res) => {\n    try {\n      let updateData = { ...req.body };",
  "router.put('/stores/:id', async (req, res) => {\n    try {\n      const existingStore = await Store.findOne({ _id: req.params.id, ...req.adminFilter });\n      if (!existingStore) return res.status(403).json({ success: false, message: 'Access denied' });\n      let updateData = { ...req.body };\n      if (req.user.role === 'admin' && req.body.serviceAreaId !== undefined) updateData.serviceAreaIds = req.body.serviceAreaId ? [req.body.serviceAreaId] : [];"
);

// DELETE /stores/:id
content = content.replace(
  "router.delete('/stores/:id', async (req, res) => {\n    try {\n      const store = await Store.findById(req.params.id);",
  "router.delete('/stores/:id', async (req, res) => {\n    try {\n      const store = await Store.findOne({ _id: req.params.id, ...req.adminFilter });"
);

// PATCH /stores/:id/toggle
content = content.replace(
  "router.patch('/stores/:id/toggle', async (req, res) => {\n    try {\n      const store = await Store.findById(req.params.id);",
  "router.patch('/stores/:id/toggle', async (req, res) => {\n    try {\n      const store = await Store.findOne({ _id: req.params.id, ...req.adminFilter });"
);

fs.writeFileSync(file, content);
console.log('done');
