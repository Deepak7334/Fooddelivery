import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const HERO_FOOD_EMOJIS = ['🍕', '🍔', '🍛', '🌮', '🍜', '🥗'];

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    Promise.all([
      api.get('/customer/categories'),
      api.get('/customer/restaurants'),
      api.get('/customer/foods'),
    ]).then(([catRes, restRes, foodRes]) => {
      setCategories(catRes.data.categories || []);
      setRestaurants(restRes.data.restaurants || []);
      setFoods(foodRes.data.foods || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDetectLocation = () => {
    setLocation('Bangalore');
    toast.success('Location detected!');
    // Trigger a mock search just by changing location if desired, or let user click search
  };

  const handleAddToCart = (food) => {
    if (!user) { navigate('/login'); return; }
    if (!food.restaurantId) { toast.error("Restaurant details missing"); return; }
    addToCart({
      foodId: food._id,
      name: food.name,
      price: food.discountedPrice || food.price,
      image: food.image,
    }, food.restaurantId._id, food.restaurantId.name);
    toast.success(`${food.name} added to cart!`);
  };

  const handleBuy = (food) => {
    if (!user) { navigate('/login'); return; }
    handleAddToCart(food);
    navigate('/cart');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    let queryParams = [];
    if (search.trim()) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (location.trim()) queryParams.push(`city=${encodeURIComponent(location)}`);

    if (queryParams.length > 0) {
      navigate(`/restaurants?${queryParams.join('&')}`);
    } else {
      navigate('/restaurants');
    }
  };

  return (
    <div>
      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a0a 50%, #0f0f1a 100%)',
        padding: '80px 0 60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-50px', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,87,34,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,193,7,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{ maxWidth: 640, animation: 'fadeIn 0.8s ease' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {HERO_FOOD_EMOJIS.map((e, i) => (
                <span key={i} style={{ fontSize: 28, animation: `bounce ${1 + i * 0.15}s ease infinite`, animationDelay: `${i * 0.1}s` }}>{e}</span>
              ))}
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, fontFamily: 'Poppins, sans-serif' }}>
              Order Food,<br />
              <span style={{ color: 'var(--primary)', textShadow: '0 0 40px rgba(255,87,34,0.4)' }}>Fast & Fresh</span>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.7 }}>
              Discover the best restaurants near you. Delivered hot and fresh in 30 minutes.
            </p>

            {/* Search Bar with Location */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, maxWidth: 640, background: 'rgba(255,255,255,0.06)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', backdropFilter: 'blur(10px)', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <span onClick={handleDetectLocation} style={{ fontSize: 18, marginRight: 8, cursor: 'pointer', color: 'var(--primary)' }} title="Detect Location">📍</span>
                <input
                  type="text"
                  placeholder="Location (e.g. Pune)"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{ width: 140, padding: '16px 0', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                <input
                  type="text"
                  placeholder="Search for restaurants, cuisines..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, padding: '16px 0', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 10, margin: 6, fontWeight: 700, padding: '0 24px' }}>
                <span style={{ marginRight: 6 }}>🔍</span> Search
              </button>
            </form>

            <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap' }}>
              {[['🚀', '30 min delivery'], ['💯', 'Top rated'], ['🎁', 'Daily offers']].map(([icon, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <span>{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(!loading && restaurants.length === 0) ? (
        <section style={{ padding: '80px 20px', textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 24, filter: 'grayscale(1)', opacity: 0.8 }}>🛵</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>We are not in your area yet!</h2>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 500 }}>
            We currently don't have any restaurants delivering to your exact location. We are expanding rapidly, so check back soon!
          </p>
          <button className="btn btn-primary" style={{ marginTop: 32, borderRadius: 10, padding: '12px 24px', fontSize: 16 }} onClick={() => { setLocation(''); navigate('/restaurants'); }}>
            Browse All Locations
          </button>
        </section>
      ) : (
        <>
          {/* CATEGORIES SECTION */}
          <section style={{ padding: '48px 0 32px' }}>
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">What's on your <span>mind?</span></h2>
                <Link to="/restaurants" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>See all →</Link>
              </div>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                {loading ? Array(8).fill(0).map((_, i) => (
                  <div key={i} style={{ minWidth: 100, height: 90, borderRadius: 16, background: 'var(--bg-card)' }} className="shimmer" />
                )) : categories.map(cat => (
                  <Link key={cat._id} to={`/restaurants?cuisine=${encodeURIComponent(cat.name)}`}
                    style={{ minWidth: 100, textAlign: 'center', textDecoration: 'none', transition: 'var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 12px', marginBottom: 8, border: '1px solid var(--border)', transition: 'var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,87,34,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>{cat.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* FEATURED RESTAURANTS */}
          <section style={{ padding: '16px 0 64px' }}>
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">Top <span>Restaurants</span></h2>
                <Link to="/restaurants" style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>View all →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {loading ? Array(6).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 280, borderRadius: 16 }} className="shimmer" />
                )) : restaurants.slice(0, 8).map(r => (
                  <RestaurantCard key={r._id} restaurant={r} />
                ))}
              </div>
            </div>
          </section>

          {/* ALSO FOOD SECTION */}
          <section style={{ padding: '16px 0 64px' }}>
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">Also <span>Food</span></h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {loading ? Array(6).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 160, borderRadius: 16 }} className="shimmer" />
                )) : foods.map(f => (
                  <HomeFoodCard key={f._id} food={f} onAddToCart={() => handleAddToCart(f)} onBuy={() => handleBuy(f)} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* WHY FOODHUB */}
      <section style={{ padding: '48px 0', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 40 }}>Why choose <span>FoodHub?</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { icon: '', title: 'Lightning Fast', desc: 'Average delivery in 30 mins' },
              { icon: '', title: 'Top Quality', desc: 'Verified restaurants only' },
              { icon: '', title: 'Secure OTP', desc: 'OTP verified delivery' },
              { icon: '', title: 'Easy Payment', desc: 'Razorpay, Cards, UPI' },
            ].map(f => (
              <div key={f.title} style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function RestaurantCard({ restaurant }) {
  return (
    <Link to={`/restaurants/${restaurant._id}`} className="card" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', height: 170, background: 'var(--bg-card2)', overflow: 'hidden' }}>
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'var(--transition)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>🍽️</div>
        )}
        {!restaurant.isOpen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
            Currently Closed
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', padding: '4px 10px', borderRadius: 100 }}>
          <span style={{ color: '#FFD700', fontSize: 12 }}>⭐ {restaurant.rating?.toFixed(1)}</span>
        </div>
        {restaurant.offers?.length > 0 && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'var(--primary)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: 'white' }}>
            {restaurant.offers[0]}
          </div>
        )}
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{restaurant.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
          {restaurant.cuisine?.join(' • ')}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>🕐 {restaurant.deliveryTime}</span>
          <span>🛵 ₹{restaurant.deliveryFee} delivery</span>
        </div>
      </div>
    </Link>
  );
}

function HomeFoodCard({ food, onAddToCart, onBuy }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 16, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', transition: 'var(--transition)' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, border: `2px solid ${food.isVeg ? 'var(--success)' : 'var(--danger)'}`, width: 16, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: food.isVeg ? 'var(--success)' : 'var(--danger)', display: 'block' }} />
            </span>
            {food.isBestseller && <span style={{ fontSize: 10, color: '#FF8F00', fontWeight: 700 }}>★ Bestseller</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{food.name}</div>
          {food.restaurantId && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 180 }}>from {food.restaurantId.name}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {food.discountedPrice ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 16 }}>₹{food.discountedPrice}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{food.price}</span>
              </>
            ) : <span style={{ fontWeight: 800, fontSize: 16 }}>₹{food.price}</span>}
          </div>
        </div>

        <div style={{ minWidth: 100, height: 90, borderRadius: 12, overflow: 'hidden' }}>
          {food.image ? (
            <img src={food.image} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🍽️</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        <button onClick={onAddToCart} disabled={!food.isAvailable}
          style={{ flex: 1, padding: '10px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'var(--transition)' }}>
          Add to Cart
        </button>
        <button onClick={onBuy} disabled={!food.isAvailable}
          style={{ flex: 1, padding: '10px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'var(--transition)' }}>
          Buy Now
        </button>
      </div>
    </div>
  );
}

