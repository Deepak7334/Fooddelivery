import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const navLinks = [
  { to: '/delivery', icon: '🚴', label: 'Dashboard', exact: true },
  { to: '/delivery/history', icon: '📊', label: 'Earnings & History' },
];

export default function DeliveryLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="delivery-layout" style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--bg-dark)', fontFamily: "'DM Sans',sans-serif", color: 'var(--text-primary)', transition: 'background 0.25s ease, color 0.25s ease' }}>
      <style>{CSS}</style>

      {/* Sidebar (desktop sticky, mobile slide-in drawer) */}
      <aside className={`delivery-sidebar ${open ? 'open' : ''}`}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#F97316' }}>JDkart</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>Delivery Partner</div>
          </div>
          <button className="delivery-close-btn" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <nav style={{ padding: '16px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600, color: isActive(link.to, link.exact) ? '#F97316' : 'var(--text-secondary)', background: isActive(link.to, link.exact) ? 'rgba(249,115,22,0.12)' : 'transparent', border: isActive(link.to, link.exact) ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent', transition: 'all 0.2s' }}>
              <span style={{ fontSize: 18 }}>{link.icon}</span> {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{user?.phone}</div>

          <Link to="/profile" 
            style={{ display: 'block', width: '100%', padding: '9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', marginBottom: 8, fontFamily: 'inherit' }}>
             Profile Settings
          </Link>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 998 }} onClick={() => setOpen(false)} />}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <div className="delivery-topbar">
          <div style={{ fontWeight: 800, fontSize: 20, color: '#F97316' }}> 
            <span>JD<span style={{ color: 'var(--text-primary)' }}>kart</span></span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <button onClick={() => setOpen(true)} style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☰</button>
          </div>
        </div>

        <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
* { box-sizing: border-box; }
.delivery-layout {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  margin: 0;
  padding: 0;
}
.delivery-sidebar {
  width: 230px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  flex-shrink: 0;
  z-index: 99;
  overflow-y: auto;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.delivery-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.delivery-close-btn:hover {
  color: var(--text-primary);
  background: var(--glass);
}
.delivery-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 90;
  transition: background 0.25s ease, border-color 0.25s ease;
}

@media (max-width: 768px) {
  .delivery-sidebar {
    position: fixed;
    left: -250px;
    top: 0;
    bottom: 0;
    width: 250px;
    height: 100vh;
    height: 100dvh;
    transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease;
    z-index: 999;
    box-shadow: 4px 0 24px rgba(0,0,0,0.35);
  }
  .delivery-sidebar.open {
    left: 0;
  }
  .delivery-close-btn {
    display: block;
  }
  .delivery-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 90;
  }
}
`;