import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
}
// ... existing imports ...
import { Link } from 'react-router-dom';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuGrouped, setMenuGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const { addToCart, cartItems, restaurantId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    api.get(`/customer/restaurants/${id}`)
      .then(res => {
        setRestaurant(res.data.restaurant);
        
        const rawGrouped = res.data.menuGrouped || {};
        const cleanGrouped = {};
        
        Object.keys(rawGrouped).forEach(key => {
          let norm = key.trim().toLowerCase();
          
          // Capitalize each word (e.g., "north indian" -> "North Indian")
          norm = norm.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          
          if (!cleanGrouped[norm]) {
            cleanGrouped[norm] = [];
          }
          cleanGrouped[norm] = cleanGrouped[norm].concat(rawGrouped[key]);
        });
        
        setMenuGrouped(cleanGrouped);
        const cats = Object.keys(cleanGrouped);
        if (cats.length) setActiveCategory(cats[0]);
        
        // Calculate distance if location available
        const locStr = localStorage.getItem('jdkart_coords');
        if (locStr && res.data.restaurant?.location?.lat && res.data.restaurant?.location?.lng) {
          try {
            const loc = JSON.parse(locStr);
            const d = calculateDistance(loc.lat, loc.lng, res.data.restaurant.location.lat, res.data.restaurant.location.lng);
            setDistance(d);
          } catch {
            // ignore
          }
        }
      }).catch(() => toast.error('Restaurant not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const canDeliver = distance === null || distance <= 5;

  const getItemQty = (foodId) => {
    const item = cartItems.find(i => i.foodId === foodId);
    return item ? item.quantity : 0;
  };

  const handleAdd = (food) => {
    if (!user) { navigate('/login'); return; }
    if (!canDeliver) {
      toast.error("Sorry, we can't reach you. You are more than 5km away.");
      return;
    }
    addToCart({
      foodId: food._id,
      name: food.name,
      price: food.discountedPrice || food.price,
      image: food.image,
    }, restaurant._id, restaurant.name);
  };

  if (loading) return <div style={{ padding: '120px 24px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 16px' }} /></div>;
  if (!restaurant) return <div className="empty-state" style={{ paddingTop: 120 }}><div className="empty-state-icon">❌</div><h3>Restaurant not found</h3></div>;

  const categories = Object.keys(menuGrouped);
  const cartCount = cartItems.filter(() => restaurantId === restaurant._id).reduce((s, item) => s + item.quantity, 0);

  return (
    <div>
      {/* Hero Banner */}
      <div style={{ height: 280, position: 'relative', background: 'var(--bg-card2)', overflow: 'hidden' }}>
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}></div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,26,1) 0%, rgba(15,15,26,0.3) 60%, transparent 100%)' }} />
        <div className="container" style={{ position: 'absolute', bottom: 24, left: 0, right: 0 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{restaurant.name}</h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: 'var(--text-secondary)' }}>
            <span>⭐ {restaurant.rating?.toFixed(1)} · {restaurant.totalRatings}+ ratings</span>
            <span>🕐 {restaurant.deliveryTime}</span>
            <span>₹{restaurant.deliveryFee} delivery</span>
            <span style={{ color: restaurant.isOpen ? 'var(--success)' : 'var(--danger)' }}>
              {restaurant.isOpen ? '🟢 Open' : '🔴 Closed'}
            </span>
            {restaurant.bookingEnabled && (
              <button
                onClick={() => navigate(`/booking/${restaurant._id}`)}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: 'var(--success)',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🪑 Book Table
              </button>
            )}
          </div>
          {restaurant.cuisine && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>{restaurant.cuisine.join(' • ')}</div>}
        </div>
      </div>

      {!canDeliver && (
        <div style={{ background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', padding: '16px 24px', textAlign: 'center', borderBottom: '1px solid rgba(244,67,54,0.2)' }}>
          <strong>⚠️ Sorry, we can't reach you!</strong> You are {distance.toFixed(1)}km away. We only deliver within a 5km radius.
        </div>
      )}

      <div className="container restaurant-layout">
        {/* Category Sidebar */}
        <div className="restaurant-sidebar">
          <div className="restaurant-sidebar-inner">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                style={{ padding: '10px 14px', borderRadius: 10, background: activeCategory === cat ? 'rgba(255,87,34,0.1)' : 'transparent', border: activeCategory === cat ? '1px solid rgba(255,87,34,0.3)' : '1px solid transparent', color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="restaurant-content">
          {categories.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>Menu coming soon!</h3></div>
          ) : categories.map(cat => (
            <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{cat}</h2>
              <div className="items-grid-small">
                {menuGrouped[cat].map(food => (
                  <FoodCard key={food._id} food={food} qty={getItemQty(food._id)} onAdd={() => handleAdd(food)}
                    onBuy={() => { if (!user) { navigate('/login'); return; } handleAdd(food); navigate('/cart'); }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Cart Bar */}
      {cartCount > 0 && restaurantId === restaurant._id && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300 }}>
          <button onClick={() => navigate('/cart')} className="btn btn-primary btn-lg" style={{ boxShadow: '0 8px 32px rgba(255,87,34,0.5)', borderRadius: 100, minWidth: 280, justifyContent: 'space-between', animation: 'glow 2s infinite' }}>
            <span>🛒 {cartCount} items</span>
            <span>View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}

function FoodCard({ food, qty, onAdd, onBuy }) {
  const { updateQuantity } = useCart();
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
    <div className="item-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', transition: 'var(--transition)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,87,34,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      
      <Link to={`/food/${food._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
        {/* Image */}
        <div style={{ height: 130, borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: 'var(--bg-dark)', position: 'relative' }}>
          {food.image ? (
            <img src={food.image} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍽️</div>
          )}
          <div style={{ position: 'absolute', top: 6, left: 6, width: 20, height: 20, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${food.isVeg ? '#4CAF50' : '#F44336'}` }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: food.isVeg ? '#4CAF50' : '#F44336' }}></div>
          </div>
          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            {food.offer ? (
              <span style={{ background: '#388E3C', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 4 }}>🏷️ {food.offer}</span>
            ) : discount > 0 ? (
              <span style={{ background: '#388E3C', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>{discount}% off</span>
            ) : null}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, lineHeight: 1.3 }}>{food.name}</div>
        {food.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{food.description}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 10 }}>
          {dPrice ? (
            <>
              <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{prefix}₹{dPrice}</span>
              <span style={{ fontSize: 12, color: '#878787', textDecoration: 'line-through' }}>₹{pPrice}</span>
            </>
          ) : (
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{prefix}₹{pPrice}</span>
          )}
        </div>
      </Link>

      {/* Add / Qty stepper */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {qty > 0 && !hasVariants ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, padding: '4px 8px', height: 36 }}>
            <button onClick={() => updateQuantity(food._id, qty - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => updateQuantity(food._id, qty + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>+</button>
          </div>
        ) : hasVariants ? (
          <>
            <Link to={`/food/${food._id}`} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, boxSizing: 'border-box' }}>
              + Cart
            </Link>
            <Link to={`/food/${food._id}`} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, boxSizing: 'border-box' }}>
              Order
            </Link>
          </>
        ) : (
          <button
            onClick={onAdd}
            disabled={!food.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: food.isAvailable ? 'rgba(255,87,34,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${food.isAvailable ? 'rgba(255,87,34,0.3)' : 'var(--border)'}`, borderRadius: 8, color: food.isAvailable ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', height: 36 }}
          >
            {food.isAvailable ? '+ Cart' : 'Unavailable'}
          </button>
        )}
        {!hasVariants && (
          <button onClick={onBuy} disabled={!food.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: food.isAvailable ? 'pointer' : 'not-allowed', opacity: food.isAvailable ? 1 : 0.5, height: 36 }}>
            Order
          </button>
        )}
      </div>
    </div>
  );
}
