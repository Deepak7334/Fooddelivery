import { useState, useEffect, useRef } from 'react';
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

const DELIVERY_RADIUS_KM = 10; // deliver within 10 km

const STORE_TYPES = [
  { _id: 'grocery', name: 'Grocery', icon: '🛒', color: '#4CAF50', type: 'store' },
  { _id: 'pharmacy', name: 'Pharmacy', icon: '💊', color: '#2196F3', type: 'store' },
  { _id: 'electronics', name: 'Electronics', icon: '📱', color: '#9C27B0', type: 'store' },
  { _id: 'beauty', name: 'Beauty', icon: '🧴', color: '#E91E63', type: 'store' },
  { _id: 'bakery', name: 'Bakery', icon: '🥐', color: '#FF5722', type: 'store' },
 
];

export default function HomePage() {
  const [categories, setCategories]   = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [stores, setStores]           = useState([]);
  const [foods, setFoods]             = useState([]);
  const [products, setProducts]       = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [locationText, setLocationText] = useState('');
  // GPS coords stored separately from display text
  const [userCoords, setUserCoords]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('jdmart_coords') || 'null'); } catch { return null; }
  });
  const [locLoading, setLocLoading]   = useState(false);
  const [outOfRange, setOutOfRange]   = useState(false); // shown after GPS check
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, addProductToCart, cartItems, cartType, storeId: cartStoreId, updateQuantity } = useCart();
  const locationInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/customer/categories').catch(() => ({ data: { categories: [] } })),
      api.get('/customer/restaurants').catch(() => ({ data: { restaurants: [] } })),
      api.get('/customer/foods').catch(() => ({ data: { foods: [] } })),
      api.get('/store/products').catch(() => ({ data: { products: [] } })),
      api.get('/store/stores').catch(() => ({ data: { stores: [] } }))
    ]).then(([catRes, restRes, foodRes, prodRes, storeRes]) => {
      setCategories(catRes.data.categories || []);
      setRestaurants(restRes.data.restaurants || []);
      setFoods(foodRes.data.foods || []);
      setProducts(prodRes.data.products || []);
      setStores(storeRes.data.stores || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // ----- GPS Detection -----
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocLoading(true);
    toast.loading('Detecting your location…', { id: 'loc' });
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        localStorage.setItem('jdmart_coords', JSON.stringify(coords));
        setLocationText('📍 Current Location');
        toast.success('Location detected!', { id: 'loc' });
        setLocLoading(false);
        setOutOfRange(false);
      },
      err => {
        toast.error('Could not get location. Please allow access or type manually.', { id: 'loc' });
        setLocLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // ----- Filter restaurants by proximity (only when GPS coords available) -----
  const visibleRestaurants = (() => {
    if (!userCoords) return restaurants; // no GPS → show all
    const near = restaurants.filter(r => {
      const d = getDistanceKm(userCoords.lat, userCoords.lng, r.location?.lat, r.location?.lng);
      return d === null || d <= DELIVERY_RADIUS_KM; // if restaurant has no coords, still show it
    });
    return near;
  })();

  // Determine if we're "out of range" only when the user explicitly used GPS
  const isOutOfRange = userCoords && restaurants.length > 0 && visibleRestaurants.length === 0;

  const visibleStores = stores.map(s => ({ ...s, isStore: true }));

  const mixedVendors = [
    ...visibleRestaurants.map(r => ({ ...r, isStore: false })),
    ...visibleStores
  ]
    .filter(v => {
      if (!activeCategory) return true;
      if (v.isStore) return v.storeType === activeCategory;
      else return v.cuisine?.includes(activeCategory);
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const mixedItems = [
    ...foods.map(f => ({ ...f, isProduct: false })),
    ...products.map(p => ({ ...p, isProduct: true }))
  ]
    .filter(item => {
      if (!activeCategory) return true;
      if (item.isProduct) return item.storeId?.storeType === activeCategory || item.category === activeCategory;
      else return item.category === activeCategory || item.restaurantId?.cuisine?.includes(activeCategory);
    })
    .sort(() => Math.random() - 0.5); // Simple shuffle for a "mixed" feel

  const handleAddToCart = (food) => {
    if (!user) { navigate('/login'); return; }
    addToCart({ foodId: food._id, name: food.name, price: food.price, image: food.image }, food.restaurantId?._id || food.restaurantId, food.restaurantId?.name || 'Restaurant');
  };

  const handleBuy = (food) => {
    handleAddToCart(food);
    navigate('/cart');
  };

  const handleAddProduct = (product) => {
    if (!user) { navigate('/login'); return; }
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

  const handleSearch = (e) => {
    e.preventDefault();
    const q = [];
    if (search.trim()) q.push(`search=${encodeURIComponent(search)}`);
    // If location is a plain city name (not GPS), pass it; GPS is handled client-side
    if (locationText.trim() && locationText !== '📍 Current Location') {
      q.push(`city=${encodeURIComponent(locationText)}`);
    }
    navigate(q.length ? `/restaurants?${q.join('&')}` : '/restaurants');
  };

  const clearLocation = () => {
    setUserCoords(null);
    setLocationText('');
    localStorage.removeItem('jdmart_coords');
    setOutOfRange(false);
  };

  return (
    <div>
      {/* ── HERO SECTION ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a0a 50%, #0f0f1a 100%)',
        padding: 'clamp(48px,8vw,80px) 0 clamp(36px,6vw,60px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,87,34,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '5%',  width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,193,7,0.1) 0%, transparent 70%)',  pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{ maxWidth: 680, animation: 'fadeIn 0.8s ease' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {HERO_FOOD_EMOJIS.map((e, i) => (
                <span key={i} style={{ fontSize: 'clamp(22px,4vw,30px)', animation: `bounce ${1 + i * 0.15}s ease infinite`, animationDelay: `${i * 0.1}s` }}>{e}</span>
              ))}
            </div>
            <h1 style={{ fontSize: 'clamp(32px,6vw,64px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, fontFamily: 'Poppins, sans-serif' }}>
              Order Food,<br />
              <span style={{ color: 'var(--primary)', textShadow: '0 0 40px rgba(255,87,34,0.4)' }}>Fast &amp; Fresh</span>
            </h1>
            <p style={{ fontSize: 'clamp(14px,2vw,18px)', color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.7 }}>
              Discover the best restaurants near you. Delivered hot and fresh in 30 minutes.
            </p>

            {/* ── Search bar ── */}
            <form onSubmit={handleSearch} className="search-form">
              {/* Location input */}
              <div className="search-location" style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: '1 1 160px' }}>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locLoading}
                  title="Auto-detect location"
                  style={{ background: 'transparent', border: 'none', cursor: locLoading ? 'not-allowed' : 'pointer', fontSize: 18, color: 'var(--primary)', padding: '0 8px 0 0', flexShrink: 0 }}
                >
                  {locLoading ? '⏳' : '📍'}
                </button>
                <input
                  ref={locationInputRef}
                  type="text"
                  className="search-input-field"
                  placeholder="Enter city or 📍 detect"
                  value={locationText}
                  onChange={e => {
                    setLocationText(e.target.value);
                    // If user edits manually, clear GPS coords so we don't filter by radius
                    if (userCoords) { setUserCoords(null); localStorage.removeItem('jdmart_coords'); }
                  }}
                />
                {(locationText || userCoords) && (
                  <button type="button" onClick={clearLocation} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px', flexShrink: 0 }} title="Clear location">✕</button>
                )}
              </div>

              {/* Food search input */}
              <div className="search-input-wrap" style={{ flex: '2 1 200px' }}>
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search restaurants, cuisines, groceries…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary search-submit-btn">
                🔍 <span className="search-submit-text">Search</span>
              </button>
            </form>

            {/* GPS out-of-range banner */}
            {isOutOfRange && (
              <div style={{
                marginTop: 20, padding: '14px 18px', borderRadius: 12,
                background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.3)',
                color: '#F44336', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: 22 }}>😔</span>
                <span>
                  <strong>Sorry, we can't reach you!</strong> There are no restaurants within {DELIVERY_RADIUS_KM} km of your location.
                  <button onClick={clearLocation} style={{ marginLeft: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline', fontSize: 13 }}>
                    Browse all anyway
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
      {(!loading && isOutOfRange) ? (
        // Full out-of-range page (when GPS used and truly nothing nearby)
        <section style={{ padding: '80px 20px', textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>😔</div>
          <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, marginBottom: 16 }}>We can't reach you — sorry!</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480 }}>
            There are no restaurants within <strong>{DELIVERY_RADIUS_KM} km</strong> of your current location. We're expanding fast — check back soon!
          </p>
          <button className="btn btn-primary" style={{ marginTop: 32, padding: '12px 28px' }} onClick={clearLocation}>
            Browse All Restaurants
          </button>
        </section>
      ) : (
        <>
          {/* CATEGORIES */}
          <section style={{ padding: 'clamp(32px,5vw,48px) 0 24px' }}>
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">What's on your <span>mind?</span></h2>
                <Link to="/restaurants" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>See all →</Link>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
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

          {/* ALL VENDORS (Restaurants & Stores) */}
          <section style={{ padding: '8px 0 32px' }}>
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">
                  {userCoords ? 'Near' : 'Top'} <span>Restaurants & Stores</span>
                  {userCoords && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>(within {DELIVERY_RADIUS_KM} km)</span>}
                </h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Link to="/restaurants" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>All Restaurants →</Link>
                  <Link to="/stores" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>All Stores →</Link>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {loading ? Array(6).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 270, borderRadius: 16 }} className="shimmer" />
                )) : mixedVendors.map(v => (
                  v.isStore ? <StoreCard key={v._id} store={v} /> : <RestaurantCard key={v._id} restaurant={v} userCoords={userCoords} />
                ))}
              </div>
              {!loading && mixedVendors.length === 0 && !isOutOfRange && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
                  <p>No vendors found for this category.</p>
                </div>
              )}
            </div>
          </section>

          {/* ALL ITEMS (Dishes & Products) */}
          {mixedItems.length > 0 && (
            <section style={{ padding: '8px 0 64px' }}>
              <div className="container">
                <div className="section-header">
                  <h2 className="section-title">Popular <span>Items</span></h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
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
                          onBuy={() => { handleAddProduct(item); navigate('/cart'); }}
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
        </>
      )}

      {/* WHY JDMART */}
      <section style={{ padding: 'clamp(32px,5vw,48px) 0', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 36 }}>Why choose <span>JDmart?</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { icon: '🚀', title: 'Lightning Fast',  desc: 'Average delivery in 30 mins' },
              { icon: '💯', title: 'Top Quality',      desc: 'Verified restaurants only' },
              { icon: '🔐', title: 'Secure OTP',       desc: 'OTP verified delivery' },
              { icon: '💳', title: 'Easy Payment',     desc: 'Razorpay, Cards, UPI' },
            ].map(f => (
              <div key={f.title} style={{ textAlign: 'center', padding: '20px 16px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Restaurant Card ──
function RestaurantCard({ restaurant, userCoords }) {
  const d = getDistanceKm(userCoords?.lat, userCoords?.lng, restaurant.location?.lat, restaurant.location?.lng);
  return (
    <Link to={`/restaurants/${restaurant._id}`} className="card" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', height: 160, background: 'var(--bg-card2)', overflow: 'hidden' }}>
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'var(--transition)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>🍽️</div>
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
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, border: `2px solid ${food.isVeg ? 'var(--success)' : 'var(--danger)'}`, width: 15, height: 15, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: food.isVeg ? 'var(--success)' : 'var(--danger)', display: 'block' }} />
            </span>
            {food.isBestseller && <span style={{ fontSize: 10, color: '#FF8F00', fontWeight: 700 }}>★ Bestseller</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{food.name}</div>
          {food.restaurantId && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {food.restaurantId.name}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {food.discountedPrice ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 15 }}>₹{food.discountedPrice}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{food.price}</span>
              </>
            ) : <span style={{ fontWeight: 800, fontSize: 15 }}>₹{food.price}</span>}
          </div>
        </div>
        <div style={{ width: 90, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {food.image ? (
            <img src={food.image} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍽️</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button onClick={onAddToCart} disabled={!food.isAvailable}
          style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5 }}>
          + Cart
        </button>
        <button onClick={onBuy} disabled={!food.isAvailable}
          style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5 }}>
          Buy Now
        </button>
      </div>
    </div>
  );
}

// ── Home Product Card ──
function HomeProductCard({ product, qty, onAdd, onUpdate, onBuy }) {
  const discount = product.discountedPrice && product.discountedPrice < product.price
    ? Math.round((1 - product.discountedPrice / product.price) * 100)
    : 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, background: 'rgba(33,150,243,0.1)', color: '#2196F3', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
              Store Product
            </span>
            {discount > 0 && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>★ -{discount}% OFF</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{product.name}</div>
          {product.storeId && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {product.storeId.name}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {product.discountedPrice ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 15 }}>₹{product.discountedPrice}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{product.price}</span>
              </>
            ) : <span style={{ fontWeight: 800, fontSize: 15 }}>₹{product.price}</span>}
          </div>
        </div>
        <div style={{ width: 90, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {product.image ? (
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {qty > 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, padding: '4px 8px', height: 36 }}>
            <button onClick={() => onUpdate(qty - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => onUpdate(qty + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>+</button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            disabled={!product.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: product.isAvailable ? 'rgba(255,87,34,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${product.isAvailable ? 'rgba(255,87,34,0.3)' : 'var(--border)'}`, borderRadius: 8, color: product.isAvailable ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', height: 36 }}
          >
            {product.isAvailable ? '+ Cart' : 'Unavailable'}
          </button>
        )}
        <button onClick={onBuy} disabled={!product.isAvailable}
          style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', opacity: product.isAvailable ? 1 : 0.5, height: 36 }}>
          Buy Now
        </button>
      </div>
    </div>
  );
}

// ── Store Card ──
function StoreCard({ store }) {
  const typeInfo = STORE_TYPES.find(t => t._id === store.storeType) || STORE_TYPES[0];

  return (
    <Link to={`/stores/${store._id}`} className="card" style={{ textDecoration: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 160, background: 'linear-gradient(135deg, #1a1a2e, #16213e)', overflow: 'hidden' }}>
        {store.image ? (
          <img src={store.image} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
