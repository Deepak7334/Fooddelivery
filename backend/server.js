const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Parse allowed origins from CLIENT_URL (comma-separated)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

function originCheck(origin, callback) {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) return callback(null, true);
  // Allow any Vercel domain, jdkart.in domain, or localhost automatically
  if (origin.includes('vercel.app') || origin.includes('jdkart.in') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}

const io = new Server(server, {
  cors: {
    origin: originCheck,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible in routes
app.set('io', io);

// ── Performance: Gzip/Brotli compression ─────────────────────────────────────
// Compresses all JSON responses — reduces payload size by 60-80%
const compression = require('compression');
app.use(compression({ level: 6 }));  // level 6 = good balance of CPU vs size

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: originCheck,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static files with aggressive caching (images/uploads cached 7 days in CDN)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

// ── Keep-Alive (reuse TCP connections instead of re-establishing per request) ─
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  next();
});

// ── Cache-Control for public read-only endpoints ──────────────────────────────
// These change rarely — tell the browser to cache for 60 seconds
const cachePublic = (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  next();
};
app.use('/api/customer/categories', cachePublic);
app.use('/api/customer/restaurants', cachePublic);
app.use('/api/customer/foods', cachePublic);
app.use('/api/store/stores', cachePublic);
app.use('/api/store/products', cachePublic);


// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Health check (Render pings this)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route so users don't see "Cannot GET /"
app.get('/', (req, res) => {
  res.send('🛒 JDkart API is running! Please visit the Vercel frontend URL to use the app.');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/restaurant', require('./routes/restaurant'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/store', require('./routes/store'));
app.use('/api/store-owner', require('./routes/storeOwner'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/service-areas', require('./routes/serviceArea'));
app.use('/api/home-feed', require('./routes/homeFeed'));
app.use('/api/serviceability', require('./routes/serviceability'));
app.use('/api/addresses', require('./routes/address'));

// Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user room user_${userId}`);
  });

  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined room order_${orderId}`);
  });

  socket.on('join_restaurant_room', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant room ${restaurantId}`);
  });

  socket.on('join_delivery_room', (deliveryId) => {
    socket.join(`delivery_${deliveryId}`);
    console.log(`Socket ${socket.id} joined delivery room ${deliveryId}`);
  });

  socket.on('join_admin_tracking_room', () => {
    socket.join('admin_live_tracking');
    console.log(`Socket ${socket.id} joined admin_live_tracking`);
  });

  socket.on('delivery:update_location', (data) => {
    // data = { agentId, lat, lng }
    io.to('admin_live_tracking').emit('admin:delivery_location', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Clean MONGODB_URI to fix accidental quotes or spaces from Render dashboard
const rawMongoUri = process.env.MONGODB_URI || '';
const cleanMongoUri = rawMongoUri.replace(/^["']|["']$/g, '').trim();

// MongoDB connection + seed admin
mongoose.connect(cleanMongoUri, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
})
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedAdmin();
    await seedCategories();
    await seedServiceAreas();
  })
  .catch((err) => {
    if (err.message.includes('authentication failed')) {
      console.error('❌ MongoDB Error: Authentication failed. Please check your username and password in .env');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('❌ MongoDB Error: Connection refused. Check your IP whitelisting in Atlas and your DNS settings.');
    } else {
      console.error('❌ MongoDB Error:', err.message);
    }
  });

// Connection event listeners
mongoose.connection.on('error', err => {
  console.error('❌ Mongoose Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose Disconnected');
});

// Seed default admin
async function seedAdmin() {
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');
  const existing = await User.findOne({ role: 'admin' });
  if (!existing) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'supportjdkart@gmail.com',
      password: hashed,
      role: 'admin',
      phone: '9999999999',
    });
    console.log('✅ Admin seeded: supportjdkart@gmail.com / Jdkart@support');
  }
}

// Seed default categories
async function seedCategories() {
  const Category = require('./models/Category');
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany([
      { name: 'Pizza', icon: '🍕' },
      { name: 'Burger', icon: '🍔' },
      { name: 'Biryani', icon: '🍛' },
      { name: 'Chinese', icon: '🥡' },
      { name: 'Desserts', icon: '🍰' },
      { name: 'South Indian', icon: '🥘' },
      { name: 'North Indian', icon: '🫕' },
      { name: 'Rolls', icon: '🌯' },
      { name: 'Beverages', icon: '🥤' },
      { name: 'Pasta', icon: '🍝' },
    ]);
    console.log('✅ Categories seeded');
  }
}

// Seed initial service areas
async function seedServiceAreas() {
  const ServiceArea = require('./models/ServiceArea');
  const count = await ServiceArea.countDocuments();
  if (count === 0) {
    await ServiceArea.insertMany([
      {
        name: 'Area 1 (Central)',
        code: 'AREA_1',
        city: 'Metropolis',
        state: 'State',
        pincodes: ['100001', '100002'],
        deliveryFee: 20,
        minimumOrderValue: 99,
        estimatedDeliveryTime: '25-35 min',
        status: 'ACTIVE'
      },
      {
        name: 'Area 2 (North)',
        code: 'AREA_2',
        city: 'Metropolis',
        state: 'State',
        pincodes: ['200001', '200002'],
        deliveryFee: 30,
        minimumOrderValue: 149,
        estimatedDeliveryTime: '30-45 min',
        status: 'ACTIVE'
      }
    ]);
    console.log('✅ Service Areas seeded');
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please kill the process using this port and try again.`);
  } else {
    console.error('❌ Server Error:', err);
  }
});
// Bypassed DNS SRV resolution by using standard connection string in .env
