const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Store = require('../models/Store');
const Settings = require('../models/Settings');
const Review = require('../models/Review');
const User = require('../models/User');
const Product = require('../models/Product');

// ========== PUBLIC ROUTES ==========
// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get checkout info (delivery fees & global taxes)
router.post('/checkout-info', async (req, res) => {
  try {
    const { totalAmount = 0 } = req.body;
    // Delivery fee rule: < ₹30 → ₹5, ≥ ₹30 → ₹10
    const deliveryFees = Number(totalAmount) < 30 ? 5 : 10;
    res.json({ success: true, deliveryFees, globalTaxRate: 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get popular foods
router.get('/foods', async (req, res) => {
  try {
    const { search } = req.query;
    let filter = { isAvailable: true };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') }
      ];
    }
    const foods = await Food.find(filter).limit(24).populate('restaurantId', 'name image address cuisine');
    res.json({ success: true, foods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all restaurants (with search & filter)
router.get('/restaurants', async (req, res) => {
  try {
    const { search, cuisine, sort, city, lat, lng } = req.query;
    let andConditions = [{ isActive: true }];
    
    if (lat && lng) {
      andConditions.push({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: 5000 // 5 km radius
          }
        }
      });
    } else if (city) {
      const tokens = city.replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
      const cityOr = tokens.flatMap(t => [
        { city: new RegExp(t, 'i') },
        { address: new RegExp(t, 'i') }
      ]);
      if (cityOr.length > 0) {
        andConditions.push({ $or: cityOr });
      }
    }

    if (cuisine) andConditions.push({ cuisine: new RegExp(cuisine, 'i') });
    
    if (search) {
      andConditions.push({
        $or: [
          { name: new RegExp(search, 'i') },
          { cuisine: { $elemMatch: { $regex: search, $options: 'i' } } }
        ]
      });
    }
    
    let query = Restaurant.find({ $and: andConditions });
    
    // Note: $near automatically sorts by distance. Only override sort if specifically requested and NOT using geo
    if (sort === 'rating') query = query.sort({ rating: -1 });
    else if (sort === 'deliveryTime') query = query.sort({ deliveryTime: 1 });
    else if (sort === 'deliveryFee') query = query.sort({ deliveryFee: 1 });
    else if (!lat || !lng) query = query.sort({ createdAt: -1 });
    const restaurants = await query;
    res.json({ success: true, restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single restaurant with menu
router.get('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('tables');
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    // Default tables if none
    if (restaurant.tables.length === 0) {
      restaurant.tables = [{ number: 1, maxGuests: 4 }, { number: 2, maxGuests: 6 }];
    }
    const menu = await Food.find({ restaurantId: restaurant._id, isAvailable: true });
    // Group by category
    const menuGrouped = {};
    menu.forEach(item => {
      if (!menuGrouped[item.category]) menuGrouped[item.category] = [];
      menuGrouped[item.category].push(item);
    });
    res.json({ success: true, restaurant, menu, menuGrouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== PROTECTED CUSTOMER ROUTES ==========
// Place order
router.post('/orders', protect, authorize('customer'), async (req, res) => {
  try {
    const { items, deliveryAddress, deliveryCoords, specialInstructions, paymentMethod } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const Restaurant = require('../models/Restaurant');
    const Store = require('../models/Store');
    
    // Group items by vendor
    const vendorGroups = {};
    for (const item of items) {
      const vendorId = item.restaurantId || item.storeId;
      const vendorType = item.type === 'food' ? 'restaurant' : 'store';
      const key = `${vendorType}_${vendorId}`;
      if (!vendorGroups[key]) {
        vendorGroups[key] = { vendorId, vendorType, items: [] };
      }
      vendorGroups[key].items.push(item);
    }

    const createdOrders = [];
    const io = req.app.get('io');

    for (const key of Object.keys(vendorGroups)) {
      const group = vendorGroups[key];
      let vendorName = 'JDkart';
      let vendorCoords = null;
      if (group.vendorType === 'restaurant' && group.vendorId) {
        const rest = await Restaurant.findById(group.vendorId);
        if (rest) {
          vendorName = rest.name;
          if (rest.location && rest.location.coordinates) vendorCoords = rest.location.coordinates;
        }
      } else if (group.vendorType === 'store' && group.vendorId) {
        const store = await Store.findById(group.vendorId);
        if (store) {
          vendorName = store.name;
          if (store.location && store.location.coordinates) vendorCoords = store.location.coordinates;
        }
      }

      // Auto-assign closest available rider
      let assignedAgentId = null;
      if (vendorCoords && vendorCoords.length === 2 && vendorCoords[0] !== 0) {
        const User = require('../models/User');
        const nearestAgent = await User.findOne({
          role: 'delivery',
          isActive: true,
          deliveryStatus: 'available',
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: vendorCoords
              },
              $maxDistance: 10000 // 10km search radius
            }
          }
        });
        if (nearestAgent) {
          assignedAgentId = nearestAgent._id;
        }
      }

      // Calculate total delivery fee for this vendor group
   
      const totalAmount = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      // Delivery fee based on order amount (consistent rule)
      const groupDeliveryFee = Number(totalAmount) < 30 ? 5 : 10;
      const finalAmount = totalAmount + groupDeliveryFee;
      
      const settings = await Settings.findOne();
      const platformRate = settings?.platformCommissionRate ?? 15;
      const adminCommission = Number(((totalAmount * platformRate) / 100).toFixed(2));
      const vendorPayout = Number((totalAmount - adminCommission).toFixed(2));

      const order = await Order.create({
        customerId: req.user._id,
        restaurantId: group.vendorType === 'restaurant' ? group.vendorId : null,
        restaurantName: group.vendorType === 'restaurant' ? vendorName : null,
        storeId: group.vendorType === 'store' ? group.vendorId : null,
        storeName: group.vendorType === 'store' ? vendorName : null,
        orderType: group.vendorType === 'restaurant' ? 'food' : 'product',
        items: group.items,
        totalAmount,
        deliveryFee: groupDeliveryFee,
        finalAmount,
        adminCommission,
        vendorPayout,
        deliveryAddress,
        deliveryCoords,
        specialInstructions,
        paymentMethod: paymentMethod || 'razorpay',
        customerEmail: req.user.email,
        customerPhone: req.user.phone,
        alternatePhone: req.body.alternatePhone || '',
        deliveryAgentId: assignedAgentId,
        statusHistory: [{ status: 'pending', timestamp: new Date() }],
      });
      
      if (assignedAgentId) {
        io.to(`delivery_${assignedAgentId}`).emit('order:assigned', order);
      }
      
      createdOrders.push(order);
      io.to(`${group.vendorType}_${group.vendorId}`).emit('order:new', order);
      
      // FCM Notifications
      const NotificationService = require('../services/notificationService');
      await NotificationService.sendToCustomer(req.user._id, 'Order Placed Successfully', 'Your order has been placed successfully.', 'NEW_ORDER', io).catch(console.error);
      await NotificationService.sendToAdmin('New Order', 'Customer placed an order.', 'NEW_ORDER', io).catch(console.error);

      // Email Notification to Admin
      if (process.env.ADMIN_EMAIL) {
        const sendEmail = require('../utils/sendEmail');
        const adminEmailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ff5722;">New Order Alert 🚨</h2>
            <p>A new order was just placed on JDkart!</p>
            <ul style="line-height: 1.6;">
              <li><strong>Order ID:</strong> ${order._id}</li>
              <li><strong>Vendor:</strong> ${order.restaurantName || order.storeName || 'Vendor'}</li>
              <li><strong>Total Amount:</strong> ₹${order.finalAmount}</li>
              <li><strong>Customer Name:</strong> ${req.user.name || 'Customer'}</li>
              <li><strong>Customer Email:</strong> ${order.customerEmail}</li>
              <li><strong>Customer Phone:</strong> ${order.customerPhone || 'N/A'}</li>
              <li><strong>Delivery Address:</strong> ${order.deliveryAddress ? `${order.deliveryAddress.name}, ${order.deliveryAddress.address}, ${order.deliveryAddress.district}` : 'N/A'}</li>
            </ul>
            <br/>
            <p><a href="${process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : 'http://localhost:5173'}/admin" style="background: #000; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a></p>
          </div>
        `;
        sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: '🚨 New Order Received - JDkart',
          html: adminEmailHtml
        }).catch(err => console.error('Admin Email Error:', err));
      }
      
      if (group.vendorType === 'restaurant') {
        await NotificationService.sendToRestaurant(group.vendorId, 'New Order', 'You received a new order.', 'NEW_ORDER', io).catch(console.error);
      } else if (group.vendorType === 'store') {
        await NotificationService.sendToStore(group.vendorId, 'New Order', 'You received a new store order.', 'NEW_ORDER', io).catch(console.error);
      }
    }

    res.status(201).json({ success: true, orders: createdOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get my orders
router.get('/orders', protect, authorize('customer'), async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'name image address')
      .populate('storeId', 'name image address');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single order (for tracking)
router.get('/orders/:id', protect, authorize('customer'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id })
      .populate('restaurantId', 'name image address phone')
      .populate('storeId', 'name image address phone')
      .populate('deliveryAgentId', 'name phone vehicleNumber');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify delivery OTP
router.post('/orders/:id/verify-otp', protect, authorize('customer'), async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ success: false, message: 'Order is not out for delivery' });
    }
    if (order.deliveryOTP !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    order.status = 'delivered';
    order.otpVerified = true;
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }
    order.statusHistory.push({ status: 'delivered', timestamp: order.deliveredAt, note: 'OTP verified by customer' });
    await order.save();

    // Notify restaurant
    const io = req.app.get('io');
    io.to(`restaurant_${order.restaurantId}`).emit('order:delivered', {
      orderId: order._id,
      status: 'delivered',
    });
    io.to(`order_${order._id}`).emit('order:status_update', {
      orderId: order._id,
      status: 'delivered',
      statusHistory: order.statusHistory,
    });

    res.json({ success: true, message: 'Delivery confirmed! Enjoy your meal! ', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel order
router.patch('/orders/:id/cancel', protect, authorize('customer'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['pending', 'accepted'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order at this stage' });
    }
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', timestamp: new Date() });
    await order.save();
    const io = req.app.get('io');
    io.to(`restaurant_${order.restaurantId}`).emit('order:cancelled', { orderId: order._id });
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== STORE ORDER PLACEMENT ==========
router.post('/store-orders', protect, authorize('customer'), async (req, res) => {
  try {
    const { storeId, items, deliveryAddress, paymentMethod, totalAmount, specialInstructions } = req.body;
    if (!storeId || !items?.length) return res.status(400).json({ success: false, message: 'storeId and items are required' });

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    // Delivery fee rule: < ₹30 → ₹5, ≥ ₹30 → ₹10
    const deliveryFee = Number(totalAmount) < 30 ? 5 : 10;
    const finalAmount = Number(totalAmount) + deliveryFee;

    const settings = await Settings.findOne();
    const platformRate = settings?.platformCommissionRate ?? 15;
    const adminCommission = Number(((totalAmount * platformRate) / 100).toFixed(2));
    const vendorPayout = Number((totalAmount - adminCommission).toFixed(2));

    const order = await Order.create({
      customerId: req.user.id,
      storeId,
      storeName: store.name,
      orderType: 'product',
      items,
      totalAmount,
      deliveryFee,
      finalAmount,
      adminCommission,
      vendorPayout,
      deliveryAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      specialInstructions: specialInstructions || '',
      customerPhone: req.user.phone || '',
      customerEmail: req.user.email || '',
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
    });

    const io = req.app.get('io');
    const NotificationService = require('../services/notificationService');
    await NotificationService.sendToCustomer(req.user.id, 'Order Placed Successfully', 'Your store order has been placed.', 'NEW_ORDER', io).catch(console.error);
    await NotificationService.sendToAdmin('New Store Order', 'Customer placed a store order.', 'NEW_ORDER', io).catch(console.error);
    await NotificationService.sendToStore(storeId, 'New Order', 'You received a new store order.', 'NEW_ORDER', io).catch(console.error);

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// Submit a multi-part review for a delivered order
router.post('/orders/:id/rate', protect, authorize('customer'), async (req, res) => {
  try {
    const { vendorRating, vendorReview, deliveryRating, deliveryReview, itemRatings } = req.body;
    
    // 1. Fetch order
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'delivered') return res.status(400).json({ success: false, message: 'Only delivered orders can be rated' });
    if (order.isReviewed) return res.status(400).json({ success: false, message: 'Order has already been reviewed' });

    // 2. Create the Review document
    const reviewData = {
      orderId: order._id,
      customerId: req.user.id,
      vendorId: order.restaurantId || order.storeId,
      vendorType: order.restaurantId ? 'restaurant' : 'store',
      vendorRating: vendorRating || null,
      vendorReview: vendorReview || '',
      deliveryAgentId: order.deliveryAgentId,
      deliveryRating: deliveryRating || null,
      deliveryReview: deliveryReview || '',
      items: itemRatings || [] // array of { itemId, itemType, rating }
    };
    
    const review = await Review.create(reviewData);

    // 3. Mark order as reviewed
    order.isReviewed = true;
    await order.save();

    // 4. Update Vendor (Restaurant/Store) Rating
    if (vendorRating) {
      const VendorModel = order.restaurantId ? require('../models/Restaurant') : require('../models/Store');
      const vendor = await VendorModel.findById(reviewData.vendorId);
      if (vendor) {
        const oldTotal = vendor.totalRatings || 0;
        const oldRating = vendor.rating || 0;
        const newTotal = oldTotal + 1;
        vendor.rating = parseFloat((((oldRating * oldTotal) + vendorRating) / newTotal).toFixed(1));
        vendor.totalRatings = newTotal;
        await vendor.save();
      }
    }

    // 5. Update Delivery Agent Rating
    if (deliveryRating && order.deliveryAgentId) {
      const agent = await User.findById(order.deliveryAgentId);
      if (agent) {
        const oldTotal = agent.totalRatings || 0;
        const oldRating = agent.rating || 0;
        const newTotal = oldTotal + 1;
        agent.rating = parseFloat((((oldRating * oldTotal) + deliveryRating) / newTotal).toFixed(1));
        agent.totalRatings = newTotal;
        await agent.save();
      }
    }

    // 6. Update Food/Product Item Ratings
    if (itemRatings && itemRatings.length > 0) {
      for (const item of itemRatings) {
        if (!item.rating) continue;
        const ItemModel = item.itemType === 'product' ? require('../models/Product') : require('../models/Food');
        const dbItem = await ItemModel.findById(item.itemId);
        if (dbItem) {
          const oldTotal = dbItem.totalRatings || 0;
          const oldRating = dbItem.rating || 4.0; // Default is 4.0 if never rated
          const newTotal = oldTotal + 1;
          dbItem.rating = parseFloat((((oldRating * oldTotal) + item.rating) / newTotal).toFixed(1));
          dbItem.totalRatings = newTotal;
          await dbItem.save();
        }
      }
    }

    res.json({ success: true, message: 'Review submitted successfully', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
