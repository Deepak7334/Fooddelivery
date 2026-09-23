import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/delivery',         icon: '🚴', label: 'Dashboard', exact: true },
  { to: '/delivery/history', icon: '📊', label: 'Earnings & History' },
];

export default function DeliveryLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="dl-root">
      <style>{CSS}</style>

      {/* ── Sidebar (desktop) ── */}
      <aside className={`dl-sidebar${open ? ' open' : ''}`}>
        {/* Brand */}
        <div className="dl-sidebar-brand">
          <div className="dl-brand-logo">🚴</div>
          <div>
            <div className="dl-brand-name">JDkart</div>
            <div className="dl-brand-sub">Delivery Partner</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="dl-sidebar-nav">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`dl-nav-link${isActive(link.to, link.exact) ? ' active' : ''}`}
            >
              <span className="dl-nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="dl-sidebar-footer">
          <div className="dl-user-info">
            <div className="dl-user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div className="dl-user-name">{user?.name}</div>
              <div className="dl-user-phone">{user?.phone}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="dl-logout-btn">
            ↩ Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div className="dl-overlay" onClick={() => setOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="dl-main">
        {/* Mobile topbar */}
        <header className="dl-topbar">
          <button
            className="dl-hamburger"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="dl-topbar-brand">🚴 JDkart</div>
          <div style={{ width: 36 }} />
        </header>

        {/* Page content */}
        <main className="dl-content">
          {children}
        </main>

      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Root ── */
.dl-root {
  display: flex;
  min-height: 100vh;
  background: #080C14;
  font-family: 'Inter', sans-serif;
  color: #E5E7EB;
}

/* ── Sidebar ── */
.dl-sidebar {
  width: 230px;
  flex-shrink: 0;
  background: #111827;
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 200;
  transition: transform 0.25s ease;
}

/* Brand block */
.dl-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 22px 18px;
  border-bottom: 1px solid var(--glass-border);
}
.dl-brand-logo {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #F97316, #EF4444);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.dl-brand-name { font-size: 16px; font-weight: 900; color: #F97316; line-height: 1; }
.dl-brand-sub  { font-size: 11px; color: #6B7280; font-weight: 600; margin-top: 2px; }

/* Nav links */
.dl-sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 10px;
  overflow-y: auto;
}
.dl-nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  border: 1px solid transparent;
  transition: all 0.18s;
}
.dl-nav-link:hover {
  color: #E5E7EB;
  background: var(--glass-border);
}
.dl-nav-link.active {
  color: #F97316;
  background: rgba(249,115,22,0.1);
  border-color: rgba(249,115,22,0.2);
}
.dl-nav-icon { font-size: 18px; line-height: 1; }

/* Footer */
.dl-sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dl-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dl-user-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F97316, #EF4444);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; color: #fff;
  flex-shrink: 0;
}
.dl-user-name  { font-size: 13px; font-weight: 700; color: #E5E7EB; }
.dl-user-phone { font-size: 11px; color: #6B7280; margin-top: 1px; }
.dl-logout-btn {
  width: 100%;
  padding: 9px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  color: #EF4444;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: background 0.15s;
}
.dl-logout-btn:hover { background: rgba(239,68,68,0.16); }

/* ── Overlay (mobile) ── */
.dl-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(3px);
  z-index: 199;
}

/* ── Main column ── */
.dl-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
}

/* Mobile topbar (hidden on desktop) */
.dl-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  background: #111827;
  border-bottom: 1px solid var(--glass-border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.dl-hamburger {
  width: 36px; height: 36px;
  background: var(--glass-border);
  border: 1px solid var(--glass-border);
  border-radius: 9px;
  color: #E5E7EB;
  font-size: 17px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.dl-hamburger:hover { background: rgba(255,255,255,0.12); }
.dl-topbar-brand { font-size: 16px; font-weight: 800; color: #F97316; }

/* Page content */
.dl-content {
  flex: 1;
  overflow-y: auto;
  /* bottom padding leaves room for the bottom nav on mobile */
  padding-bottom: 0;
}



/* ── Mobile breakpoint ── */
@media (max-width: 640px) {
  .dl-sidebar {
    position: fixed;
    top: 0; left: 0;
    height: 100%;
    transform: translateX(-100%);
    box-shadow: 4px 0 30px rgba(0,0,0,0.5);
  }
  .dl-sidebar.open {
    transform: translateX(0);
  }
  .dl-topbar     { display: flex; }
}

@media (prefers-reduced-motion: reduce) {
  .dl-sidebar { transition: none; }
}
`;