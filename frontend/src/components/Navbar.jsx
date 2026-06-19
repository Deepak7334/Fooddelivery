import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut, FiPackage, FiHome, FiList, FiCalendar } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); setMobileOpen(false); };
  const isActive = (path) => location.pathname === path;

  useEffect(() => { setMobileOpen(false); setDropdownOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
        background: 'rgba(15,15,26,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: '70px', display: 'flex', alignItems: 'center',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 22, color: 'var(--primary)', textDecoration: 'none' }}>
            <span>JD<span style={{ color: 'var(--text-primary)' }}>mart</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="desktop-nav">
            <Link to="/" className={`btn btn-secondary btn-sm ${isActive('/') ? 'nav-active' : ''}`} style={{ border: 'none', background: 'transparent' }}>Home</Link>
            <Link to="/restaurants" className={`btn btn-secondary btn-sm ${isActive('/restaurants') ? 'nav-active' : ''}`} style={{ border: 'none', background: 'transparent' }}>Restaurants</Link>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Cart */}
            <Link to="/cart" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', transition: 'var(--transition)' }}>
              <FiShoppingCart size={18} />
              {totalItems > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--primary)', color: 'white', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>

            {/* Desktop user dropdown */}
            {user ? (
              <div style={{ position: 'relative' }} ref={dropdownRef} className="desktop-nav">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.2)',
                  borderRadius: 100, color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  <FiUser size={16} color="var(--primary)" />
                  {user.name.split(' ')[0]}
                </button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: 12, padding: 8, minWidth: 180, zIndex: 600,
                    boxShadow: 'var(--shadow)',
                  }}>
                    {user.role === 'customer' && (
                      <>
                        <Link to="/orders" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <FiPackage size={16} /> My Orders
                        </Link>
                        <Link to="/orders?tab=bookings" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <FiCalendar size={16} /> My Bookings
                        </Link>
                      </>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Admin Panel
                      </Link>
                    )}
                    {user.role === 'restaurant' && (
                      <Link to="/restaurant" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Dashboard
                      </Link>
                    )}
                    <div className="divider" style={{ margin: '6px 0' }} />
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--danger)', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,67,54,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <FiLogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm desktop-nav">Sign In</Link>
            )}

            {/* Hamburger — mobile only */}
            <button className="hamburger-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 490, backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Mobile Drawer */}
      <div style={{
        position: 'fixed', top: 70, left: 0, right: 0, zIndex: 495,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 16px 20px',
        transform: mobileOpen ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          <Link to="/" onClick={() => setMobileOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: isActive('/') ? 'var(--primary)' : 'var(--text-secondary)', background: isActive('/') ? 'rgba(255,87,34,0.08)' : 'transparent' }}>
            <FiHome size={18} /> Home
          </Link>
          <Link to="/restaurants" onClick={() => setMobileOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: isActive('/restaurants') ? 'var(--primary)' : 'var(--text-secondary)', background: isActive('/restaurants') ? 'rgba(255,87,34,0.08)' : 'transparent' }}>
            <FiList size={18} /> Restaurants
          </Link>
        </div>

        <div className="divider" />

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              👋 {user.name}
            </div>
            {user.role === 'customer' && (
              <>
                <Link to="/orders" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <FiPackage size={16} /> My Orders
                </Link>
                <Link to="/orders?tab=bookings" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <FiCalendar size={16} /> My Bookings
                </Link>
              </>
            )}
            {user.role === 'admin' && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                Admin Panel
              </Link>
            )}
            {user.role === 'restaurant' && (
              <Link to="/restaurant" onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                Dashboard
              </Link>
            )}
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--danger)', background: 'transparent', width: '100%', border: 'none', cursor: 'pointer' }}>
              <FiLogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            <Link to="/login" className="btn btn-primary btn-full" onClick={() => setMobileOpen(false)}>Sign In</Link>
          </div>
        )}
      </div>
    </>
  );
}
