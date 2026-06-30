require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found');
      process.exit();
    }
    
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    const getRes = await new Promise((resolve) => {
      http.get({
        hostname: 'localhost',
        port: 5002,
        path: '/api/admin/manage-items',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
      });
    });
    
    if (!getRes.items || getRes.items.length === 0) {
      console.log('No items found');
      process.exit();
    }
    
    const item = getRes.items[0];
    
    const patchPayload = JSON.stringify({
      itemType: item.itemType,
      price: item.price,
      discountedPrice: item.discountedPrice || '',
      offer: item.offer || '',
      description: item.description || '',
      isAvailable: item.isAvailable !== false
    });
    
    console.log('Sending PATCH payload:', patchPayload);
    
    const patchRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5002,
        path: `/api/admin/manage-items/${item._id}`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(patchPayload)
        }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.write(patchPayload);
      req.end();
    });
    
    console.log('PATCH Status:', patchRes.status);
    console.log('PATCH Response:', patchRes.body);
    
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit();
  }
}
run();
