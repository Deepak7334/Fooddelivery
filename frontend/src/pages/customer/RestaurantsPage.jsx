import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('');
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || '');

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (cuisine) params.set('cuisine', cuisine);
    
    Promise.all([
      api.get(`/customer/restaurants?${params}`),
      api.get(`/customer/foods?${params}`)
    ])
      .then(([restRes, foodRes]) => {
        setRestaurants(restRes.data.restaurants || []);
        setFoods(foodRes.data.foods || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, sort, cuisine]);

  const handleSearch = (e) => {
    e.preventDefault();
    const val = e.target.elements.search.value;
    setSearch(val);
  };

  const handleAddFood = (food) => {
    addToCart(food, food.restaurantId?._id);
    toast.success('Added to cart');
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            All <span style={{ color: 'var(--primary)' }}>Restaurants</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Browse the best food in town</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, flex: '1 1 300px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="🔍 Search restaurants or dishes..."
              style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ margin: 6, borderRadius: 8 }}>Search</button>
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

        {/* Restaurants Section */}
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Top Restaurants</h2>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
            {Array(3).fill(0).map((_, i) => <div key={i} style={{ height: 280, borderRadius: 16 }} className="shimmer" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: 40 }}>
            <p>No restaurants found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
            {restaurants.map(r => <RestaurantCard key={r._id} restaurant={r} />)}
          </div>
        )}

        {/* Dishes Section */}
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Popular Dishes</h2>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
            {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 160, borderRadius: 16 }} className="shimmer" />)}
          </div>
        ) : foods.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: 40 }}>
            <p>No dishes found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
            {foods.map(food => (
              <HomeFoodCard 
                key={food._id} 
                food={food} 
                onAddToCart={() => handleAddFood(food)}
                onBuy={() => { handleAddFood(food); navigate('/cart'); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }) {
  return (
    <Link to={`/restaurants/${restaurant._id}`} className="card" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', height: 170, background: 'var(--bg-card2)' }}>
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
