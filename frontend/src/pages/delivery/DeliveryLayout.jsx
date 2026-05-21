import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0F1117', fontFamily: "'DM Sans',sans-serif", color: '#E5E7EB' }}>
            <style>{CSS}</style>
            {/* Sidebar (desktop) */}
            <aside className={`delivery-sidebar ${open ? 'open' : ''}`}>
                <div style={{ padding: '24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: '#F97316' }}> FoodHub</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: 600 }}>Delivery Partner</div>
                </div>
                <nav style={{ padding: '16px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {navLinks.map(link => (
                        <Link key={link.to} to={link.to} onClick={() => setOpen(false)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600, color: isActive(link.to, link.exact) ? '#F97316' : '#9CA3AF', background: isActive(link.to, link.exact) ? 'rgba(249,115,22,0.1)' : 'transparent', border: isActive(link.to, link.exact) ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <span style={{ fontSize: 18 }}>{link.icon}</span> {link.label}
                        </Link>
                    ))}
                </nav>
                <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#E5E7EB', marginBottom: 4 }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>{user?.phone}</div>
                    <button onClick={() => { logout(); navigate('/login'); }}
                        style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Logout
                    </button>
                </div>
            </aside>
            {/* Mobile overlay */}
            {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 98 }} onClick={() => setOpen(false)} />}
            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Mobile topbar */}
                <div className="delivery-topbar">
                    <button onClick={() => setOpen(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E5E7EB', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☰</button>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#F97316' }}>🚴 Delivery App</div>
                    <div style={{ width: 36 }} />
                </div>
                {/* Bottom Nav (mobile) */}
                <nav className="bottom-nav">
                    {navLinks.map(link => (
                        <Link key={link.to} to={link.to}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', color: isActive(link.to, link.exact) ? '#F97316' : '#6B7280', flex: 1, padding: '8px 0' }}>
                            <span style={{ fontSize: 22 }}>{link.icon}</span>
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{link.label}</span>
                        </Link>
                    ))}
                </nav>
                <main style={{ flex: 1, padding: '16px', overflowY: 'auto', paddingBottom: 72 }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
* { box-sizing: border-box; }
.delivery-sidebar { width: 220px; background: #161B22; border-right: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; flex-shrink: 0; z-index: 99; }
.delivery-topbar { display: none; align-items: center; justify-content: space-between; padding: 12px 16px; background: #161B22; border-bottom: 1px solid rgba(255,255,255,0.07); }
.bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #161B22; border-top: 1px solid rgba(255,255,255,0.1); z-index: 99; }
@media (max-width: 640px) {
  .delivery-sidebar { position: fixed; left: -220px; top: 0; height: 100%; transition: left 0.28s ease; z-index: 99; }
  .delivery-sidebar.open { left: 0; }
  .delivery-topbar { display: flex; }
  .bottom-nav { display: flex; }
}
`;