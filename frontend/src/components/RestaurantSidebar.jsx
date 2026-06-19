import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiList, FiPackage, FiLogOut, FiX, FiLayout, FiCalendar } from 'react-icons/fi';

const navLinks = [
  { to: '/restaurant', icon: <FiGrid />, label: 'Dashboard', exact: true },
  { to: '/restaurant/menu', icon: <FiPackage />, label: 'My Menu' },
  { to: '/restaurant/orders', icon: <FiList />, label: 'Orders' },
  { to: '/restaurant/tables', icon: <FiLayout />, label: 'Tables' },
  { to: '/restaurant/table-bookings', icon: <FiCalendar />, label: 'Bookings' },
];

export default function RestaurantSidebar({ open, onClose }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay ${open ? 'sidebar-open' : ''}`}
        onClick={onClose}
      />

      <div className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        {/* Close button (mobile only) */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <FiX size={16} />
        </button>

        <div className="sidebar-logo">
          JD<span style={{ color: 'var(--text-primary)' }}>mart</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, display: 'block' }}>Restaurant Panel</span>
        </div>
        {user && <div style={{ padding: '0 12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>👋 {user.name}</div>}
        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={`sidebar-link ${isActive(link.to, link.exact) ? 'active' : ''}`} onClick={onClose}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 40, paddingTop: 16 }}>
          <button onClick={() => { logout(); navigate('/login'); onClose?.(); }} className="sidebar-link" style={{ width: '100%', background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
