const mongoose = require('mongoose');
const Order = require('./backend/models/Order');

mongoose.connect('mongodb://127.0.0.1:27017/foodhub', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const orders = await Order.find({ status: 'delivered' }).limit(5);
  console.log("Delivered orders:");
  for (let o of orders) {
    console.log(`ID: ${o._id}, AgentId: ${o.deliveryAgentId}`);
  }
  process.exit(0);
}).catch(console.error);
