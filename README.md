# JDkart (FoodHub) - Comprehensive Documentation

##  Overview
JDkart (also referred to as FoodHub) is a full-featured, MERN-stack based food delivery and restaurant management platform. It offers a complete ecosystem for customers, restaurant owners, delivery partners, and platform administrators, complete with real-time tracking, secure payments, and table bookings.

## 🛠 Tech Stack

### Frontend (Client-Side)
- **Framework**: React 19 + Vite (Modern, fast build tool)
- **State Management**: Zustand (Global state)
- **Data Fetching**: React Query (`@tanstack/react-query`) for caching and async state
- **Routing**: React Router v7
- **Maps & Live Tracking**: React Leaflet & Leaflet
- **Real-time Communication**: Socket.io-client
- **UI Components**: React Icons, React Easy Crop, React Hot Toast

### Backend (Server-Side)
- **Runtime**: Node.js (>= 18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ORM)
- **Authentication**: JWT (JSON Web Tokens), Bcrypt for hashing, Firebase Admin
- **Real-time Engine**: Socket.io
- **Payment Gateway**: Razorpay
- **Emails/Notifications**: Resend / Nodemailer
- **File Uploads**: Multer (saved to local `/uploads` directory)

---

## 👥 User Roles & Features

### 1. Customer
- **Discover**: Browse restaurants, search for food, filter by categories (e.g., Pizza, Burger, Biryani).
- **Order & Pay**: Place food orders with secure Razorpay checkout.
- **Dine-in**: Reserve tables at local restaurants.
- **Track**: Real-time order status and live map tracking of the delivery partner.
- **Engage**: Leave ratings and reviews for food and restaurants.

### 2. Restaurant / Store Owner
- **Storefront Management**: Manage restaurant details, operating hours, and profile images.
- **Menu Management**: Add, edit, or delete food items and products.
- **Order Processing**: Accept/reject incoming orders and update preparation statuses.
- **Reservations**: Manage customer table bookings.
- **Financials**: View earnings and platform payouts.

### 3. Delivery Partner
- **Assignments**: Receive and accept order delivery requests.
- **Live Location**: Automatically broadcasts GPS location to customers and admins using WebSockets.
- **Status Updates**: Mark orders as picked up, on the way, and delivered.

### 4. Administrator
- **Dashboard**: High-level overview of platform metrics.
- **Global Tracking**: Access to `admin_live_tracking` to monitor all active deliveries on a live map.
- **User Management**: Audit users, manage roles, and handle profiles.
- **Catalog Management**: Seed and manage global food categories.
- **Payouts**: Manage and release payouts to restaurant partners.

---

## 🗄️ Database Architecture (MongoDB Models)

The system relies on a well-structured set of Mongoose models to handle complex relations:
- **`User`**: Base collection for all authenticable entities (Admins, Customers, Owners, Delivery).
- **`Restaurant` / `Store`**: Details of the partner businesses.
- **`Food` / `Product`**: Individual menu items tied to restaurants.
- **`Category`**: System-wide classifications seeded automatically.
- **`Order`**: Transactional records containing cart items, statuses, and assigned roles.
- **`Booking` / `Table`**: Reservations and table management for dine-in features.
- **`Review`**: Customer feedback records.
- **`Notification`**: Internal system alerts.
- **`Payout`**: Financial records of money owed/paid to restaurants.
- **`Settings` / `ProfileAuditLog`**: Platform configuration and security logs.

---

## ⚡ Real-Time Architecture (Socket.io)

JDkart uses an advanced WebSocket implementation for real-time reactivity. Clients subscribe to specific "rooms" to receive localized updates without polling the server:

- **`user_<userId>`**: Private room for user-specific alerts.
- **`order_<orderId>`**: Room for a specific order. Customers and Restaurants join this to see status updates instantly.
- **`restaurant_<restaurantId>`**: Alerts for new incoming orders and bookings for a specific restaurant.
- **`delivery_<deliveryId>`**: Dedicated channel for the delivery driver.
- **`admin_live_tracking`**: A global room where admins receive the `admin:delivery_location` event whenever drivers emit `delivery:update_location`.

---

## 🌐 REST API Structure

The backend exposes a modular REST API, organized by feature sets:

- `GET /api/health` - System health check.
- `/api/auth/*` - Registration, login, token refresh, and role verification.
- `/api/admin/*` - System metrics, user management, global tracking data.
- `/api/restaurant/*` & `/api/store/*` - Restaurant endpoints (creation, updating, fetching).
- `/api/customer/*` - Customer cart, profiles, and order history.
- `/api/delivery/*` - Agent routing, delivery statuses.
- `/api/payment/*` - Razorpay order creation and webhook verification.
- `/api/upload/*` - Multipart/form-data endpoints for images.
- `/api/booking/*` - Table reservation logic.
- `/api/notifications/*` - Fetching and marking alerts as read.

---

## 🚀 Getting Started (Development Setup)

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Atlas or Local)
- Razorpay API Keys
- Firebase Admin SDK JSON

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Configuration: Create a `.env` file in the `backend` directory. Example required keys:
   - `PORT=5000`
   - `MONGODB_URI=your_mongodb_connection_string`
   - `CLIENT_URL=http://localhost:5173`
   - `JWT_SECRET=your_super_secret_key`
4. Start the development server:
   ```bash
   npm run dev
   ```
   *(Note: The server auto-seeds standard Categories and an Admin user upon successful database connection.)*

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Configuration: Create a `.env` file in the `frontend` directory. Example required keys:
   - `VITE_API_URL=http://localhost:5000/api`
   - `VITE_SOCKET_URL=http://localhost:5000`
4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:5173`.
