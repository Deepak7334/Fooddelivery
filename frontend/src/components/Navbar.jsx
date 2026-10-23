import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut, FiPackage, FiHome, FiList, FiCalendar, FiShoppingBag, FiSun, FiMoon } from 'react-icons/fi';
import NotificationBell from './NotificationBell';
import api from '../lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); setMobileOpen(false); };
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    // eslint-disable-next-line
    setMobileOpen(false); setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchParams = new URLSearchParams(location.search);
  const vegOnly = searchParams.get('veg') === 'true';

  const [scrolled, setScrolled] = useState(false);
  const [locName, setLocName] = useState(localStorage.getItem('jdkart_loc_name') || '');
  const [navSearch, setNavSearch] = useState('');
  const [navSuggestions, setNavSuggestions] = useState([]);
  const [showNavSuggestions, setShowNavSuggestions] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!isActive('/')) {
        setScrolled(window.scrollY > 120);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const handleHeroVis = (e) => {
      if (isActive('/')) {
        setScrolled(Boolean(e.detail?.showSticky));
      }
    };
    window.addEventListener('heroSearchVisibility', handleHeroVis);
    return () => window.removeEventListener('heroSearchVisibility', handleHeroVis);
  }, [location.pathname]);

  useEffect(() => {
    if (!navSearch.trim()) {
      setNavSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/customer/search-suggestions?q=${encodeURIComponent(navSearch.trim())}`);
        if (res.data.success) {
          setNavSuggestions(res.data.suggestions || []);
        }
      } catch (err) {
        console.error('Navbar search error:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [navSearch]);

  const handleNavSearchSubmit = (e) => {
    e.preventDefault();
    if (!navSearch.trim()) return;
    setShowNavSuggestions(false);
    navigate(`/restaurants?search=${encodeURIComponent(navSearch.trim())}`);
  };

  useEffect(() => {
    const updateLoc = () => setLocName(localStorage.getItem('jdkart_loc_name') || '');
    window.addEventListener('locationUpdated', updateLoc);
    return () => window.removeEventListener('locationUpdated', updateLoc);
  }, []);

  const handleVegToggle = () => {
    const params = new URLSearchParams(location.search);
    params.set('veg', (!vegOnly).toString());
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    const val = e.target.search.value;
    const params = new URLSearchParams(location.search);
    if (val.trim()) params.set('search', val.trim());
    else params.delete('search');
    navigate(`/${location.pathname === '/' ? 'restaurants' : location.pathname.substring(1)}?${params.toString()}`);
  };

  const showStickySearch = (
    isActive('/') && scrolled
  ) || (
    (location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/stores')) && 
    (scrolled || searchParams.has('search'))
  );

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
        background: 'var(--bg-dark)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '70px' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 22, color: 'var(--primary)', textDecoration: 'none' }}>
            <span>JD<span style={{ color: 'var(--text-primary)' }}>kart</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
            {showStickySearch ? (
              <div style={{ display: 'flex', width: '100%', maxWidth: 720, gap: 12, alignItems: 'center' }}>
                <form onSubmit={handleNavSearchSubmit} className="search-form" style={{ flex: 1, margin: 0, padding: '4px 6px', position: 'relative' }}>
                  <div 
                    className="search-location" 
                    onClick={() => window.dispatchEvent(new Event('requestLocationPrompt'))}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 18, color: 'var(--primary)', marginRight: 8, display: 'flex' }}>📍</span>
                    <input
                      type="text"
                      className="search-input-field"
                      placeholder="Enter city or detect"
                      value={locName ? locName.replace('📍 ', '') : ''}
                      readOnly
                      style={{ color: 'var(--text-primary)', padding: '10px 0', fontSize: 14, cursor: 'pointer', pointerEvents: 'none' }}
                    />
                  </div>
                  <div className="search-input-wrap" style={{ position: 'relative' }}>
                    <input
                      name="search"
                      className="search-input-field"
                      placeholder="Search restaurants, foods, groceries…"
                      value={navSearch}
                      onChange={e => { setNavSearch(e.target.value); setShowNavSuggestions(true); }}
                      onFocus={() => setShowNavSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowNavSuggestions(false), 200)}
                      autoComplete="off"
                      style={{ color: 'var(--text-primary)', padding: '10px 0', fontSize: 14 }}
                    />

                    {showNavSuggestions && navSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        minWidth: 320,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        marginTop: 10,
                        zIndex: 9999,
                        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                        maxHeight: 360,
                        overflowY: 'auto'
                      }}>
                        {navSuggestions.map((s, i) => (
                          <div
                            key={i}
                            onMouseDown={() => {
                              setNavSearch(s.name);
                              setShowNavSuggestions(false);
                              if (s.itemType === 'restaurant') navigate(`/restaurants/${s._id}`);
                              else if (s.itemType === 'store') navigate(`/stores/${s._id}`);
                              else if (s.itemType === 'food') navigate(`/food/${s._id}`);
                              else if (s.itemType === 'product') navigate(`/product/${s._id}`);
                            }}
                            style={{
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              cursor: 'pointer',
                              borderBottom: i < navSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                              transition: 'background 0.2s',
                              textAlign: 'left'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-border)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontSize: 18 }}>
                              {s.itemType === 'food' ? '🍽️' : s.itemType === 'product' ? '📦' : s.itemType === 'restaurant' ? '🏪' : '🛒'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {s.itemType.charAt(0).toUpperCase() + s.itemType.slice(1)}
                                {s.restaurantId?.name ? ` from ${s.restaurantId.name}` : s.storeId?.name ? ` from ${s.storeId.name}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary search-submit-btn">
                    Search
                  </button>
                </form>
                
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 4 }}>
                <Link to="/" className={`btn btn-secondary btn-sm ${isActive('/') ? 'nav-active' : ''}`} style={{ border: 'none', background: 'transparent' }}>Home</Link>
                <Link to="/restaurants" className={`btn btn-secondary btn-sm ${location.pathname.startsWith('/restaurants') ? 'nav-active' : ''}`} style={{ border: 'none', background: 'transparent' }}>Restaurants</Link>
                <Link to="/stores" className={`btn btn-secondary btn-sm ${location.pathname.startsWith('/stores') ? 'nav-active' : ''}`} style={{ border: 'none', background: 'transparent' }}>Stores</Link>
              </div>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'var(--glass)', color: 'var(--text-primary)', transition: 'var(--transition)', border: '1px solid var(--glass-border)', cursor: 'pointer' }} aria-label="Toggle theme">
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            {/* Notifications */}
            {user && <NotificationBell />}

            {/* Cart */}
            <Link to="/cart" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'var(--glass)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', transition: 'var(--transition)' }}>
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
                  {user.name ? user.name.split(' ')[0] : 'User'}
                </button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: 12, padding: 8, minWidth: 180, zIndex: 600,
                    boxShadow: 'var(--shadow)',
                  }}>
                    <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <FiUser size={16} /> My Profile
                    </Link>
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
                    {(user.role === 'admin' || user.role === 'sub_admin') && (
                      <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Admin Panel
                      </Link>
                    )}
                    {user.role === 'store_owner' && (
                      <Link to="/store-owner" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,87,34,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Store Panel
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

        {/* Mobile Extra (Search + Veg Toggle) */}
        {showStickySearch && (
          <div className="mobile-only" style={{ width: '100%', padding: '0 4px 4px 8px', display: 'flex' }}>
            <div style={{ display: 'flex', width: '100%', gap: 4, alignItems: 'center' }}>
              <form onSubmit={handleNavSearchSubmit} className="search-form" style={{ flex: 1, margin: 0, padding: '2px 4px', display: 'flex', alignItems: 'center', position: 'relative' }}>
                <div 
                  className="search-location" 
                  onClick={() => window.dispatchEvent(new Event('requestLocationPrompt'))}
                  style={{ display: 'flex', alignItems: 'center', padding: '0 4px', flex: '1 1 40px', minWidth: 0, borderRight: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 12, color: 'var(--primary)', marginRight: 2, display: 'flex' }}>📍</span>
                  <input
                    type="text"
                    className="search-input-field"
                    placeholder="City"
                    value={locName ? locName.replace('📍 ', '') : ''}
                    readOnly
                    style={{ pointerEvents: 'none', color: 'var(--text-primary)', padding: '4px 0', fontSize: 10, cursor: 'pointer', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', background: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
                <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center', padding: '0 4px', flex: '2 1 60px', minWidth: 0, position: 'relative' }}>
                  <input
                    name="search"
                    className="search-input-field"
                    placeholder="Search foods, groceries…"
                    value={navSearch}
                    onChange={e => { setNavSearch(e.target.value); setShowNavSuggestions(true); }}
                    onFocus={() => setShowNavSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNavSuggestions(false), 200)}
                    autoComplete="off"
                    style={{ color: 'var(--text-primary)', padding: '4px 0', fontSize: 11, width: '100%', background: 'transparent', border: 'none', outline: 'none' }}
                  />

                  {showNavSuggestions && navSuggestions.length > 0 && (
                    <div style={{
                      position: 'fixed',
                      top: '110px',
                      left: '12px',
                      right: '12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      zIndex: 9999,
                      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                      maxHeight: 320,
                      overflowY: 'auto'
                    }}>
                      {navSuggestions.map((s, i) => (
                        <div
                          key={i}
                          onMouseDown={() => {
                            setNavSearch(s.name);
                            setShowNavSuggestions(false);
                            if (s.itemType === 'restaurant') navigate(`/restaurants/${s._id}`);
                            else if (s.itemType === 'store') navigate(`/stores/${s._id}`);
                            else if (s.itemType === 'food') navigate(`/food/${s._id}`);
                            else if (s.itemType === 'product') navigate(`/product/${s._id}`);
                          }}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            borderBottom: i < navSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ fontSize: 18 }}>
                            {s.itemType === 'food' ? '🍽️' : s.itemType === 'product' ? '📦' : s.itemType === 'restaurant' ? '🏪' : '🛒'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {s.itemType.charAt(0).toUpperCase() + s.itemType.slice(1)}
                              {s.restaurantId?.name ? ` from ${s.restaurantId.name}` : s.storeId?.name ? ` from ${s.storeId.name}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 10, borderRadius: 100, flexShrink: 0, margin: 0 }}>
                  Search
                </button>
              </form>
              
              
            </div>
          </div>
        )}
      </nav>

      {/* Adjust padding for the navbar since it's now taller on mobile */}
      {location.pathname.startsWith('/restaurants') && (
        <div className="mobile-only" style={{ paddingTop: 60 }} />
      )}

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
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: location.pathname.startsWith('/restaurants') ? 'var(--primary)' : 'var(--text-secondary)', background: location.pathname.startsWith('/restaurants') ? 'rgba(255,87,34,0.08)' : 'transparent' }}>
            <FiList size={18} /> Restaurants
          </Link>
          <Link to="/stores" onClick={() => setMobileOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: location.pathname.startsWith('/stores') ? 'var(--primary)' : 'var(--text-secondary)', background: location.pathname.startsWith('/stores') ? 'rgba(255,87,34,0.08)' : 'transparent' }}>
            <FiShoppingBag size={18} /> Stores
          </Link>
        </div>

        <div className="divider" />

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              👋 {user.name || 'User'}
            </div>
            <Link to="/profile" onClick={() => setMobileOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
              <FiUser size={16} /> My Profile
            </Link>
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
            {(user.role === 'admin' || user.role === 'sub_admin') && (
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
