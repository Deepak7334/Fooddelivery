const mongoose = require('mongoose');
const Order = require('./backend/models/Order');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const order = await Order.findOne({ status: { $in: ['accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way'] } })
    .populate('restaurantId', 'name address phone')
    .populate('storeId', 'name address phone')
    .lean();
  console.log(JSON.stringify(order, null, 2));
  process.exit(0);
}
check();
