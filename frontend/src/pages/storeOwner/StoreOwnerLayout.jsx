import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiPackage, FiList, FiLogOut, FiX, FiMenu, FiUser, FiSettings } from 'react-icons/fi';
import NotificationBell from '../../components/NotificationBell';

const navLinks = [
  { to: '/store-owner', icon: <FiGrid />, label: 'Dashboard', exact: true },
  { to: '/store-owner/products', icon: <FiPackage />, label: 'Products' },
  { to: '/store-owner/orders', icon: <FiList />, label: 'Orders' },
];

function StoreOwnerSidebar({ open, onClose }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'sidebar-open' : ''}`} onClick={onClose} />
      <div className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <button className="sidebar-close-btn" onClick={onClose}><FiX size={16} /></button>
        <div className="sidebar-logo">
          JD<span style={{ color: 'var(--text-primary)' }}>kart</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, display: 'block' }}>Store Panel</span>
        </div>
        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={`sidebar-link ${isActive(link.to, link.exact) ? 'active' : ''}`} onClick={onClose}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ paddingTop: 24, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <div style={{ padding: '8px 16px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            <FiUser size={12} style={{ marginRight: 6 }} />{user?.name}
          </div>
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

export default function StoreOwnerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div style={{ display: 'flex' }}>
      <StoreOwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
