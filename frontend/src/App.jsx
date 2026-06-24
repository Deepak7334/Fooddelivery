import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FiMenu } from 'react-icons/fi';
import TableBookingPage from './pages/customer/TableBookingPage';
import StoresPage from './pages/customer/StoresPage';
import StoreDetailPage from './pages/customer/StoreDetailPage';
import StoreOwnerLayout from './pages/storeOwner/StoreOwnerLayout';
import StoreOwnerDashboard from './pages/storeOwner/StoreOwnerDashboard';
import StoreOwnerProducts from './pages/storeOwner/StoreOwnerProducts';
import StoreOwnerOrders from './pages/storeOwner/StoreOwnerOrders';
import AdminStores from './pages/admin/AdminStores';

// Layouts
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminSidebar from './components/AdminSidebar';
import RestaurantSidebar from './components/RestaurantSidebar';

// Customer Pages
import HomePage from './pages/customer/HomePage';
import RestaurantsPage from './pages/customer/RestaurantsPage';
import RestaurantDetailPage from './pages/customer/RestaurantDetailPage';
import FoodDetailPage from './pages/customer/FoodDetailPage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import UpiPaymentPage from './pages/customer/UpiPaymentPage';
import OrderTrackingPage from './pages/customer/OrderTrackingPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import AuthPage from './pages/customer/AuthPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminDeliveryAgents from './pages/admin/AdminDeliveryAgents';
import AdminBookings from './pages/admin/AdminBookings';
import AdminItems from './pages/admin/AdminItems';

// Restaurant Pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import RestaurantMenu from './pages/restaurant/RestaurantMenu';
import RestaurantOrders from './pages/restaurant/RestaurantOrders';
import RestaurantTables from './pages/restaurant/RestaurantTables';
import RestaurantBookings from './pages/restaurant/RestaurantBookings';

// Delivery Pages
import DeliveryLayout from './components/DeliveryLayout';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryHistory from './pages/delivery/DeliveryHistory';

// Guards
const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="loading-box"><div className="loading-logo">🛒</div><div className="spinner" style={{ margin: '0 auto' }}></div></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'restaurant') return <Navigate to="/restaurant" replace />;
    if (user.role === 'store_owner') return <Navigate to="/store-owner" replace />;
    if (user.role === 'delivery') return <Navigate to="/delivery" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

const CustomerLayout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </>
);

// Admin layout with mobile sidebar toggle
const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-with-sidebar" style={{ width: '100%', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <div className="panel-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <FiMenu size={20} />
          </button>
          <span className="panel-topbar-title">🛒 JDmart Admin</span>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Restaurant layout with mobile sidebar toggle
const RestaurantLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div style={{ display: 'flex' }}>
      <RestaurantSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-with-sidebar" style={{ width: '100%', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <div className="panel-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <FiMenu size={20} />
          </button>
          <span className="panel-topbar-title">🛒 Restaurant Panel</span>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      {/* Customer Routes */}
      <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
      <Route path="/restaurants" element={<CustomerLayout><RestaurantsPage /></CustomerLayout>} />
      <Route path="/restaurants/:id" element={<CustomerLayout><RestaurantDetailPage /></CustomerLayout>} />
      <Route path="/food/:id" element={<CustomerLayout><FoodDetailPage /></CustomerLayout>} />
      <Route path="/product/:id" element={<CustomerLayout><ProductDetailPage /></CustomerLayout>} />
      <Route path="/booking/:restaurantId" element={<CustomerLayout><TableBookingPage /></CustomerLayout>} />
      <Route path="/stores" element={<CustomerLayout><StoresPage /></CustomerLayout>} />
      <Route path="/stores/:id" element={<CustomerLayout><StoreDetailPage /></CustomerLayout>} />
      <Route path="/cart" element={<CustomerLayout><CartPage /></CustomerLayout>} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/checkout" element={<PrivateRoute role="customer"><CustomerLayout><CheckoutPage /></CustomerLayout></PrivateRoute>} />
      <Route path="/payment/upi" element={<PrivateRoute role="customer"><UpiPaymentPage /></PrivateRoute>} />
      <Route path="/orders" element={<PrivateRoute role="customer"><CustomerLayout><OrderHistoryPage /></CustomerLayout></PrivateRoute>} />
      <Route path="/orders/:id/track" element={<PrivateRoute role="customer"><CustomerLayout><OrderTrackingPage /></CustomerLayout></PrivateRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<PrivateRoute role="admin"><AdminLayout><AdminDashboard /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/stores" element={<PrivateRoute role="admin"><AdminLayout><AdminStores /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/restaurants" element={<PrivateRoute role="admin"><AdminLayout><AdminRestaurants /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute role="admin"><AdminLayout><AdminUsers /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/orders" element={<PrivateRoute role="admin"><AdminLayout><AdminOrders /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/bookings" element={<PrivateRoute role="admin"><AdminLayout><AdminBookings /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/delivery-agents" element={<PrivateRoute role="admin"><AdminLayout><AdminDeliveryAgents /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/categories" element={<PrivateRoute role="admin"><AdminLayout><AdminCategories /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/items" element={<PrivateRoute role="admin"><AdminLayout><AdminItems /></AdminLayout></PrivateRoute>} />

      {/* Restaurant Routes */}
      <Route path="/restaurant" element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantDashboard /></RestaurantLayout></PrivateRoute>} />
      <Route path="/restaurant/menu" element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantMenu /></RestaurantLayout></PrivateRoute>} />
      <Route path="/restaurant/orders" element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantOrders /></RestaurantLayout></PrivateRoute>} />
      <Route path="/restaurant/tables" element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantTables /></RestaurantLayout></PrivateRoute>} />
      <Route path="/restaurant/table-bookings" element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantBookings /></RestaurantLayout></PrivateRoute>} />

      {/* Store Owner Routes */}
      <Route path="/store-owner" element={<PrivateRoute role="store_owner"><StoreOwnerLayout><StoreOwnerDashboard /></StoreOwnerLayout></PrivateRoute>} />
      <Route path="/store-owner/products" element={<PrivateRoute role="store_owner"><StoreOwnerLayout><StoreOwnerProducts /></StoreOwnerLayout></PrivateRoute>} />
      <Route path="/store-owner/orders" element={<PrivateRoute role="store_owner"><StoreOwnerLayout><StoreOwnerOrders /></StoreOwnerLayout></PrivateRoute>} />

      {/* Delivery Routes */}
      <Route path="/delivery" element={<PrivateRoute role="delivery"><DeliveryLayout><DeliveryDashboard /></DeliveryLayout></PrivateRoute>} />
      <Route path="/delivery/history" element={<PrivateRoute role="delivery"><DeliveryLayout><DeliveryHistory /></DeliveryLayout></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
