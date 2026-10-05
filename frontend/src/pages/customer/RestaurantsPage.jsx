import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('');
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || '');
  const [vegOnly, setVegOnly] = useState(searchParams.get('veg') === 'true');

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    // eslint-disable-next-line
    if (!restaurants.length && !foods.length) setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (cuisine) params.set('cuisine', cuisine);
    if (vegOnly) params.set('veg', 'true');
    const cityParam = searchParams.get('city');
    if (cityParam) params.set('city', cityParam);
    
    try {
      const coords = JSON.parse(localStorage.getItem('jdkart_coords'));
      if (coords && coords.lat && coords.lng) {
        params.set('lat', coords.lat);
        params.set('lng', coords.lng);
      }
    } catch(e) {}
    
    Promise.all([
      api.get(`/customer/restaurants?${params}`),
      api.get(`/customer/foods?${params}`)
    ])
      .then(([restRes, foodRes]) => {
        const fetchedRests = restRes.data.restaurants || [];
        setRestaurants(fetchedRests);
        
        // Do not filter foods by city/geo. Always show popular foods regardless of location match as requested by user.
        let fetchedFoods = foodRes.data.foods || [];
        if (vegOnly) fetchedFoods = fetchedFoods.filter(f => f.isVeg !== false);
        setFoods(fetchedFoods);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [search, sort, cuisine, vegOnly, searchParams]);

  const handleAddFood = (food) => {
    addToCart(food, food.restaurantId?._id);
    toast.success('Added to cart');
  };

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchSuggestions = search.trim() ? [
    ...foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase())).map(f => ({ ...f, itemType: 'food' })),
    ...restaurants.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(r => ({ ...r, itemType: 'restaurant' }))
  ].slice(0, 6) : [];

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Header - Hidden when searching via URL */}
        {!searchParams.has('search') ? (
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
              {searchParams.get('action') === 'book' ? 'Book a ' : 'All '}<span style={{ color: 'var(--primary)' }}>{searchParams.get('action') === 'book' ? 'Table' : 'Restaurants'}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {searchParams.get('action') === 'book' ? 'Select a restaurant below to reserve your table instantly' : 'Browse the best food in town'}
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              Search Results for <span style={{ color: 'var(--primary)' }}>"{searchParams.get('search')}"</span>
            </h1>
          </div>
        )}

        {/* Filters - Hidden when searching via URL to avoid redundant search boxes */}
        {!searchParams.has('search') && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: 0, flex: '1 1 300px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'visible', position: 'relative' }}>
              <input
                name="search"
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="🔍 Search restaurants or dishes..."
                style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ margin: 6, borderRadius: 8 }}>Search</button>

              {showSuggestions && searchSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  {searchSuggestions.map((s, i) => (
                    <div key={i} onClick={() => {
                      setSearch(s.name);
                      setShowSuggestions(false);
                    }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: i < searchSuggestions.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.2s', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-border)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontSize: 18 }}>
                        {s.itemType === 'food' ? '🍽️' : '🏪'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {s.itemType.charAt(0).toUpperCase() + s.itemType.slice(1)} 
                          {s.restaurantId?.name ? ` from ${s.restaurantId.name}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>

            <select value={sort} onChange={e => setSort(e.target.value)} className="form-input" style={{ width: 'auto', padding: '12px 16px' }}>
              <option value="">Sort by</option>
              <option value="rating">⭐ Rating</option>
              <option value="deliveryTime">Delivery Time</option>
              <option value="deliveryFee">Delivery Fee</option>
            </select>

            {cuisine && (
              <button onClick={() => setCuisine('')} className="btn btn-secondary btn-sm">
                {cuisine} ✕
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Restaurants Section */}
          {(!searchParams.has('search') || restaurants.length > 0) && (
            <div style={{ order: searchParams.has('search') ? 2 : 1, marginBottom: 40 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                {searchParams.has('search') ? 'Matching Restaurants' : searchParams.get('city') ? `Restaurants near ${searchParams.get('city')}` : searchParams.get('lat') ? `Restaurants near you` : 'Top Restaurants'}
              </h2>
              {loading ? (
                <div className="vendor-grid">
                  {Array(3).fill(0).map((_, i) => <div key={i} style={{ height: 280, borderRadius: 16 }} className="shimmer" />)}
                </div>
              ) : restaurants.length === 0 ? (
                searchParams.get('city') || searchParams.get('lat') ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 80, marginBottom: 24 }}>😔</div>
                    <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, marginBottom: 16 }}>
                      "our service not started in your area yet !! soon we expand it in your area"
                    </h2>
                    <button className="btn btn-primary" style={{ marginTop: 24, padding: '12px 28px' }} onClick={() => {
                      if (searchParams.get('lat')) localStorage.removeItem('jdkart_coords');
                      navigate('/restaurants');
                    }}>
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No restaurants found</p>
                  </div>
                )
              ) : (
                <div className="vendor-grid">
                  {restaurants.map(r => <RestaurantCard key={r._id} restaurant={r} />)}
                </div>
              )}
            </div>
          )}

          {/* Dishes Section */}
          {((foods.length > 0 || !searchParams.has('search')) && searchParams.get('action') !== 'book') && (
            <div style={{ order: searchParams.has('search') ? 1 : 2, marginBottom: 40 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                {searchParams.has('search') ? 'Matching Dishes' : 'Popular Dishes'}
              </h2>
              {loading ? (
                <div className="items-grid">
                  {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 160, borderRadius: 16 }} className="shimmer" />)}
                </div>
              ) : foods.length === 0 ? (
                <div className="empty-state">
                  <p>No dishes found</p>
                </div>
              ) : (
                <div className="items-grid">
                  {foods.map(food => (
                    <HomeFoodCard 
                      key={food._id} 
                      food={food} 
                      onAddToCart={() => handleAddFood(food)}
                      onBuy={() => { if (!user) { navigate('/login'); return; } handleAddFood(food); navigate('/cart'); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }) {
  return (
    <Link to={`/restaurants/${restaurant._id}`} className="card" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', height: 170, background: 'var(--bg-card2)' }}>
        {restaurant.image ? (
          <img loading="lazy" src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}></div>
        )}
        {!restaurant.isOpen && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>Closed</div>}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
          ⭐ {restaurant.rating?.toFixed(1)}
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{restaurant.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{restaurant.cuisine?.join(' • ')}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{restaurant.deliveryTime}</span>
          <span>₹{restaurant.deliveryFee}</span>
          <span> Min ₹{restaurant.minOrder}</span>
        </div>
      </div>
    </Link>
  );
}

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

  return (
    <div className="card item-card" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      <Link to={`/food/${food._id}`} className="item-link" style={{ display: 'flex', gap: 14, marginBottom: 14, textDecoration: 'none', color: 'inherit' }}>
        <div className="item-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, border: `2px solid ${food.isVeg ? 'var(--success)' : 'var(--danger)'}`, width: 15, height: 15, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: food.isVeg ? 'var(--success)' : 'var(--danger)', display: 'block' }} />
            </span>
            {food.isBestseller && <span style={{ fontSize: 10, color: '#FF8F00', fontWeight: 700 }}>★ Bestseller</span>}
            {food.orderCount > 0 && <span style={{ fontSize: 10, color: '#E53935', fontWeight: 700, marginLeft: 8 }}>🔥 Ordered {food.orderCount}+ times</span>}
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
          <>
            <Link to={`/food/${food._id}`} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              + Cart
            </Link>
            <Link to={`/food/${food._id}`} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Order
            </Link>
          </>
        ) : (
          <>
            <button onClick={onAddToCart} disabled={!food.isAvailable}
              style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5 }}>
              + Cart
            </button>
            <button onClick={onBuy} disabled={!food.isAvailable}
              style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5 }}>
              Order
            </button>
          </>
        )}
      </div>
    </div>
  );
}
