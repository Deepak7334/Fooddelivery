import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiShoppingBag, FiUsers, FiList, FiTag, FiLogOut, FiX, FiTruck, FiCalendar, FiPackage, FiSettings, FiDollarSign } from 'react-icons/fi';

const navLinks = [
  { to: '/admin', icon: <FiGrid />, label: 'Dashboard', exact: true },
  { to: '/admin/payouts', icon: <FiDollarSign />, label: 'Vendor Payouts' },
  { to: '/admin/restaurants', icon: <FiShoppingBag />, label: 'Restaurants' },
  { to: '/admin/stores', icon: <FiPackage />, label: 'Stores' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/orders', icon: <FiList />, label: 'All Orders' },
  { to: '/admin/bookings', icon: <FiCalendar />, label: 'Table Bookings' },
  { to: '/admin/delivery-agents', icon: <FiTruck />, label: 'Delivery Agents' },
  { to: '/admin/categories', icon: <FiTag />, label: 'Categories' },
  { to: '/admin/items', icon: <FiList />, label: 'Manage Items' },
  { to: '/admin/service-areas', icon: <FiTag />, label: 'Service Areas' },
];

export default function AdminSidebar({ open, onClose }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);
  
  const filteredLinks = navLinks.filter(link => {
    if (user?.role === 'sub_admin') {
      return !['/admin/payouts', '/admin/categories', '/admin/service-areas'].includes(link.to);
    }
    return true;
  });

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
          JD<span style={{ color: 'var(--text-primary)' }}>kart</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, display: 'block' }}>Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          {filteredLinks.map(link => (
            <Link key={link.to} to={link.to} className={`sidebar-link ${isActive(link.to, link.exact) ? 'active' : ''}`} onClick={onClose}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ paddingTop: 24, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <Link to="/profile" className={`sidebar-link ${isActive('/profile') ? 'active' : ''}`} onClick={onClose}>
            <FiSettings /> Profile Settings
          </Link>
          <button onClick={() => { logout(); navigate('/login'); onClose?.(); }} className="sidebar-link" style={{ width: '100%', background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
