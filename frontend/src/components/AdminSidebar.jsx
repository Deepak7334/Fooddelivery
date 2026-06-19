import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiShoppingBag, FiUsers, FiList, FiTag, FiLogOut, FiX, FiTruck, FiCalendar } from 'react-icons/fi';

const navLinks = [
  { to: '/admin', icon: <FiGrid />, label: 'Dashboard', exact: true },
  { to: '/admin/restaurants', icon: <FiShoppingBag />, label: 'Restaurants' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/orders', icon: <FiList />, label: 'All Orders' },
  { to: '/admin/bookings', icon: <FiCalendar />, label: 'Table Bookings' },
  { to: '/admin/delivery-agents', icon: <FiTruck />, label: 'Delivery Agents' },
  { to: '/admin/categories', icon: <FiTag />, label: 'Categories' },
];

export default function AdminSidebar({ open, onClose }) {
  const location = useLocation();
  const { logout } = useAuth();
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, display: 'block' }}>Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={`sidebar-link ${isActive(link.to, link.exact) ? 'active' : ''}`} onClick={onClose}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border)', marginTop: 40 }}>
          <button onClick={() => { logout(); navigate('/login'); onClose?.(); }} className="sidebar-link" style={{ width: '100%', background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
