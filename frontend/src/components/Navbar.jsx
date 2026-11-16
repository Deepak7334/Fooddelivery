import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { 
  FiBell, FiCalendar, FiChevronDown, FiGrid, 
  FiLogOut, FiMapPin, FiPackage, FiSearch, FiSettings, 
  FiShoppingBag, FiShoppingCart, FiUser, FiX
} from 'react-icons/fi';
import { MdOutlineRestaurant, MdOutlineStorefront, MdOutlineTableRestaurant } from 'react-icons/md';
import NotificationBell from './NotificationBell';
import { homeBanners } from './customerHomeDesign';
import api from '../lib/api';

const shortcuts = [
  { label: 'Food', to: '/?view=food', icon: MdOutlineRestaurant },
  { label: 'Grocery', to: '/stores', icon: FiShoppingCart },
  { label: 'Restaurants', to: '/restaurants', icon: MdOutlineStorefront },
  { label: 'Book a Table', to: '/booking', icon: MdOutlineTableRestaurant },
];

/**
 * Deterministic color palette for customer email
 */
const getEmailAvatarColor = (str = '') => {
  if (!str) return '#F97316';
  let hash = 0;
  const lower = str.trim().toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = [
    '#F97316', // Foodhub Brand Orange
    '#2563EB', // Blue
    '#059669', // Emerald
    '#7C3AED', // Violet
    '#DB2777', // Pink
    '#0891B2', // Cyan
    '#D97706', // Amber
    '#4F46E5', // Indigo
    '#0D9488', // Teal
    '#E11D48', // Rose
  ];
  return palette[Math.abs(hash) % palette.length];
};

const getAvatarInitial = (user) => {
  if (!user) return 'U';
  if (user.name && user.name.trim()) return user.name.trim().charAt(0).toUpperCase();
  if (user.email && user.email.trim()) return user.email.trim().charAt(0).toUpperCase();
  return 'U';
};

function NavbarUserAvatar({ user }) {
  const [imgError, setImgError] = useState(false);
  const [gravatarUrl, setGravatarUrl] = useState(null);
  const [gravatarFailed, setGravatarFailed] = useState(false);

  const realImage = user?.profileImage || user?.avatar || user?.photoURL;

  useEffect(() => {
    setImgError(false);
    setGravatarFailed(false);

    if (!realImage && user?.email && window.crypto?.subtle) {
      let isMounted = true;
      const calcGravatar = async () => {
        try {
          const buffer = new TextEncoder().encode(user.email.trim().toLowerCase());
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          if (isMounted) {
            setGravatarUrl(`https://www.gravatar.com/avatar/${hex}?d=404&s=84`);
          }
        } catch {
          if (isMounted) setGravatarFailed(true);
        }
      };
      calcGravatar();
      return () => { isMounted = false; };
    } else {
      setGravatarUrl(null);
    }
  }, [realImage, user?.email]);

  if (!user) {
    return <FiUser size={20} />;
  }

  // 1. User uploaded real profile picture
  if (realImage && !imgError) {
    return (
      <img
        src={realImage}
        alt={user.name || user.email || 'Profile'}
        className="customer-navbar-avatar-img"
        onError={() => setImgError(true)}
      />
    );
  }

  // 2. Gravatar picture associated with email (if available)
  if (gravatarUrl && !gravatarFailed) {
    return (
      <img
        src={gravatarUrl}
        alt={user.name || user.email || 'Profile'}
        className="customer-navbar-avatar-img"
        onError={() => setGravatarFailed(true)}
      />
    );
  }

  // 3. Deterministic colorful email initial badge
  const bg = getEmailAvatarColor(user.email || user.name);
  const initial = getAvatarInitial(user);

  return (
    <span
      className="customer-navbar-avatar-badge"
      style={{ backgroundColor: bg, color: '#FFFFFF' }}
      title={user.name || user.email}
    >
      {initial}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isHome = location.pathname === '/' && !params.has('view') && !params.has('category');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [locName, setLocName] = useState(() => localStorage.getItem('jdkart_loc_name') || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(() => params.get('view') === 'search');
  const [navSearch, setNavSearch] = useState('');
  const [navSuggestions, setNavSuggestions] = useState([]);
  const [showNavSuggestions, setShowNavSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const searchBarRef = useRef(null);
  const searchInputRef = useRef(null);
  const banner = isHome ? homeBanners[bannerIndex] : homeBanners[0];

  useEffect(() => {
    if (params.get('view') === 'search') {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [location.search]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        if (!e.target.closest('.customer-header-search-btn')) {
          setSearchOpen(false);
          setShowNavSuggestions(false);
        }
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setShowNavSuggestions(false);
      }
    };
    if (searchOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!navSearch.trim()) {
      setNavSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/customer/search-suggestions?q=${encodeURIComponent(navSearch.trim())}`);
        if (res.data?.success) {
          setNavSuggestions(res.data.suggestions || []);
          setShowNavSuggestions(true);
        }
      } catch (err) {
        setNavSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [navSearch]);

  const toggleSearch = () => {
    setSearchOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 60);
      } else {
        setShowNavSuggestions(false);
      }
      return next;
    });
  };

  const handleNavSearchSubmit = (e) => {
    e.preventDefault();
    if (!navSearch.trim()) return;
    setShowNavSuggestions(false);
    setSearchOpen(false);
    navigate(`/restaurants?search=${encodeURIComponent(navSearch.trim())}`);
  };

  const handleSelectSuggestion = (s) => {
    setShowNavSuggestions(false);
    setSearchOpen(false);
    setNavSearch('');
    if (s.itemType === 'food') navigate(`/food/${s._id}`);
    else if (s.itemType === 'product') navigate(`/product/${s._id}`);
    else if (s.itemType === 'restaurant') navigate(`/restaurants/${s._id}`);
    else if (s.itemType === 'store') navigate(`/stores/${s._id}`);
  };

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector('.customer-hero-section');
      const header = dropdownRef.current?.closest('.customer-header') || document.querySelector('.customer-header');
      if (hero && header) {
        const heroBottom = hero.getBoundingClientRect().bottom;
        const headerBottom = header.offsetHeight;
        // Navbar curves ONLY if hero has fully scrolled up behind the navbar
        setIsScrolled(prev => {
          if (prev) {
            return heroBottom <= headerBottom + 10;
          }
          return heroBottom <= headerBottom;
        });
      } else {
        setIsScrolled(window.scrollY > 40);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const updateLoc = () => setLocName(localStorage.getItem('jdkart_loc_name') || '');
    const updateBanner = event => setBannerIndex(event.detail);
    window.addEventListener('locationUpdated', updateLoc);
    window.addEventListener('homeBannerChanged', updateBanner);
    return () => {
      window.removeEventListener('locationUpdated', updateLoc);
      window.removeEventListener('homeBannerChanged', updateBanner);
    };
  }, []);

  useEffect(() => {
    const closeMenu = event => {
      if (!dropdownRef.current?.contains(event.target) || event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, []);

  const requestLocation = () => {
    if (location.pathname === '/') window.dispatchEvent(new Event('requestLocationPrompt'));
    else navigate('/?location=select');
  };
  const dashboard = { admin: '/admin', sub_admin: '/admin', restaurant: '/restaurant', store_owner: '/store-owner', delivery: '/delivery' }[user?.role];

  return (
    <header className={`customer-header ${isHome ? 'customer-header-home' : ''} ${isHome && banner.dark ? 'customer-header-dark' : ''} ${isScrolled ? 'customer-header-curved' : ''}`}
      style={{ '--header-color': isHome ? banner.chrome : '#ffffff', '--header-accent': banner.accent }}>
      <div className="container customer-header-row">
        <button className="customer-delivery-location" onClick={requestLocation} aria-label="Choose delivery location">
          <span className="customer-location-icon"><FiMapPin size={21} /></span>
          <span className="customer-address">
            <span className="customer-delivering">DELIVERING TO</span>
            <strong>{locName.replace(/^[📍\s]+/, '') || 'Select location'} <FiChevronDown size={18} /></strong>
            <span className="customer-address-subtitle">{locName ? 'Your delivery location' : 'Showing all stores & restaurants'}</span>
          </span>
        </button>

        {/* Desktop Centre: Navigation Pills OR Search Bar when open */}
        {searchOpen ? (
          <div className="customer-header-search-container" ref={searchBarRef}>
            <form className="customer-header-search-form" onSubmit={handleNavSearchSubmit}>
              <FiSearch size={18} className="customer-header-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="customer-header-search-input"
                placeholder="Search food, groceries, restaurants…"
                value={navSearch}
                onChange={e => { setNavSearch(e.target.value); setShowNavSuggestions(true); }}
                onFocus={() => { if (navSuggestions.length > 0) setShowNavSuggestions(true); }}
                autoComplete="off"
              />
            </form>

            {showNavSuggestions && navSuggestions.length > 0 && (
              <div className="customer-header-search-dropdown">
                {navSuggestions.map((item, idx) => {
                  const icon = item.itemType === 'food' ? '🍲' : item.itemType === 'product' ? '🛒' : item.itemType === 'restaurant' ? '🏪' : '🏬';
                  const subtitle = item.restaurantId?.name 
                    ? `Restaurant · ${item.restaurantId.name}` 
                    : item.storeId?.name 
                    ? `Store · ${item.storeId.name}` 
                    : item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1);
                  return (
                    <div
                      key={idx}
                      className="customer-header-search-item"
                      onMouseDown={() => handleSelectSuggestion(item)}
                    >
                      <span className="customer-search-item-badge">{icon}</span>
                      <div className="customer-search-item-info">
                        <strong>{item.name}</strong>
                        <small>{subtitle}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <nav className="customer-header-center-nav" aria-label="Services navigation">
            {shortcuts.map(({ label, to, icon: Icon }) => {
              const isActive = 
                label === 'Food' ? (location.pathname === '/' && (params.get('view') === 'food' || !params.has('view')) && !params.has('category')) :
                label === 'Grocery' ? location.pathname.startsWith('/stores') :
                label === 'Restaurants' ? (location.pathname.startsWith('/restaurants') && params.get('action') !== 'book') :
                label === 'Book a Table' ? ((location.pathname.startsWith('/restaurants') && params.get('action') === 'book') || location.pathname.startsWith('/booking')) :
                false;

              return (
                <Link 
                  key={label} 
                  to={to} 
                  className={`customer-header-pill ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="customer-header-actions">
          {/* Desktop Search Button */}
          <button 
            type="button"
            onClick={toggleSearch} 
            className={`customer-round-button customer-header-search-btn ${searchOpen ? 'active' : ''}`} 
            aria-label={searchOpen ? "Close search" : "Search"} 
            title={searchOpen ? "Close search" : "Search food & grocery"}
          >
            {searchOpen ? <FiX size={19} /> : <FiSearch size={20} />}
          </button>

          {/* Desktop Cart Button with live count badge */}
          <Link 
            to="/cart" 
            className="customer-round-button customer-header-cart-btn" 
            aria-label="View Cart" 
            title="View Cart"
          >
            <FiShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="customer-cart-count">{totalItems > 9 ? '9+' : totalItems}</span>
            )}
          </Link>

          {user ? (
            <NotificationBell />
          ) : (
            <Link className="customer-round-button" to="/login" aria-label="Notifications" title="Notifications">
              <FiBell size={21} />
            </Link>
          )}

          <div className="customer-account-menu" ref={dropdownRef}>
            <button 
              className={`customer-round-button customer-header-avatar-btn ${user ? 'has-user' : ''}`} 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
              aria-label="Account menu" 
              aria-expanded={dropdownOpen}
              title={user ? (user.name || user.email || 'My Account') : 'Account menu'}
            >
              <NavbarUserAvatar user={user} />
            </button>
            {dropdownOpen && (
              <div className="customer-menu" onClick={() => setDropdownOpen(false)}>
                {user && (
                  <div className="customer-menu-user-header">
                    <div className="customer-menu-user-avatar">
                      <NavbarUserAvatar user={user} />
                    </div>
                    <div className="customer-menu-user-meta">
                      <strong>{user.name || 'Customer'}</strong>
                      {user.email && <span>{user.email}</span>}
                    </div>
                  </div>
                )}
                <Link to="/profile"><FiUser />{user ? 'My Profile' : 'Sign In / Profile'}</Link>
                <Link to="/orders"><FiPackage />My Orders</Link>
                <Link to="/orders?tab=bookings"><FiCalendar />My Bookings</Link>
                <Link to="/offers"><FiGrid />Offers</Link>
                {user && <Link to="/profile?tab=settings"><FiSettings />Settings</Link>}
                {dashboard && <Link to={dashboard}><MdOutlineStorefront />Dashboard</Link>}
                {user && <button onClick={() => { logout(); navigate('/'); }}><FiLogOut />Logout</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {isHome && (
        <nav className="container customer-shortcuts" aria-label="Shop by service">
          {shortcuts.map(({ label, to, icon: Icon }, index) => (
            <Link 
              key={label} 
              to={to} 
              className={`customer-shortcut ${index === bannerIndex && index < 3 ? 'selected' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
