import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuGrouped, setMenuGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const { addToCart, cartItems, restaurantId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/customer/restaurants/${id}`)
      .then(res => {
        setRestaurant(res.data.restaurant);
        setMenuGrouped(res.data.menuGrouped || {});
        const cats = Object.keys(res.data.menuGrouped || {});
        if (cats.length) setActiveCategory(cats[0]);
      }).catch(() => toast.error('Restaurant not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const getItemQty = (foodId) => {
    const item = cartItems.find(i => i.foodId === foodId);
    return item ? item.quantity : 0;
  };

  const handleAdd = (food) => {
    if (!user) { navigate('/login'); return; }
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
  const cartCount = cartItems.filter(i => restaurantId === restaurant._id).reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      {/* Hero Banner */}
      <div style={{ height: 280, position: 'relative', background: 'var(--bg-card2)', overflow: 'hidden' }}>
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🍽️</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,26,1) 0%, rgba(15,15,26,0.3) 60%, transparent 100%)' }} />
        <div className="container" style={{ position: 'absolute', bottom: 24, left: 0, right: 0 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{restaurant.name}</h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: 'var(--text-secondary)' }}>
            <span>⭐ {restaurant.rating?.toFixed(1)} · {restaurant.totalRatings}+ ratings</span>
            <span>🕐 {restaurant.deliveryTime}</span>
            <span>🛵 ₹{restaurant.deliveryFee} delivery</span>
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

      <div className="container" style={{ display: 'flex', gap: 24, padding: '24px 24px' }}>
        {/* Category Sidebar */}
        <div style={{ width: 160, flexShrink: 0, position: 'sticky', top: 90, height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                style={{ padding: '10px 14px', borderRadius: 10, background: activeCategory === cat ? 'rgba(255,87,34,0.1)' : 'transparent', border: activeCategory === cat ? '1px solid rgba(255,87,34,0.3)' : '1px solid transparent', color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ flex: 1 }}>
          {categories.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🍽️</div><h3>Menu coming soon!</h3></div>
          ) : categories.map(cat => (
            <div key={cat} id={`cat-${cat}`} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{cat}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {menuGrouped[cat].map(food => (
                  <FoodCard key={food._id} food={food} qty={getItemQty(food._id)} onAdd={() => handleAdd(food)}
                    onIncrease={() => handleAdd(food)}
 onDecrease={() => {
                      if (!user) return;
                    }} />
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

function FoodCard({ food, qty, onAdd }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', transition: 'var(--transition)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, border: `2px solid ${food.isVeg ? 'var(--success)' : 'var(--danger)'}`, width: 16, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: food.isVeg ? 'var(--success)' : 'var(--danger)', display: 'block' }} />
          </span>
          {food.isBestseller && <span style={{ fontSize: 10, color: '#FF8F00', fontWeight: 700 }}>★ Bestseller</span>}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{food.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{food.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {food.discountedPrice ? (
            <>
              <span style={{ fontWeight: 800, fontSize: 16 }}>₹{food.discountedPrice}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{food.price}</span>
            </>
          ) : <span style={{ fontWeight: 800, fontSize: 16 }}>₹{food.price}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minWidth: 100 }}>
        {food.image ? (
          <img src={food.image} alt={food.name} style={{ width: 90, height: 80, objectFit: 'cover', borderRadius: 10 }} />
        ) : (
          <div style={{ width: 90, height: 80, background: 'var(--bg-card2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
        )}
        <button onClick={onAdd} disabled={!food.isAvailable}
          style={{ width: '100%', padding: '6px 0', background: qty > 0 ? 'var(--primary)' : 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: qty > 0 ? 'white' : 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'var(--transition)' }}>
          {!food.isAvailable ? 'Unavailable' : qty > 0 ? `+ ADD (${qty})` : '+ ADD'}
        </button>
      </div>
    </div>
  );
}

