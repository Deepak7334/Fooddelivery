import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiGrid, FiPackage, FiList, FiLogOut, FiX, FiMenu, FiUser } from 'react-icons/fi';

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
          JD<span style={{ color: 'var(--text-primary)' }}>mart</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, display: 'block' }}>Store Panel</span>
        </div>
        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={`sidebar-link ${isActive(link.to, link.exact) ? 'active' : ''}`} onClick={onClose}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border)', marginTop: 40 }}>
          <div style={{ padding: '8px 16px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            <FiUser size={12} style={{ marginRight: 6 }} />{user?.name}
          </div>
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
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <FiMenu size={20} />
          </button>
          <span className="panel-topbar-title">🏪 Store Panel</span>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
