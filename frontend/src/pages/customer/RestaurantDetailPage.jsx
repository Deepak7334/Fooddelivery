import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiStar, FiShoppingBag, FiTag, FiArrowRight, FiAlertCircle, FiCalendar, FiMinus, FiPlus } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import './CustomerDetails.css';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
}

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
          norm = norm.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          if (!cleanGrouped[norm]) {
            cleanGrouped[norm] = [];
          }
          cleanGrouped[norm] = cleanGrouped[norm].concat(rawGrouped[key]);
        });

        setMenuGrouped(cleanGrouped);
        const cats = Object.keys(cleanGrouped);
        if (cats.length) setActiveCategory(cats[0]);

        const locStr = localStorage.getItem('jdkart_coords');
        const rLoc = res.data.restaurant?.location;
        const rLat = rLoc?.lat != null ? rLoc.lat : (rLoc?.coordinates ? rLoc.coordinates[1] : null);
        const rLng = rLoc?.lng != null ? rLoc.lng : (rLoc?.coordinates ? rLoc.coordinates[0] : null);

        if (locStr && rLat != null && rLng != null) {
          try {
            const loc = JSON.parse(locStr);
            const d = calculateDistance(loc.lat, loc.lng, rLat, rLng);
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
  if (!restaurant) return <div className="empty-state" style={{ paddingTop: 120 }}><div className="empty-state-icon"><FiAlertCircle /></div><h3>Restaurant not found</h3></div>;

  const categories = Object.keys(menuGrouped);
  const cartCount = cartItems.filter(() => restaurantId === restaurant._id).reduce((s, item) => s + item.quantity, 0);

  return (
    <div className="customer-vendor-page">
      <header className="cd-vendor-header">
        <div className="container cd-vendor-summary">
          <div className="cd-vendor-image">
            {restaurant.image ? <img src={restaurant.image} alt={restaurant.name} /> : <FiShoppingBag aria-hidden="true" />}
          </div>
          <div className="cd-vendor-info">
            <h1>{restaurant.name}</h1>
            {restaurant.cuisine && <p className="cd-vendor-cuisine">{restaurant.cuisine.join(' • ')}</p>}
            <div className="cd-vendor-meta">
              <span className="cd-rating">{restaurant.rating?.toFixed(1)} <FiStar /></span>
              <span>{restaurant.totalRatings}+ ratings</span>
              <span><FiClock /> {restaurant.deliveryTime}</span>
              <span>₹{restaurant.deliveryFee} delivery</span>
            </div>
            <div className="cd-vendor-status-row">
              <span className={`cd-status${restaurant.isOpen ? '' : ' is-closed'}`}>{restaurant.isOpen ? 'Open' : 'Closed'}</span>
              {restaurant.bookingEnabled && <button className="cd-book-button" onClick={() => navigate(`/booking/${restaurant._id}`)}><FiCalendar /> Book Table</button>}
            </div>
          </div>
        </div>
      </header>
      {!canDeliver && (
        <div className="cd-delivery-warning"><FiAlertCircle /><span><strong>Sorry, we can't reach you!</strong> You are {distance.toFixed(1)}km away. We only deliver within a 5km radius.</span></div>
      )}
      <div className="container cd-vendor-layout">
        <aside className="cd-category-sidebar">
          <nav className="cd-category-list" aria-label="Menu categories">
            {categories.map(cat => (
              <button key={cat} className={`cd-chip${activeCategory === cat ? ' is-selected' : ''}`} aria-pressed={activeCategory === cat} onClick={() => { setActiveCategory(cat); document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{cat}</button>
            ))}
          </nav>
        </aside>
        <div className="cd-vendor-content">
          {categories.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>Menu coming soon!</h3></div>
          ) : categories.map(cat => (
            <section key={cat} id={`cat-${cat}`} className="cd-menu-section">
              <h2>{cat}</h2>
              <div className="cd-item-grid">
                {menuGrouped[cat].map(food => (
                  <FoodCard key={food._id} food={food} qty={getItemQty(food._id)} onAdd={() => handleAdd(food)}
                    onBuy={() => { handleAdd(food); navigate('/cart'); }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {cartCount > 0 && restaurantId === restaurant._id && (
        <div className="cd-vendor-cart">
          <button onClick={() => navigate('/cart')}><span><FiShoppingBag /> {cartCount} items</span><span>View Cart <FiArrowRight /></span></button>
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
    <div className="cd-item-card">
      <Link to={`/food/${food._id}`} className="cd-card-link">
        <div className="cd-card-image">
          {food.image ? <img loading="lazy" src={food.image} alt={food.name} /> : <div className="cd-image-placeholder"><FiShoppingBag /></div>}
          <span className={`cd-veg-mark${food.isVeg ? '' : ' is-nonveg'}`} aria-label={food.isVeg ? 'Vegetarian' : 'Non-vegetarian'}><span /></span>
          <div className="cd-card-badges">
            {food.freeDelivery && <span className="cd-delivery-badge">Free Delivery</span>}
            {food.offer ? <span className="cd-offer"><FiTag /> {food.offer}</span> : discount > 0 ? <span className="cd-discount">{discount}% off</span> : null}
          </div>
        </div>
        <div className="cd-card-info">
          <h3>{food.name}</h3>
          {food.orderCount > 0 && <div className="cd-order-count">Ordered {food.orderCount}+ times</div>}
          {food.description && <p className="cd-card-description">{food.description}</p>}
          <div className="cd-card-pricing">
            {dPrice ? <><strong>{prefix}₹{dPrice}</strong><span className="cd-original-price">₹{pPrice}</span></> : <strong>{prefix}₹{pPrice}</strong>}
          </div>
        </div>
      </Link>
      <div className="cd-card-actions">
        {qty > 0 && !hasVariants ? (
          <div className="cd-card-quantity">
            <button aria-label={`Remove one ${food.name}`} onClick={() => updateQuantity(food._id, qty - 1)}><FiMinus /></button>
            <span>{qty}</span>
            <button aria-label={`Add one ${food.name}`} onClick={() => updateQuantity(food._id, qty + 1)}><FiPlus /></button>
          </div>
        ) : hasVariants ? (
          <>
            <Link to={`/food/${food._id}`} className="cd-action-add">ADD</Link>
            <Link to={`/food/${food._id}`} className="cd-action-primary">Order</Link>
          </>
        ) : (
          <button onClick={onAdd} disabled={!food.isAvailable} className="cd-action-add">{food.isAvailable ? 'ADD' : 'Unavailable'}</button>
        )}
        {!hasVariants && <button onClick={onBuy} disabled={!food.isAvailable} className="cd-action-primary">Order</button>}
      </div>
    </div>
  );
}
