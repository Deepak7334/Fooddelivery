import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiHome, FiShoppingBag, FiShoppingCart, FiUser } from 'react-icons/fi';

export default function BottomNav() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Do not show bottom nav on admin, restaurant, delivery, store-owner panels
  if (['/admin', '/restaurant', '/delivery', '/store-owner'].some(p => location.pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <FiHome size={22} />
        <span>Home</span>
      </Link>
      
      <Link to="/stores" className={`bottom-nav-item ${isActive('/stores') ? 'active' : ''}`}>
        <FiShoppingBag size={22} />
        <span>Stores</span>
      </Link>
      
      <Link to="/cart" className={`bottom-nav-item ${isActive('/cart') ? 'active' : ''}`} style={{ position: 'relative' }}>
        <FiShoppingCart size={22} />
        {totalItems > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 18,
            background: 'var(--primary)', color: 'white',
            fontSize: 9, fontWeight: 800, width: 16, height: 16,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {totalItems > 9 ? '9+' : totalItems}
          </span>
        )}
        <span>Cart</span>
      </Link>
      
      <Link to={user ? "/orders" : "/login"} className={`bottom-nav-item ${isActive('/orders') || isActive('/login') ? 'active' : ''}`}>
        <FiUser size={22} />
        <span>{user ? 'Account' : 'Login'}</span>
      </Link>
    </nav>
  );
}
