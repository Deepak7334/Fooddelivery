# FoodHub - MERN Food Delivery App

A full-stack food delivery application built with **MongoDB, Express.js, React (Vite), Node.js**.

## 🚀 Quick Start

### Prerequisites
1. **Node.js** v18+ (required)
2. **MongoDB** v6.0+ — [Download MongoDB Community](https://www.mongodb.com/try/download/community)
   > OR use **MongoDB Atlas** (free cloud database): [atlas.mongodb.com](https://cloud.mongodb.com)

### 1. Install MongoDB

**Option A - Local MongoDB:**
Download & install MongoDB Community Server from https://www.mongodb.com/try/download/community
It runs automatically as a Windows Service.

**Option B - MongoDB Atlas (Recommended if local fails):**
1. Go to https://cloud.mongodb.com → Sign up free
2. Create a free M0 cluster
3. Get connection string: e.g., `mongodb+srv://<user>:<pass>@cluster.mongodb.net/foodhub`
4. Update `backend\.env` → `MONGODB_URI=<your connection string>`

### 2. Start the App

**Option A: Use the start script (Windows)**
```
Double-click: start.bat
```

**Option B: Manual start**
```bash
# Terminal 1 - Backend
cd c:\Foodhub\backend
npm run dev

# Terminal 2 - Frontend  
cd c:\Foodhub\frontend
npm run dev
```

### 3. Open the App
- **Customer App**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@foodhub.com | Admin@123 |
| **Customer** | Register via app | — |
| **Restaurant** | Created by Admin | Set by Admin |

---

## 📁 Project Structure

```
c:\Foodhub\
├── backend\              # Express.js + Node.js API
│   ├── models\           # MongoDB schemas (User, Restaurant, Food, Order, Category)
│   ├── routes\           # API routes (auth, admin, restaurant, customer, payment)
│   ├── middleware\       # JWT auth middleware
│   ├── utils\            # OTP generator, Email sender
│   ├── server.js         # Main server + Socket.io
│   └── .env              # ⚠️ Configure MongoDB URI & Razorpay keys here
├── frontend\             # React + Vite app
│   ├── src\pages\
│   │   ├── customer\     # Home, Restaurants, Cart, Checkout, Tracking, Orders
│   │   ├── admin\        # Dashboard, Restaurants, Users, Orders, Categories
│   │   └── restaurant\  # Dashboard, Menu, Orders
│   └── src\context\      # AuthContext, CartContext
└── start.bat             # Windows quick-start script
```

---

## ⚙️ Configuration (backend\.env)

```env
MONGODB_URI=mongodb://localhost:27017/foodhub   # or your Atlas URI
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=rzp_test_...         # optional - app works without it (mock mode)
RAZORPAY_KEY_SECRET=...
EMAIL_USER=your@gmail.com            # optional - OTP is logged to console in dev
EMAIL_PASS=your_app_password
```

> **Note:** If Razorpay keys are not set, the app runs in **mock payment mode** — payments are simulated automatically.

---

## 🌟 Features

### Customer (Zomato-inspired)
- 🔍 Search & filter restaurants by cuisine, rating, delivery time
- 🛒 Add to cart with quantity controls (persisted locally)
- 💳 Razorpay payment (with mock mode for testing)
- 📍 Real-time order tracking with Socket.io
- 🔐 6-digit OTP delivery verification
- 📦 Order history with live tracking links

### Admin (Swiggy-inspired)
- 🏪 Create restaurants + assign owner credentials
- 👥 Manage customers (activate/deactivate)
- 📋 View all orders across platform with filters
- 🏷️ Manage food categories with emoji icons

### Restaurant
- 📊 Dashboard with revenue & order statistics
- 🍽️ Full menu management (CRUD, availability toggle)
- ⚡ Real-time order notifications via Socket.io
- 🔐 Send OTP to customer when order is out for delivery
