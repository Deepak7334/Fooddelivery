import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiHome, FiGrid, FiSearch, FiShoppingBag, FiUser } from 'react-icons/fi';

export default function BottomNav() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const { pathname, search } = useLocation();
  const view = new URLSearchParams(search).get('view');
  if (/^\/(food\/|product\/|booking(\/|$)|checkout|payment\/)/.test(pathname)) return null;

  const items = [
    { label: 'Home', to: '/', icon: FiHome, active: pathname === '/' && !view },
    { label: 'Categories', to: '/?view=categories', icon: FiGrid, active: view === 'categories' || view === 'food' || pathname.startsWith('/restaurants') || pathname.startsWith('/stores') },
    { label: 'Search', to: '/?view=search', icon: FiSearch, active: view === 'search' },
    { label: 'Cart', to: '/cart', icon: FiShoppingBag, active: pathname === '/cart' },
    { label: 'Profile', to: '/profile', icon: FiUser, active: pathname === '/profile' || pathname.startsWith('/orders') },
  ];

  return (
    <nav className="customer-bottom-nav" aria-label="Main navigation">
      {items.map(({ label, to, icon: Icon, active }) => <Link key={label} to={to} className={`customer-bottom-item ${active ? 'active' : ''}`} aria-label={label} title={label} aria-current={active ? 'page' : undefined}>
        <Icon size={22} />
        {label === 'Cart' && totalItems > 0 && <span className="customer-cart-count">{totalItems > 9 ? '9+' : totalItems}</span>}
      </Link>)}
    </nav>
  );
}
