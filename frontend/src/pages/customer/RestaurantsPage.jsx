import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('');
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || '');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (cuisine) params.set('cuisine', cuisine);
    api.get(`/customer/restaurants?${params}`)
      .then(res => setRestaurants(res.data.restaurants || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, sort, cuisine]);

  const handleSearch = (e) => {
    e.preventDefault();
    const val = e.target.elements.search.value;
    setSearch(val);
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            All <span style={{ color: 'var(--primary)' }}>Restaurants</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{restaurants.length} restaurants found</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, flex: '1 1 300px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="🔍 Search restaurants..."
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

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 280, borderRadius: 16 }} className="shimmer" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <h3>No Restaurants Found</h3>
            <p>Try a different search or filter</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {restaurants.map(r => <RestaurantCard key={r._id} restaurant={r} />)}
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
