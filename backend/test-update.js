const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

require('dotenv').config();

async function run() {
  try {
    // 1. Connect DB to find an admin
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./models/User');
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found in DB');
      process.exit();
    }
    
    // 2. Generate token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // 3. Fetch items
    const getOptions = {
      hostname: 'localhost', port: 5002, path: '/api/admin/manage-items', method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    const itemsData = await new Promise((resolve) => {
      http.request(getOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).end();
    });
    
    if (!itemsData.items || itemsData.items.length === 0) {
      console.log('No items found');
      process.exit();
    }
    
    const item = itemsData.items[0];
    console.log(`Editing ${item.itemType} item: ${item.name} (${item._id})`);
    
    // 4. Update item
    const patchPayload = JSON.stringify({
      itemType: item.itemType,
      price: item.price + 10,
      discountedPrice: item.discountedPrice || null,
      offer: 'Test Offer',
      description: 'Test Desc',
      isAvailable: true
    });
    
    const patchOptions = {
      hostname: 'localhost', port: 5002, path: `/api/admin/manage-items/${item._id}`, method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': patchPayload.length
      }
    };
    
    await new Promise((resolve) => {
      const req = http.request(patchOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response: ${body}`);
          resolve();
        });
      });
      req.write(patchPayload);
      req.end();
    });
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
