import React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const HERO_FOOD_EMOJIS = ['🍕', '🍔', '🍛', '🌮', '🍜', '🥗'];

// Haversine formula — returns distance in km between two lat/lng points
function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DELIVERY_RADIUS_KM = 5; // deliver within 5 km

const STORE_TYPES = [
  { _id: 'grocery', name: 'Grocery', icon: '🛒', color: '#4CAF50', type: 'store' },
  { _id: 'bakery', name: 'Bakery', icon: '🥐', color: '#FF5722', type: 'store' },
 
];

export default function HomePage() {
  const categoriesRef = React.useRef(null);
  const isDragging = React.useRef(false);
  const startX = React.useRef(0);
  const scrollLeft = React.useRef(0);

  const onDragStart = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - categoriesRef.current.offsetLeft;
    scrollLeft.current = categoriesRef.current.scrollLeft;
  };

  const onDragEnd = () => {
    isDragging.current = false;
  };

  const onDragMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - categoriesRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // scroll-fast
    categoriesRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const [categories, setCategories]   = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [stores, setStores]           = useState([]);
  const [foods, setFoods]             = useState([]);
  const [products, setProducts]       = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [promoBanner, setPromoBanner] = useState({ active: false, text: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationText, setLocationText] = useState(() => {
    try { 
      return localStorage.getItem('jdkart_loc_name') || (localStorage.getItem('jdkart_coords') ? '📍 Current Location' : '');
    } catch { return ''; }
  });
  // GPS coords stored separately from display text
  const [userCoords, setUserCoords]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('jdkart_coords') || 'null'); } catch { return null; }
  });
  const [locLoading, setLocLoading]   = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, addProductToCart, cartItems, cartType, storeId: cartStoreId, updateQuantity } = useCart();
  const locationInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetchData(userCoords);
    // eslint-disable-next-line
  }, [userCoords]);

  useEffect(() => {
    const handleRequestLoc = () => {
      triggerLocationPrompt();
    };
    window.addEventListener('requestLocationPrompt', handleRequestLoc);
    return () => window.removeEventListener('requestLocationPrompt', handleRequestLoc);
  }, []);

  useEffect(() => {
    const checkVisibility = () => {
      if (!searchContainerRef.current) return;
      const rect = searchContainerRef.current.getBoundingClientRect();
      // Only visible when the home page search box has completely passed above the navbar (70px from top)
      const isPastNavbar = rect.bottom <= 70;
      window.dispatchEvent(new CustomEvent('heroSearchVisibility', { detail: { showSticky: isPastNavbar } }));
    };

    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
      window.dispatchEvent(new CustomEvent('heroSearchVisibility', { detail: { showSticky: false } }));
    };
  }, []);

  const fetchData = (coordsObj) => {
    let qs = '';
    if (coordsObj && coordsObj.lat && coordsObj.lng) {
      qs = `?lat=${coordsObj.lat}&lng=${coordsObj.lng}`;
    }

    setLoading(true);
    Promise.all([
      api.get(`/customer/categories`).catch(() => ({ data: { categories: [] } })),
      api.get(`/customer/restaurants${qs}`).catch(() => ({ data: { restaurants: [] } })),
      api.get(`/customer/foods${qs}`).catch(() => ({ data: { foods: [] } })),
      api.get(`/store/products${qs}`).catch(() => ({ data: { products: [] } })),
      api.get(`/store/stores${qs}`).catch(() => ({ data: { stores: [] } })),
      api.get('/customer/settings/promo').catch(() => ({ data: {} }))
    ]).then(([catRes, restRes, foodRes, prodRes, storeRes, promoRes]) => {
        if (promoRes?.data?.success) { setPromoBanner({ active: promoRes.data.promoBannerActive, text: promoRes.data.promoBannerText }); }
      setCategories(catRes.data.categories || []);
      setRestaurants(restRes.data.restaurants || []);
      setFoods(foodRes.data.foods || []);
      setProducts(prodRes.data.products || []);
      setStores(storeRes.data.stores || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  // Removed: duplicate fetchData call — already handled by useEffect([userCoords]) above


  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const triggerLocationPrompt = () => {
    setShowLocationPrompt(true);
  };

  const handleDetectLocation = () => {
    setShowLocationPrompt(false);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocLoading(true);
    toast.loading('Detecting your location…', { id: 'loc' });
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        localStorage.setItem('jdkart_coords', JSON.stringify(coords));
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
          const data = await res.json();
          let locName = '📍 Current Location';
          if (data && data.address) {
            const addr = data.address;
            const place = addr.amenity || addr.building || addr.neighbourhood || addr.suburb || addr.city_district || addr.village || addr.town || addr.city;
            if (place) locName = `📍 ${place}`;
          }
          localStorage.setItem('jdkart_loc_name', locName);
          setLocationText(locName);
          window.dispatchEvent(new Event('locationUpdated'));
        } catch(e) {
          localStorage.setItem('jdkart_loc_name', '📍 Current Location');
          setLocationText('📍 Current Location');
          window.dispatchEvent(new Event('locationUpdated'));
        }

        toast.success('Location detected!', { id: 'loc' });
        setLocLoading(false);
      },
      err => {
        setLocLoading(false);
        console.error("Location error:", err);
        let msg = 'Failed to detect location';
        if (err.code === 1) msg = 'Location access denied. Please allow it in your mobile browser settings.';
        if (err.code === 2) msg = 'Location unavailable. Ensure GPS is on.';
        if (err.code === 3) msg = 'Location request timed out. Try entering your city manually.';
        toast.error(msg, { id: 'loc', duration: 4000 });
      },
      // Mobile optimization: false for high accuracy (uses fast wifi/cell triangulation instead of slow satellite GPS) 
      // and increased timeout to 20 seconds for slower mobile networks.
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
    );
  };

  // ----- Filter restaurants by proximity or locationText -----
  const visibleRestaurants = useMemo(() => {
    if (userCoords) {
      return restaurants.filter(r => {
        const rLat = r.location?.coordinates ? r.location.coordinates[1] : r.location?.lat;
        const rLng = r.location?.coordinates ? r.location.coordinates[0] : r.location?.lng;
        const d = getDistanceKm(userCoords.lat, userCoords.lng, rLat, rLng);
        return d !== null && d <= DELIVERY_RADIUS_KM;
      });
    }
    if (locationText.trim() && locationText !== '📍 Current Location') {
      const tokens = locationText.toLowerCase().replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
      return restaurants.filter(r => {
        const c = r.city?.toLowerCase() || '';
        const a = r.address?.toLowerCase() || '';
        return tokens.some(t => c.includes(t) || a.includes(t));
      });
    }
    return restaurants;
  }, [restaurants, userCoords, locationText]);

  // ----- Filter stores by proximity or locationText -----
  const visibleStores = useMemo(() => {
    if (userCoords) {
      return stores.filter(s => {
        const sLat = s.location?.coordinates ? s.location.coordinates[1] : s.location?.lat;
        const sLng = s.location?.coordinates ? s.location.coordinates[0] : s.location?.lng;
        const d = getDistanceKm(userCoords.lat, userCoords.lng, sLat, sLng);
        return d !== null && d <= DELIVERY_RADIUS_KM;
      });
    }
    if (locationText.trim() && locationText !== '📍 Current Location') {
      const tokens = locationText.toLowerCase().replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
      return stores.filter(s => {
        const c = s.city?.toLowerCase() || '';
        const a = s.address?.toLowerCase() || '';
        return tokens.some(t => c.includes(t) || a.includes(t));
      });
    }
    return stores;
  }, [stores, userCoords, locationText]);

  // Determine if we're "out of range" only when the user explicitly used GPS
  const isOutOfRange = userCoords && (restaurants.length > 0 || stores.length > 0) && visibleRestaurants.length === 0 && visibleStores.length === 0;

  const mixedVendors = useMemo(() => {
    const allVendors = [
      ...visibleRestaurants.map(r => ({ ...r, isStore: false })),
      ...visibleStores.map(s => ({ ...s, isStore: true })),
    ];
    const searchLower = search.toLowerCase();
    return allVendors
      .filter(v => {
        if (search && !v.name.toLowerCase().includes(searchLower)) return false;
        if (!activeCategory) return true;
        return v.isStore ? v.storeType === activeCategory : v.cuisine?.includes(activeCategory);
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [visibleRestaurants, visibleStores, search, activeCategory]);

  const visibleFoods = useMemo(() => {
    return foods;
  }, [foods]);

  const visibleProducts = useMemo(() => {
    return products;
  }, [products]);

  const searchParams = new URLSearchParams(window.location.search);
  const vegOnly = searchParams.get('veg') === 'true';

  const mixedItems = useMemo(() => {
    const allItems = [
      ...visibleFoods.map(f => ({ ...f, isProduct: false })),
      ...visibleProducts.map(p => ({ ...p, isProduct: true })),
    ];
    const searchLower = search.toLowerCase();
    return allItems
      .filter(item => {
        if (vegOnly && item.isVeg === false) return false;
        
        if (search) {
          if (
            !item.name.toLowerCase().includes(searchLower) &&
            !item.category?.toLowerCase().includes(searchLower) &&
            !item.restaurantId?.name?.toLowerCase().includes(searchLower) &&
            !item.storeId?.name?.toLowerCase().includes(searchLower)
          ) return false;
        }
        if (!activeCategory) return true;
        return item.isProduct
          ? item.storeId?.storeType === activeCategory || item.category === activeCategory
          : item.category === activeCategory || item.restaurantId?.cuisine?.includes(activeCategory);
      })
      // Use a stable shuffle seeded once, not on every render
      .sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) {
          return a.isFeatured ? -1 : 1;
        }
        return a._id > b._id ? 1 : -1;
      });
  }, [foods, products, search, activeCategory, vegOnly]);

  const handleAddToCart = (food) => {
    if (!user) { navigate('/login'); return; }
    if (food.variants && food.variants.length > 0) {
      navigate(`/food/${food._id}`);
      return;
    }
    const finalPrice = food.discountedPrice || food.price;
    addToCart({ foodId: food._id, name: food.name, price: finalPrice, image: food.image }, food.restaurantId?._id || food.restaurantId, food.restaurantId?.name || 'Restaurant');
  };

  const handleBuy = (food) => {
    if (!user) { navigate('/login'); return; }
    handleAddToCart(food);
    navigate('/cart');
  };

  const handleAddProduct = (product) => {
    if (!user) { navigate('/login'); return; }
    if (product.variants && product.variants.length > 0) {
      navigate(`/product/${product._id}`);
      return;
    }
    addProductToCart({
      productId: product._id,
      foodId: product._id, // alias
      name: product.name,
      price: product.discountedPrice || product.price,
      image: product.image,
      unit: product.unit,
    }, product.storeId?._id, product.storeId?.name);
  };

  const getProductQty = (productId, storeId) => {
    if (cartType !== 'product' || cartStoreId !== storeId) return 0;
    return cartItems.find(i => i.productId === productId)?.quantity || 0;
  };

  const searchSuggestions = useMemo(() => search.trim() ? [
    ...visibleFoods.filter(f => f.name.toLowerCase().includes(search.toLowerCase())).map(f => ({ ...f, itemType: 'food' })),
    ...visibleProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => ({ ...p, itemType: 'product' })),
    ...visibleRestaurants.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(r => ({ ...r, itemType: 'restaurant' })),
    ...visibleStores.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => ({ ...s, itemType: 'store' }))
  ].slice(0, 6) : [], [search, visibleFoods, visibleProducts, visibleRestaurants, visibleStores]);


  const handleSearch = (e) => {
    e.preventDefault();
    const q = [];
    if (search.trim()) q.push(`search=${encodeURIComponent(search)}`);
    if (locationText.trim() && locationText !== ' Current Location') {
      q.push(`city=${encodeURIComponent(locationText)}`);
    }
    if (!search.trim()) {
      // User just entered a location and pressed Enter, do not redirect!
      // The homepage live-filters vendors based on locationText already.
      return;
    }

    let destination = 'restaurants';
    if (search.trim()) {
      const query = search.toLowerCase();
      const exactProduct = visibleProducts.find(p => p.name.toLowerCase() === query);
      const exactStore = visibleStores.find(s => s.name.toLowerCase() === query);
      const exactFood = visibleFoods.find(f => f.name.toLowerCase() === query);
      const exactRest = visibleRestaurants.find(r => r.name.toLowerCase() === query);

      if (exactProduct || exactStore) destination = 'stores';
      // If exact food/rest, override back to restaurants (priority if both match)
      if (exactFood || exactRest) destination = 'restaurants';
      
      if (!exactProduct && !exactStore && !exactFood && !exactRest) {
        const hasProduct = visibleProducts.some(p => p.name.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query));
        const hasStore = visibleStores.some(s => s.name.toLowerCase().includes(query));
        const hasFood = visibleFoods.some(f => f.name.toLowerCase().includes(query) || f.category?.toLowerCase().includes(query));
        const hasRest = visibleRestaurants.some(r => r.name.toLowerCase().includes(query));

        if ((hasProduct || hasStore) && !hasFood && !hasRest) {
          destination = 'stores';
        }
      }
    }
    
    navigate(q.length ? `/${destination}?${q.join('&')}` : `/${destination}`);
  };

  const clearLocation = () => {
    localStorage.removeItem('jdkart_coords');
    localStorage.removeItem('jdkart_loc_name');
    setUserCoords(null);
    setLocationText('');
    window.dispatchEvent(new Event('locationUpdated'));
    toast.success('Location cleared');
  };

  return (
    <div>
      {/* ── HERO SECTION ── */}
      <section style={{
        background: 'linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-card) 50%, var(--bg-dark) 100%)',
        padding: 'clamp(48px,8vw,80px) 0 clamp(36px,6vw,60px)',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,87,34,0.15) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-50px', left: '5%',  width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,193,7,0.1) 0%, transparent 70%)' }} />
        </div>

        <div className="container" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 680, width: '100%', minWidth: 0, animation: 'fadeIn 0.8s ease', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {HERO_FOOD_EMOJIS.map((e, i) => (
                <span key={i} style={{ fontSize: 'clamp(22px,4vw,30px)', animation: `bounce ${1 + i * 0.15}s ease infinite`, animationDelay: `${i * 0.1}s` }}>{e}</span>
              ))}
            </div>
                        {promoBanner.active && promoBanner.text && (
              <Link to="/offers" style={{ display: 'inline-block', padding: '6px 16px', background: 'linear-gradient(90deg, rgba(255,87,34,0.1), rgba(255,193,7,0.1))', border: '1px solid rgba(255,87,34,0.3)', borderRadius: '100px', color: 'var(--primary)', fontWeight: 700, fontSize: 'clamp(12px, 3vw, 14px)', marginBottom: 20, animation: 'pulse 2s infinite', boxShadow: '0 0 20px rgba(255,87,34,0.2)', textDecoration: 'none' }}>
                {promoBanner.text}
              </Link>
            )}
            <h1 style={{ fontSize: 'clamp(32px,6vw,64px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, fontFamily: 'Poppins, sans-serif', wordBreak: 'break-word' }}>
              Order Food And Grocery,<br />
              <span style={{ color: 'var(--primary)', textShadow: '0 0 40px rgba(255,87,34,0.4)' }}>Fast &amp; Fresh</span>
            </h1>
            <p style={{ fontSize: 'clamp(14px,2vw,18px)', color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.7 }}>
              Discover the best restaurants near you. Delivered hot and fresh in 30 minutes.
            </p>

            {/* ── Search bar ── */}
            <form onSubmit={handleSearch} className="search-form" ref={searchContainerRef}>
              
              {/* Location input */}
              <div className="search-location">
                <button
                  type="button"
                  onClick={triggerLocationPrompt}
                  disabled={locLoading}
                  title="Auto-detect location"
                  style={{ background: 'transparent', border: 'none', cursor: locLoading ? 'not-allowed' : 'pointer', fontSize: 18, color: 'var(--primary)', padding: 0, marginRight: 8, display: 'flex', alignItems: 'center' }}
                >
                  {locLoading ? '⏳' : '📍'}
                </button>
                <input
                  ref={locationInputRef}
                  type="text"
                  className="search-input-field"
                  placeholder="Enter city or detect"
                  value={locationText}
                  onChange={e => {
                    setLocationText(e.target.value);
                    if (userCoords) { 
                      setUserCoords(null); 
                      localStorage.removeItem('jdkart_coords'); 
                      localStorage.removeItem('jdkart_loc_name'); 
                    }
                  }}
                  style={{ color: 'var(--text-primary)', padding: '12px 0', fontSize: 14 }}
                />
                {(locationText || userCoords) && (
                  <button type="button" onClick={clearLocation} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px', marginLeft: 4 }}>✕</button>
                )}
              </div>

              {/* Food search input */}
              <div className="search-input-wrap">
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search restaurants, cuisines, groceries…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  style={{ color: 'var(--text-primary)', padding: '12px 0', fontSize: 14 }}
                />
                
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginTop: 8, zIndex: 9999, boxShadow: '0 12px 36px rgba(0,0,0,0.4)', maxHeight: 380, overflowY: 'auto' }}>
                    {searchSuggestions.map((s, i) => (
                      <div key={i} onMouseDown={() => {
                        setSearch(s.name);
                        setShowSuggestions(false);
                        if (s.itemType === 'restaurant') navigate(`/restaurants/${s._id}`);
                        else if (s.itemType === 'store') navigate(`/stores/${s._id}`);
                        else if (s.itemType === 'food') navigate(`/food/${s._id}`);
                        else if (s.itemType === 'product') navigate(`/product/${s._id}`);
                      }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: i < searchSuggestions.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-border)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ fontSize: 18 }}>
                          {s.itemType === 'food' ? '🍽️' : s.itemType === 'product' ? '📦' : s.itemType === 'restaurant' ? '🏪' : '🛒'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
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

            {/* GPS out-of-range banner */}
            {isOutOfRange && (
              <div style={{
                marginTop: 20, padding: '14px 18px', borderRadius: 12,
                background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.3)',
                color: '#F44336', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
              }}>
                <span>
                  <strong>"We can't reach you — sorry! Very soon we expand in your Area!"</strong>
                  <button onClick={clearLocation} style={{ marginLeft: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline', fontSize: 13, fontWeight: 700 }}>
                    Try Again
                  </button>
                </span>
              </div>
            )}

            {/* GPS in-range info pill */}
            {userCoords && !isOutOfRange && visibleRestaurants.length > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: 16, padding: '6px 14px', borderRadius: 100,
                background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
                fontSize: 13, color: '#4CAF50', fontWeight: 600
              }}>
                ✅ {visibleRestaurants.length} restaurant{visibleRestaurants.length !== 1 ? 's' : ''} delivering near you
              </div>
            )}

            <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
              {[['🚀', '30 min delivery'], ['💯', 'Top rated'], ['🎁', 'Daily offers']].map(([icon, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <>
        {/* CATEGORIES */}
        <section style={{ padding: 'clamp(32px,5vw,48px) 0 24px' }}>
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">What's on your <span>mind?</span></h2>
              <Link to="/restaurants" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>See all →</Link>
            </div>
            <div 
                ref={categoriesRef}
                onMouseDown={onDragStart}
                onMouseLeave={onDragEnd}
                onMouseUp={onDragEnd}
                onMouseMove={onDragMove}
                style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', cursor: 'grab', userSelect: 'none' }}>
              {loading ? Array(8).fill(0).map((_, i) => (
                <div key={i} style={{ minWidth: 90, height: 88, borderRadius: 16, background: 'var(--bg-card)' }} className="shimmer" />
              )) : [...STORE_TYPES, ...categories].map(cat => {
                const catId = cat.type === 'store' ? cat._id : cat.name;
                const isActive = activeCategory === catId;
                return (
                <button key={cat._id} onClick={() => setActiveCategory(isActive ? null : catId)}
                  style={{ minWidth: 90, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', padding: 0, transition: 'var(--transition)', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ background: isActive ? (cat.color ? `${cat.color}22` : 'rgba(255,87,34,0.15)') : 'var(--bg-card)', borderRadius: 16, padding: '14px 10px', marginBottom: 6, border: `1px solid ${isActive ? (cat.color || 'var(--primary)') : 'var(--border)'}`, transition: 'var(--transition)' }}
                    onMouseEnter={e => { if(!isActive) e.currentTarget.style.borderColor = cat.color ? `${cat.color}88` : 'rgba(255,87,34,0.35)'}}
                    onMouseLeave={e => { if(!isActive) e.currentTarget.style.borderColor = 'var(--border)'}}>
                    <div style={{ fontSize: 30, marginBottom: 4 }}>{cat.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? (cat.color || 'var(--primary)') : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{cat.name}</div>
                  </div>
                </button>
              )})}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* ALL VENDORS (Restaurants & Stores) */}
          {(mixedVendors.length > 0 || mixedItems.length === 0 || true) && (
            <section style={{ padding: '8px 0 32px', order: search ? 2 : 1 }}>
              <div className="container">
                <div className="section-header">
                  <h2 className="section-title">
                    {userCoords || (locationText && locationText !== ' Current Location') ? 'Near' : 'Top'} <span>Restaurants & Stores</span>
                    {userCoords && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>(within {DELIVERY_RADIUS_KM} km)</span>}
                    {!userCoords && locationText && locationText !== ' Current Location' && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>(near {locationText})</span>}
                  </h2>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Link to="/restaurants" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>All Restaurants →</Link>
                    <Link to="/stores" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>All Stores →</Link>
                  </div>
                </div>
                {mixedVendors.length > 0 ? (
                  <div className="vendor-grid horizontal-scroll-mobile">
                    {loading ? Array(6).fill(0).map((_, i) => (
                      <div key={i} style={{ height: 270, borderRadius: 16 }} className="shimmer" />
                    )) : mixedVendors.map(v => (
                      v.isStore ? <StoreCard key={v._id} store={v} /> : <RestaurantCard key={v._id} restaurant={v} userCoords={userCoords} />
                    ))}
                  </div>
                ) : !loading && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    
                    {(userCoords || (locationText && locationText !== '📍 Current Location')) ? (
                      <>
                        <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>"Our service hasn't reached your area yet! We're expanding soon."</h2>
                        <button className="btn btn-primary" style={{ marginTop: 16, padding: '10px 24px' }} onClick={clearLocation}>
                          Try Again
                        </button>
                      </>
                    ) : (
                      <p>We couldn't find any matches in this area.</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

            {/* ALL ITEMS (Dishes & Products) */}
            {mixedItems.length > 0 && (
              <section style={{ padding: '8px 0 64px', order: search ? 1 : 2 }}>
                <div className="container">
                  <div className="section-header">
                    <h2 className="section-title">Popular <span>Items</span></h2>
                  </div>
                  <div className="items-grid">
                    {loading ? Array(6).fill(0).map((_, i) => (
                      <div key={i} style={{ height: 160, borderRadius: 16 }} className="shimmer" />
                    )) : mixedItems.map(item => (
                      item.isProduct 
                        ? <HomeProductCard 
                            key={item._id} 
                            product={item} 
                            qty={getProductQty(item._id, item.storeId?._id)} 
                            onAdd={() => handleAddProduct(item)} 
                            onUpdate={(qty) => updateQuantity(item._id, qty)} 
                            onBuy={() => { if (!user) { navigate('/login'); return; } handleAddProduct(item); navigate('/cart'); }}
                          />
                        : <HomeFoodCard 
                            key={item._id} 
                            food={item} 
                            onAddToCart={() => handleAddToCart(item)} 
                            onBuy={() => handleBuy(item)} 
                          />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </>

      {/* WHY JDKART */}
      <section style={{ padding: 'clamp(32px,5vw,48px) 0', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 36 }}>Why choose <span>JDkart?</span></h2>
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', snapType: 'x mandatory' }}>
            {[
              { icon: '🚀', title: 'Lightning Fast',  desc: 'Average delivery in 30 mins' },
              { icon: '💯', title: 'Top Quality',      desc: 'Verified restaurants only' },
              { icon: '🔐', title: 'Secure OTP',       desc: 'OTP verified delivery' },
              { icon: '💳', title: 'Easy Payment',     desc: 'Razorpay, Cards, UPI' },
            ].map(f => (
              <div key={f.title} style={{ flex: '1 0 160px', textAlign: 'center', padding: '20px 16px', background: 'var(--bg-dark)', borderRadius: 16, border: '1px solid var(--border)', scrollSnapAlign: 'start' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Permission Modal */}
      {showLocationPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)', width: '100%', maxWidth: 360, borderRadius: 20,
            padding: '32px 24px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📍</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
              Enter the Delivery Location
            </h3>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Where should we deliver your order? Allow location access to see restaurants near you!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={handleDetectLocation} disabled={locLoading} className="btn btn-primary btn-full btn-lg">
                {locLoading ? 'Wait...' : ' Use My Live Location'}
              </button>
              <button onClick={() => setShowLocationPrompt(false)} className="btn btn-secondary btn-full btn-lg" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Restaurant Card ──
function RestaurantCard({ restaurant, userCoords }) {
  const rLat = restaurant.location?.coordinates ? restaurant.location.coordinates[1] : restaurant.location?.lat;
  const rLng = restaurant.location?.coordinates ? restaurant.location.coordinates[0] : restaurant.location?.lng;
  const d = getDistanceKm(userCoords?.lat, userCoords?.lng, rLat, rLng);
  return (
    <Link to={`/restaurants/${restaurant._id}`} className="card" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', height: 160, background: 'var(--bg-card2)', overflow: 'hidden' }}>
        {restaurant.image ? (
          <img loading="lazy" src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'var(--transition)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card2))' }}>🍽️</div>
        )}
        {!restaurant.isOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Currently Closed
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: '3px 9px', borderRadius: 100 }}>
          <span style={{ color: '#FFD700', fontSize: 12 }}>⭐ {restaurant.rating?.toFixed(1)}</span>
        </div>
        {d != null && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '3px 9px', borderRadius: 100, fontSize: 11, color: '#fff' }}>
            📍 {d.toFixed(1)} km
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{restaurant.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{restaurant.cuisine?.join(' • ')}</div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>⏱ {restaurant.deliveryTime}</span>
          <span>₹{restaurant.deliveryFee} delivery</span>
        </div>
      </div>
    </Link>
  );
}

// ── Home Food Card ──
function HomeFoodCard({ food, onAddToCart, onBuy }) {
  const hasVariants = food.variants && food.variants.length > 0;
  
  let pPrice = food.price;
  let dPrice = food.discountedPrice;
  let prefix = '';

  if ((!pPrice || pPrice === 0) && hasVariants) {
    const prices = food.variants.map(v => v.discountedPrice || v.price).filter(p => p > 0);
    if (prices.length > 0) {
      pPrice = Math.min(...prices);
      dPrice = null;
      prefix = 'Starts at ';
    }
  }

  const discount = dPrice && dPrice < pPrice
    ? Math.round((1 - dPrice / pPrice) * 100)
    : 0;

  return (
    <div className="card item-card" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      <Link to={`/food/${food._id}`} className="item-link" style={{ display: 'flex', gap: 14, marginBottom: 14, textDecoration: 'none', color: 'inherit' }}>
        <div className="item-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, border: `2px solid ${food.isVeg ? 'var(--success)' : 'var(--danger)'}`, width: 15, height: 15, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: food.isVeg ? 'var(--success)' : 'var(--danger)', display: 'block' }} />
            </span>
            {food.isBestseller && <span style={{ fontSize: 10, color: '#FF8F00', fontWeight: 700 }}>★ Bestseller</span>}
            {food.orderCount > 0 && <span style={{ fontSize: 10, color: '#E53935', fontWeight: 700, marginLeft: 8 }}>🔥 Ordered {food.orderCount}+ times</span>}
            {food.freeDelivery && (
              <span style={{ background: 'linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%)', color: '#059669', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}> Free Delivery</span>
            )}
            {food.offer ? (
              <span style={{ background: 'linear-gradient(90deg, #F0F9FF 0%, #E0F2FE 100%)', color: '#0369A1', border: '1px dashed #7DD3FC', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🏷️ {food.offer}</span>
            ) : discount > 0 ? (
              <span style={{ fontSize: 10, color: '#388E3C', fontWeight: 700 }}>{discount}% off</span>
            ) : null}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{food.name}</div>
          {food.restaurantId && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {food.restaurantId.name}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {dPrice ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{prefix}₹{dPrice}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{pPrice}</span>
              </>
            ) : <span style={{ fontWeight: 800, fontSize: 15 }}>{prefix}₹{pPrice}</span>}
          </div>
          {hasVariants && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Options: {food.variants.map(v => v.name).join(', ')}
            </div>
          )}
        </div>
        <div className="item-img" style={{ width: 90, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {food.image ? (
            <img loading="lazy" src={food.image} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍽️</div>
          )}
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {hasVariants ? (
          <Link to={`/food/${food._id}`} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            + Cart
          </Link>
        ) : (
          <button onClick={onAddToCart} disabled={!food.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5 }}>
            + Cart
          </button>
        )}
        {hasVariants ? (
          <Link to={`/food/${food._id}`} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Order
          </Link>
        ) : (
          <button onClick={onBuy} disabled={!food.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5 }}>
            Order
          </button>
        )}
      </div>
    </div>
  );
}

// ── Home Product Card ──
function HomeProductCard({ product, qty, onAdd, onUpdate, onBuy }) {
  const hasVariants = product.variants && product.variants.length > 0;

  let pPrice = product.price;
  let dPrice = product.discountedPrice;
  let prefix = '';

  if ((!pPrice || pPrice === 0) && hasVariants) {
    const prices = product.variants.map(v => v.discountedPrice || v.price).filter(p => p > 0);
    if (prices.length > 0) {
      pPrice = Math.min(...prices);
      dPrice = null;
      prefix = 'Starts at ';
    }
  }

  const discount = dPrice && dPrice < pPrice
    ? Math.round((1 - dPrice / pPrice) * 100)
    : 0;

  return (
    <div className="card item-card" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      <Link to={`/product/${product._id}`} className="item-link" style={{ display: 'flex', gap: 14, marginBottom: 14, textDecoration: 'none', color: 'inherit' }}>
        <div className="item-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, background: 'rgba(33,150,243,0.1)', color: '#2196F3', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
              Store Product
            </span>
            {product.freeDelivery && (
              <span style={{ background: 'linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%)', color: '#059669', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}> Free Delivery</span>
            )}
            {product.offer ? (
              <span style={{ background: 'linear-gradient(90deg, #F0F9FF 0%, #E0F2FE 100%)', color: '#0369A1', border: '1px dashed #7DD3FC', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🏷️ {product.offer}</span>
            ) : discount > 0 ? (
              <span style={{ fontSize: 10, color: '#388E3C', fontWeight: 700 }}>{discount}% off</span>
            ) : null}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{product.name}</div>
          {product.storeId && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {product.storeId.name}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {dPrice ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{prefix}₹{dPrice}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{pPrice}</span>
              </>
            ) : <span style={{ fontWeight: 800, fontSize: 15 }}>{prefix}₹{pPrice}</span>}
          </div>
          {hasVariants && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Sizes: {product.variants.map(v => v.weight).join(', ')}
            </div>
          )}
        </div>
        <div style={{ width: 90, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {product.image ? (
            <img loading="lazy" src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>
          )}
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {qty > 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, padding: '4px 8px', height: 36 }}>
            <button onClick={() => onUpdate(qty - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => onUpdate(qty + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>+</button>
          </div>
        ) : hasVariants ? (
          <Link to={`/product/${product._id}`} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            + Cart
          </Link>
        ) : (
          <button
            onClick={onAdd}
            disabled={!product.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: product.isAvailable ? 'rgba(255,87,34,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${product.isAvailable ? 'rgba(255,87,34,0.3)' : 'var(--border)'}`, borderRadius: 8, color: product.isAvailable ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', height: 36 }}
          >
            {product.isAvailable ? '+ Cart' : 'Unavailable'}
          </button>
        )}
        {hasVariants ? (
          <Link to={`/product/${product._id}`} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Buy
          </Link>
        ) : (
          <button onClick={onBuy} disabled={!product.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', opacity: product.isAvailable ? 1 : 0.5, height: 36 }}>
            Buy
          </button>
        )}
      </div>
    </div>
  );
}

// ── Store Card ──
function StoreCard({ store }) {
  const typeInfo = STORE_TYPES.find(t => t._id === store.storeType) || STORE_TYPES[0];

  return (
    <Link to={`/stores/${store._id}`} className="card" style={{ textDecoration: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 160, background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card2))', overflow: 'hidden' }}>
        {store.image ? (
          <img loading="lazy" src={store.image} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            {typeInfo?.icon || '🏬'}
          </div>
        )}
        {!store.isOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Currently Closed
          </div>
        )}
        {typeInfo && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: `${typeInfo.color}dd`, color: '#fff', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
            {typeInfo.icon} {typeInfo.name}
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
          <span style={{ color: '#FFD700', fontSize: 12 }}>⭐ {store.rating?.toFixed(1)}</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{store.name}</div>
        {store.description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {store.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>⏱ {store.deliveryTime}</span>
          <span>₹{store.deliveryFee} delivery</span>
        </div>
      </div>
    </Link>
  );
}