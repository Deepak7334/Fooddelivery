import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useMemo } from 'react';
import { getVendorDistance, formatDistance } from '../../utils/distance';
import toast from 'react-hot-toast';
import { FiClock, FiMapPin, FiSearch, FiShoppingBag, FiStar, FiX } from 'react-icons/fi';
import './CustomerBrowse.css';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('');
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || '');
  const [vegOnly, setVegOnly] = useState(searchParams.get('veg') === 'true');

  const [userCoords, setUserCoords] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jdkart_coords') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    const handleLocUpdate = () => {
      try {
        setUserCoords(JSON.parse(localStorage.getItem('jdkart_coords') || 'null'));
      } catch {
        setUserCoords(null);
      }
    };
    window.addEventListener('locationUpdated', handleLocUpdate);
    return () => window.removeEventListener('locationUpdated', handleLocUpdate);
  }, []);

  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line
    if (!restaurants.length && !foods.length) setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
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
  }, [debouncedSearch, sort, cuisine, vegOnly, searchParams]);

  // Sort restaurants with support for Nearest / Distance
  const displayedRestaurants = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];
    let list = [...restaurants];
    if (sort === 'nearest' || (!sort && userCoords)) {
      list.sort((a, b) => {
        const distA = getVendorDistance(a, userCoords);
        const distB = getVendorDistance(b, userCoords);
        if (distA != null && distB != null && Math.abs(distA - distB) > 0.05) {
          return distA - distB;
        }
        if (distA != null && distB == null) return -1;
        if (distA == null && distB != null) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    } else if (sort === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return list;
  }, [restaurants, sort, userCoords]);

  const handleAddFood = (food) => {
    addToCart(food, food.restaurantId?._id);
    toast.success('Added to cart');
  };

  return (
    <div className="page-wrapper customer-browse">
      <div className="container">
        <header className="browse-header">
          {!searchParams.has('search') ? (
            <>
              <h1>{searchParams.get('action') === 'book' ? 'Book a Table' : 'All Restaurants'}</h1>
              <p>{searchParams.get('action') === 'book' ? 'Select a restaurant below to reserve your table instantly' : 'Browse the best food in town'}</p>
            </>
          ) : (
            <h1>Search Results for <span>"{searchParams.get('search')}"</span></h1>
          )}
        </header>

        <div className="browse-filters">
          <select value={sort} onChange={e => setSort(e.target.value)} className={`browse-filter${sort ? ' is-active' : ''}`} aria-label="Sort restaurants">
            <option value="">Sort by</option>
            <option value="nearest">Nearest</option>
            <option value="rating">Rating</option>
            <option value="deliveryTime">Delivery Time</option>
            <option value="deliveryFee">Delivery Fee</option>
          </select>
          {cuisine && (
            <button onClick={() => setCuisine('')} className="browse-filter is-active" aria-label={`Clear ${cuisine} filter`}>
              {cuisine} <FiX size={14} aria-hidden="true" />
            </button>
          )}
          {searchParams.has('search') && (
            <button onClick={() => navigate('/restaurants')} className="browse-filter is-active" aria-label="Clear search">
              Search: "{searchParams.get('search')}" <FiX size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="browse-sections">
          {(!searchParams.has('search') || restaurants.length > 0) && (
            <section className="browse-section" style={{ order: searchParams.has('search') ? 2 : 1 }}>
              <h2>{searchParams.has('search') ? 'Matching Restaurants' : searchParams.get('city') ? `Restaurants near ${searchParams.get('city')}` : searchParams.get('lat') ? 'Restaurants near you' : 'Top Restaurants'}</h2>
              {loading ? (
                <div className="browse-vendor-grid" aria-label="Loading restaurants" aria-busy="true">
                  {Array(3).fill(0).map((_, i) => <div key={i} className="shimmer browse-skeleton" />)}
                </div>
              ) : restaurants.length === 0 ? (
                searchParams.get('city') || searchParams.get('lat') ? (
                  <div className="browse-empty">
                    <FiMapPin size={40} aria-hidden="true" />
                    <h2>No restaurants in your area yet</h2>
                    <p>Our service is not available in your area yet. We hope to be there soon.</p>
                    <button className="browse-primary" onClick={() => {
                      if (searchParams.get('lat')) localStorage.removeItem('jdkart_coords');
                      navigate('/restaurants');
                    }}>Try Again</button>
                  </div>
                ) : (
                  <div className="browse-empty"><p>No restaurants found</p></div>
                )
              ) : (
                <div className="browse-vendor-grid">
                  {displayedRestaurants.map(r => <RestaurantCard key={r._id} restaurant={r} userCoords={userCoords} />)}
                </div>
              )}
            </section>
          )}

          {((foods.length > 0 || !searchParams.has('search')) && searchParams.get('action') !== 'book') && (
            <section className="browse-section" style={{ order: searchParams.has('search') ? 1 : 2 }}>
              <h2>{searchParams.has('search') ? 'Matching Dishes' : 'Popular Dishes'}</h2>
              {loading ? (
                <div className="browse-product-grid" aria-label="Loading dishes" aria-busy="true">
                  {Array(6).fill(0).map((_, i) => <div key={i} className="shimmer browse-skeleton" />)}
                </div>
              ) : foods.length === 0 ? (
                <div className="browse-empty"><p>No dishes found</p></div>
              ) : (
                <div className="browse-product-grid">
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant, userCoords }) {
  const dist = getVendorDistance(restaurant, userCoords);
  const distStr = formatDistance(dist);

  return (
    <Link to={`/restaurants/${restaurant._id}`} className="browse-vendor-card">
      <div className="browse-vendor-image">
        {restaurant.image ? (
          <img loading="lazy" src={restaurant.image} alt={restaurant.name} />
        ) : (
          <div className="browse-image-placeholder"><FiShoppingBag size={38} aria-hidden="true" /></div>
        )}
        {!restaurant.isOpen && <div className="browse-closed">Closed</div>}
        {distStr && <span className="browse-distance"><FiMapPin size={12} aria-hidden="true" /> {distStr}</span>}
      </div>
      <div className="browse-vendor-details">
        <div className="browse-vendor-title">
          <h3>{restaurant.name}</h3>
          <span className="browse-rating"><FiStar size={12} aria-hidden="true" /> {restaurant.rating?.toFixed(1)}</span>
        </div>
        <p>{restaurant.cuisine?.join(' • ')}</p>
        <div className="browse-vendor-meta">
          <span><FiClock size={13} aria-hidden="true" /> {restaurant.deliveryTime}</span>
          <span>₹{restaurant.deliveryFee} delivery</span>
          <span>Min ₹{restaurant.minOrder}</span>
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
    <article className="browse-product-card">
      <Link to={`/food/${food._id}`} className="browse-product-link">
        <div className="browse-product-image">
          {food.image ? (
            <img loading="lazy" src={food.image} alt={food.name} />
          ) : (
            <div className="browse-image-placeholder"><FiShoppingBag size={30} aria-hidden="true" /></div>
          )}
        </div>
        <div className="browse-product-details">
          <div className="browse-badges">
            <span className={`browse-veg${food.isVeg ? '' : ' non-veg'}`} aria-label={food.isVeg ? 'Vegetarian' : 'Non-vegetarian'}><span /></span>
            {food.isBestseller && <span className="browse-chip">Bestseller</span>}
            {food.orderCount > 0 && <span className="browse-order-count">Ordered {food.orderCount}+ times</span>}
          </div>
          <h3>{food.name}</h3>
          {food.restaurantId && <p className="browse-product-vendor">from {food.restaurantId.name}</p>}
          <div className="browse-price">
            {dPrice ? (
              <><strong>{prefix}₹{dPrice}</strong><del>₹{pPrice}</del></>
            ) : <strong>{prefix}₹{pPrice}</strong>}
          </div>
          {hasVariants && <p className="browse-options">Options: {food.variants.map(v => v.name).join(', ')}</p>}
        </div>
      </Link>
      <div className="browse-product-actions">
        {hasVariants ? (
          <>
            <Link to={`/food/${food._id}`} className="browse-add">ADD</Link>
            <Link to={`/food/${food._id}`} className="browse-buy">Order</Link>
          </>
        ) : (
          <>
            <button onClick={onAddToCart} disabled={!food.isAvailable} className="browse-add">ADD</button>
            <button onClick={onBuy} disabled={!food.isAvailable} className="browse-buy">Order</button>
          </>
        )}
      </div>
    </article>
  );
}
