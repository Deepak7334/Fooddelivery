import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FiMenu } from 'react-icons/fi';
import NotificationBell from './components/NotificationBell';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

// ── Layouts (eager — always needed) ──────────────────────────────────────────
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminSidebar from './components/AdminSidebar';
import RestaurantSidebar from './components/RestaurantSidebar';
import DeliveryLayout from './components/DeliveryLayout';

import PostLoginPrompt from './components/PostLoginPrompt';

// ── Customer Pages (lazy) ─────────────────────────────────────────────────────
const HomePage             = lazy(() => import('./pages/customer/HomePage'));
const ProfilePage          = lazy(() => import('./pages/shared/ProfilePage'));
const RestaurantsPage      = lazy(() => import('./pages/customer/RestaurantsPage'));
const RestaurantDetailPage = lazy(() => import('./pages/customer/RestaurantDetailPage'));
const FoodDetailPage       = lazy(() => import('./pages/customer/FoodDetailPage'));
const ProductDetailPage    = lazy(() => import('./pages/customer/ProductDetailPage'));
const CartPage             = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage         = lazy(() => import('./pages/customer/CheckoutPage'));
const UpiPaymentPage       = lazy(() => import('./pages/customer/UpiPaymentPage'));
const OrderTrackingPage    = lazy(() => import('./pages/customer/OrderTrackingPage'));
const OrderHistoryPage     = lazy(() => import('./pages/customer/OrderHistoryPage'));
const AuthPage             = lazy(() => import('./pages/customer/AuthPage'));
const TableBookingPage     = lazy(() => import('./pages/customer/TableBookingPage'));
const StoresPage           = lazy(() => import('./pages/customer/StoresPage'));
const StoreDetailPage      = lazy(() => import('./pages/customer/StoreDetailPage'));

// ── Admin Pages (lazy) ────────────────────────────────────────────────────────
const AdminDashboard       = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminRestaurants     = lazy(() => import('./pages/admin/AdminRestaurants'));
const AdminUsers           = lazy(() => import('./pages/admin/AdminUsers'));
const AdminOrders          = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCategories      = lazy(() => import('./pages/admin/AdminCategories'));
const AdminDeliveryAgents  = lazy(() => import('./pages/admin/AdminDeliveryAgents'));
const AdminBookings        = lazy(() => import('./pages/admin/AdminBookings'));
const AdminItems           = lazy(() => import('./pages/admin/AdminItems'));
const AdminStores          = lazy(() => import('./pages/admin/AdminStores'));
const AdminPayouts         = lazy(() => import('./pages/admin/AdminPayouts'));
const AdminServiceAreas    = lazy(() => import('./pages/admin/AdminServiceAreas'));

// ── Restaurant Pages (lazy) ───────────────────────────────────────────────────
const RestaurantDashboard  = lazy(() => import('./pages/restaurant/RestaurantDashboard'));
const RestaurantMenu       = lazy(() => import('./pages/restaurant/RestaurantMenu'));
const RestaurantOrders     = lazy(() => import('./pages/restaurant/RestaurantOrders'));
const RestaurantTables     = lazy(() => import('./pages/restaurant/RestaurantTables'));
const RestaurantBookings   = lazy(() => import('./pages/restaurant/RestaurantBookings'));

// ── Store Owner Pages (lazy) ──────────────────────────────────────────────────
const StoreOwnerLayout     = lazy(() => import('./pages/storeOwner/StoreOwnerLayout'));
const StoreOwnerDashboard  = lazy(() => import('./pages/storeOwner/StoreOwnerDashboard'));
const StoreOwnerProducts   = lazy(() => import('./pages/storeOwner/StoreOwnerProducts'));
const StoreOwnerOrders     = lazy(() => import('./pages/storeOwner/StoreOwnerOrders'));

// ── Delivery Pages (lazy) ─────────────────────────────────────────────────────
const DeliveryDashboard    = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryHistory      = lazy(() => import('./pages/delivery/DeliveryHistory'));
const DeliveryOrderPage    = lazy(() => import('./pages/delivery/DeliveryOrderPage'));

// ── Page-level loading fallback ───────────────────────────────────────────────
const PageLoader = () => (
  <div className="loading-overlay">
    <div className="loading-box">
      <div className="loading-logo">🛒</div>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  </div>
);

// ── Route guards ──────────────────────────────────────────────────────────────
const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    if (role === 'admin' && user.role === 'sub_admin') {
      // sub_admin is allowed in admin routes
    } else if (user.role !== role) {
      if (user.role === 'admin' || user.role === 'sub_admin') return <Navigate to="/admin" replace />;
      if (user.role === 'restaurant') return <Navigate to="/restaurant" replace />;
      if (user.role === 'store_owner') return <Navigate to="/store-owner" replace />;
      if (user.role === 'delivery') return <Navigate to="/delivery" replace />;
      return <Navigate to="/" replace />;
    }
  }
  return children;
};

import ChatBox from './components/ChatBox';

const CustomerLayout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
    <ChatBox />
    <Footer />
  </>
);

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-with-sidebar" style={{ width: '100%', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <div className="panel-topbar">
          <div style={{ fontWeight: 800, fontSize: 20, color: '#F97316' }}> 
            <span>JD<span style={{ color: 'var(--text-primary)' }}>kart</span></span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <NotificationBell />
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <FiMenu size={20} />
            </button>
          </div>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

const RestaurantLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div style={{ display: 'flex' }}>
      <RestaurantSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-with-sidebar" style={{ width: '100%', background: 'var(--bg-dark)', minHeight: '100vh' }}>
        <div className="panel-topbar">
          <div style={{ fontWeight: 800, fontSize: 20, color: '#F97316' }}> 
            <span>JD<span style={{ color: 'var(--text-primary)' }}>kart</span></span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <NotificationBell />
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <FiMenu size={20} />
            </button>
          </div>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to Socket.io server
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(apiBase);

    socket.on('connect', () => {
      // Join the user's specific room
      const userId = user._id || user.id;
      socket.emit('join_user_room', userId);
    });

    // Listen for global push notifications
    socket.on('notification', (notif) => {
      // Play a small success/info sound if desired, or just show toast
      toast(
        (t) => (
          <div>
            <strong>{notif.title}</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{notif.body}</p>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
          icon: '🔔',
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)'
          },
        }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <Suspense fallback={<PageLoader />}>
      <PostLoginPrompt />
      <Routes>
        {/* Global Protected Routes */}
        <Route path="/profile"               element={<PrivateRoute><CustomerLayout><ProfilePage /></CustomerLayout></PrivateRoute>} />
        
        {/* Customer Routes */}
        <Route path="/"                      element={<CustomerLayout><HomePage /></CustomerLayout>} />
        <Route path="/restaurants"           element={<CustomerLayout><RestaurantsPage /></CustomerLayout>} />
        <Route path="/restaurants/:id"       element={<CustomerLayout><RestaurantDetailPage /></CustomerLayout>} />
        <Route path="/food/:id"              element={<CustomerLayout><FoodDetailPage /></CustomerLayout>} />
        <Route path="/product/:id"           element={<CustomerLayout><ProductDetailPage /></CustomerLayout>} />
        <Route path="/booking/:restaurantId" element={<CustomerLayout><TableBookingPage /></CustomerLayout>} />
        <Route path="/stores"                element={<CustomerLayout><StoresPage /></CustomerLayout>} />
        <Route path="/stores/:id"            element={<CustomerLayout><StoreDetailPage /></CustomerLayout>} />
        <Route path="/cart"                  element={<CustomerLayout><CartPage /></CustomerLayout>} />
        <Route path="/login"                 element={<AuthPage />} />
        <Route path="/checkout"              element={<PrivateRoute role="customer"><CustomerLayout><CheckoutPage /></CustomerLayout></PrivateRoute>} />
        <Route path="/payment/upi"           element={<PrivateRoute role="customer"><UpiPaymentPage /></PrivateRoute>} />
        <Route path="/orders"                element={<PrivateRoute role="customer"><CustomerLayout><OrderHistoryPage /></CustomerLayout></PrivateRoute>} />
        <Route path="/orders/:id/track"      element={<PrivateRoute role="customer"><CustomerLayout><OrderTrackingPage /></CustomerLayout></PrivateRoute>} />

        {/* Admin Routes */}
        <Route path="/admin"                    element={<PrivateRoute role="admin"><AdminLayout><AdminDashboard /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/stores"             element={<PrivateRoute role="admin"><AdminLayout><AdminStores /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/restaurants"        element={<PrivateRoute role="admin"><AdminLayout><AdminRestaurants /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/users"              element={<PrivateRoute role="admin"><AdminLayout><AdminUsers /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/orders"             element={<PrivateRoute role="admin"><AdminLayout><AdminOrders /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/bookings"           element={<PrivateRoute role="admin"><AdminLayout><AdminBookings /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/delivery-agents"    element={<PrivateRoute role="admin"><AdminLayout><AdminDeliveryAgents /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/categories"         element={<PrivateRoute role="admin"><AdminLayout><AdminCategories /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/items"              element={<PrivateRoute role="admin"><AdminLayout><AdminItems /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/payouts"            element={<PrivateRoute role="admin"><AdminLayout><AdminPayouts /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/service-areas"      element={<PrivateRoute role="admin"><AdminLayout><AdminServiceAreas /></AdminLayout></PrivateRoute>} />

        {/* Restaurant Routes */}
        <Route path="/restaurant"                element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantDashboard /></RestaurantLayout></PrivateRoute>} />
        <Route path="/restaurant/menu"           element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantMenu /></RestaurantLayout></PrivateRoute>} />
        <Route path="/restaurant/orders"         element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantOrders /></RestaurantLayout></PrivateRoute>} />
        <Route path="/restaurant/tables"         element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantTables /></RestaurantLayout></PrivateRoute>} />
        <Route path="/restaurant/table-bookings" element={<PrivateRoute role="restaurant"><RestaurantLayout><RestaurantBookings /></RestaurantLayout></PrivateRoute>} />

        {/* Store Owner Routes */}
        <Route path="/store-owner"          element={<PrivateRoute role="store_owner"><StoreOwnerLayout><StoreOwnerDashboard /></StoreOwnerLayout></PrivateRoute>} />
        <Route path="/store-owner/products" element={<PrivateRoute role="store_owner"><StoreOwnerLayout><StoreOwnerProducts /></StoreOwnerLayout></PrivateRoute>} />
        <Route path="/store-owner/orders"   element={<PrivateRoute role="store_owner"><StoreOwnerLayout><StoreOwnerOrders /></StoreOwnerLayout></PrivateRoute>} />

        {/* Delivery Routes */}
        <Route path="/delivery"             element={<PrivateRoute role="delivery"><DeliveryLayout><DeliveryDashboard /></DeliveryLayout></PrivateRoute>} />
        <Route path="/delivery/history"     element={<PrivateRoute role="delivery"><DeliveryLayout><DeliveryHistory /></DeliveryLayout></PrivateRoute>} />
        <Route path="/delivery/orders/:id"  element={<PrivateRoute role="delivery"><DeliveryLayout><DeliveryOrderPage /></DeliveryLayout></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </Suspense>
  );
}
