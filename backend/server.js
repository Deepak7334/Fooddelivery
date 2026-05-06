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
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: originCheck,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  res.send('🍔 Foodhub API is running! Please visit the Vercel frontend URL to use the app.');
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

// Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

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

// MongoDB connection + seed admin
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
})
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedAdmin();
    await seedCategories();
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
      email: process.env.ADMIN_EMAIL || 'admin@foodhub.com',
      password: hashed,
      role: 'admin',
      phone: '9999999999',
    });
    console.log('✅ Admin seeded: admin@foodhub.com / Admin@123');
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
