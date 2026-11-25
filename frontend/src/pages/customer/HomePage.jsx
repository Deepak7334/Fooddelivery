import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowRight, FiMapPin, FiSearch, FiShoppingBag, FiTruck, FiX } from 'react-icons/fi';
import { MdOutlineRestaurant } from 'react-icons/md';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { calculateDistance } from '../../utils/distance';
import { reverseGeocodeCoords } from '../../utils/geolocation';
import { homeBanners } from '../../components/customerHomeDesign';

const STORE_TYPES = [{ _id: 'grocery', name: 'Grocery', type: 'store' }, { _id: 'bakery', name: 'Bakery', type: 'store' }];

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [stores, setStores] = useState([]);
  const [foods, setFoods] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [promoBanner, setPromoBanner] = useState({ active: false, text: '' });
  const [locationText, setLocationText] = useState(() => {
    const stored = localStorage.getItem('jdkart_loc_name');
    return stored || (localStorage.getItem('jdkart_coords') ? 'Current Location' : '');
  });
  const [userCoords, setUserCoords] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jdkart_coords') || 'null'); } catch { return null; }
  });
  const [locLoading, setLocLoading] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  const activeCategory = params.get('category');
  const vegOnly = params.get('veg') === 'true';
  const isHome = !view && !activeCategory;
  const [showLocationPrompt, setShowLocationPrompt] = useState(() => params.get('location') === 'select');
  const [visibleCount, setVisibleCount] = useState(10);
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bannerRef = useRef(null);
  const moreRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, addProductToCart, cartItems, cartType, storeId: cartStoreId, updateQuantity } = useCart();

  const fetchData = useCallback(() => {
    const qs = userCoords?.lat && userCoords?.lng ? `?lat=${userCoords.lat}&lng=${userCoords.lng}` : '';
    setLoading(true);
    setLoadError(false);
    Promise.all([
      api.get('/customer/categories').catch(() => ({ data: { categories: [] } })),
      api.get(`/customer/restaurants${qs}`).catch(() => ({ data: { restaurants: [] } })),
      api.get(`/customer/foods${qs}`).catch(() => ({ data: { foods: [], failed: true } })),
      api.get(`/store/products${qs}`).catch(() => ({ data: { products: [], failed: true } })),
      api.get(`/store/stores${qs}`).catch(() => ({ data: { stores: [] } })),
      api.get('/customer/settings/promo').catch(() => ({ data: {} })),
    ]).then(([catRes, restRes, foodRes, prodRes, storeRes, promoRes]) => {
      setCategories(catRes.data.categories || []);
      setRestaurants(restRes.data.restaurants || []);
      setFoods(foodRes.data.foods || []);
      setProducts(prodRes.data.products || []);
      setStores(storeRes.data.stores || []);
      setLoadError(Boolean(foodRes.data.failed && prodRes.data.failed));
      if (promoRes.data.success) setPromoBanner({ active: promoRes.data.promoBannerActive, text: promoRes.data.promoBannerText });
      setVisibleCount(10);
    }).finally(() => setLoading(false));
  }, [userCoords]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const openLocation = () => setShowLocationPrompt(true);
    window.addEventListener('requestLocationPrompt', openLocation);
    return () => window.removeEventListener('requestLocationPrompt', openLocation);
  }, []);

  useEffect(() => {
    if (showLocationPrompt) modalRef.current?.showModal();
    else modalRef.current?.close();
  }, [showLocationPrompt]);

  const selectBanner = useCallback(index => {
    const track = bannerRef.current;
    if (!track) return;
    const card = track.children[index];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior: reducedMotion ? 'instant' : 'smooth' });
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('homeBannerChanged', { detail: isHome ? activeBanner : 0 }));
  }, [activeBanner, isHome]);

  useEffect(() => {
    if (!isHome || bannerPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => selectBanner((activeBanner + 1) % homeBanners.length), 4000);
    return () => clearInterval(timer);
  }, [activeBanner, bannerPaused, isHome, selectBanner]);

  const visibleVendors = useCallback(vendors => vendors.filter(vendor => {
    if (userCoords) {
      const lat = vendor.location?.coordinates?.[1] ?? vendor.location?.lat;
      const lng = vendor.location?.coordinates?.[0] ?? vendor.location?.lng;
      const distance = calculateDistance(userCoords.lat, userCoords.lng, lat, lng);
      return distance !== null && distance <= 5;
    }
    if (locationText.trim() && !locationText.includes('Current Location')) {
      const tokens = locationText.toLowerCase().replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
      return tokens.some(token => vendor.city?.toLowerCase().includes(token) || vendor.address?.toLowerCase().includes(token));
    }
    return true;
  }), [userCoords, locationText]);
  const visibleRestaurants = useMemo(() => visibleVendors(restaurants), [restaurants, visibleVendors]);
  const visibleStores = useMemo(() => visibleVendors(stores), [stores, visibleVendors]);
  const isOutOfRange = Boolean(userCoords) && !loading && !locLoading && !visibleRestaurants.length && !visibleStores.length;

  const mixedItems = useMemo(() => {
    const query = search.toLowerCase();
    const target = activeCategory?.toLowerCase().trim();
    return [
      ...foods.map(food => ({ ...food, isProduct: false })),
      ...products.map(product => ({ ...product, isProduct: true })),
    ].filter(item => {
      if (view === 'food' && item.isProduct) return false;
      if (vegOnly && item.isVeg === false) return false;
      if (query && ![item.name, item.category, item.restaurantId?.name, item.storeId?.name].some(value => value?.toLowerCase().includes(query))) return false;
      if (!target) return true;
      const cuisine = item.restaurantId?.cuisine;
      const values = [item.category, item.name, item.storeId?.storeType, ...(Array.isArray(cuisine) ? cuisine : [cuisine])];
      return values.some(value => typeof value === 'string' && value.trim() && (value.toLowerCase().includes(target) || target.includes(value.toLowerCase())));
    }).sort((a, b) => a.isFeatured !== b.isFeatured ? (a.isFeatured ? -1 : 1) : a._id > b._id ? 1 : -1);
  }, [foods, products, search, activeCategory, vegOnly, view]);

  useEffect(() => {
    const sentinel = moreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(count => Math.min(count + 10, mixedItems.length));
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mixedItems.length, visibleCount, view]);

  const searchSuggestions = useMemo(() => search.trim() ? [
    ...foods.map(item => ({ ...item, itemType: 'food' })),
    ...products.map(item => ({ ...item, itemType: 'product' })),
    ...visibleRestaurants.map(item => ({ ...item, itemType: 'restaurants' })),
    ...visibleStores.map(item => ({ ...item, itemType: 'stores' })),
  ].filter(item => item.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : [], [search, foods, products, visibleRestaurants, visibleStores]);

  const handleSearch = event => {
    event.preventDefault();
    if (!search.trim()) return;
    const query = search.toLowerCase();
    const hasProduct = products.some(item => item.name.toLowerCase().includes(query) || item.category?.toLowerCase().includes(query)) || visibleStores.some(item => item.name.toLowerCase().includes(query));
    const hasFood = foods.some(item => item.name.toLowerCase().includes(query) || item.category?.toLowerCase().includes(query)) || visibleRestaurants.some(item => item.name.toLowerCase().includes(query));
    const destination = hasProduct && !hasFood ? 'stores' : 'restaurants';
    const queryParams = new URLSearchParams({ search: search.trim() });
    if (locationText.trim()) queryParams.set('city', locationText);
    navigate(`/${destination}?${queryParams}`);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation is not supported by your browser'); return; }
    setLocLoading(true);
    toast.loading('Detecting your location…', { id: 'loc' });
    navigator.geolocation.getCurrentPosition(async position => {
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserCoords(coords);
      localStorage.setItem('jdkart_coords', JSON.stringify(coords));
      let name = 'Current Location';
      try {
        const info = await reverseGeocodeCoords(coords.lat, coords.lng);
        name = info.area || info.district || name;
      } catch { /* Keep coordinates when reverse geocoding is unavailable. */ }
      localStorage.setItem('jdkart_loc_name', name);
      setLocationText(name);
      window.dispatchEvent(new Event('locationUpdated'));
      setLocLoading(false);
      setShowLocationPrompt(false);
      toast.success('Location detected!', { id: 'loc' });
    }, error => {
      setLocLoading(false);
      toast.error(error.code === 1 ? 'Location access denied. Allow it in your browser settings or enter your city.' : 'Location unavailable. Try entering your city manually.', { id: 'loc' });
    }, { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
  };

  const clearLocation = () => {
    localStorage.removeItem('jdkart_coords');
    localStorage.removeItem('jdkart_loc_name');
    setUserCoords(null);
    setLocationText('');
    window.dispatchEvent(new Event('locationUpdated'));
    setShowLocationPrompt(false);
    toast.success('Location cleared');
  };

  const handleAdd = (item, buy = false) => {
    if (item.variants?.length) { navigate(`/${item.isProduct ? 'product' : 'food'}/${item._id}`); return; }
    if (item.isProduct) {
      addProductToCart({ productId: item._id, foodId: item._id, name: item.name, price: item.discountedPrice || item.price, image: item.image, unit: item.unit }, item.storeId?._id, item.storeId?.name);
    } else {
      addToCart({ foodId: item._id, name: item.name, price: item.discountedPrice || item.price, image: item.image }, item.restaurantId?._id || item.restaurantId, item.restaurantId?.name || 'Restaurant');
    }
    if (buy) navigate('/cart');
  };

  const renderItem = (item, compact = false) => {
    const qty = item.isProduct && cartType === 'product' && cartStoreId === item.storeId?._id ? cartItems.find(cartItem => cartItem.productId === item._id)?.quantity || 0 : 0;
    return <HomeItemCard key={`${item.isProduct ? 'product' : 'food'}-${item._id}`} item={item} compact={compact} qty={qty} onAdd={() => handleAdd(item)} onBuy={() => handleAdd(item, true)} onUpdate={quantity => updateQuantity(item._id, quantity)} />;
  };
  const popularItems = mixedItems.filter(item => !item.isProduct).slice(0, 12);

  return (
    <div className={`customer-home ${!isHome ? 'customer-home-tab' : ''}`}>
      {isHome && (
        <div 
          className={`customer-hero-section ${homeBanners[activeBanner]?.dark ? 'customer-hero-dark' : ''}`}
          style={{ '--header-color': homeBanners[activeBanner]?.chrome || '#ffffff' }}
        >
          <section className="customer-promotions" aria-label="Featured services" aria-roledescription="carousel" onMouseEnter={() => setBannerPaused(true)} onMouseLeave={() => setBannerPaused(false)} onFocus={() => setBannerPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setBannerPaused(false); }}>
            <div className="customer-banner-track" ref={bannerRef} onTouchStart={() => setBannerPaused(true)} onTouchEnd={() => setBannerPaused(false)} onScroll={event => {
              const track = event.currentTarget;
              const center = track.scrollLeft + track.clientWidth / 2;
              let nearest = 0;
              Array.from(track.children).forEach((card, index) => {
                if (Math.abs(card.offsetLeft + card.clientWidth / 2 - center) < Math.abs(track.children[nearest].offsetLeft + track.children[nearest].clientWidth / 2 - center)) nearest = index;
              });
              setActiveBanner(nearest);
            }}>
              {homeBanners.map((banner, index) => <Link key={banner.title} to={banner.to} className="customer-banner" aria-label={`${banner.title}. ${banner.cta}`} tabIndex={activeBanner === index ? 0 : -1} style={{ '--banner-accent': banner.accent, backgroundImage: `${banner.overlay}${banner.image ? `, url("${banner.image}")` : ''}` }}>
                {!banner.image && <FiTruck className="customer-banner-watermark" />}
                <div className="customer-banner-copy"><h1>{banner.title}</h1><p>{banner.subtitle}</p><span className="customer-banner-cta">{banner.cta}<FiArrowRight size={13} /></span></div>
              </Link>)}
            </div>
            <div className="customer-banner-dots">{homeBanners.map((banner, index) => <button key={banner.title} className={activeBanner === index ? 'active' : ''} style={{ '--dot-color': banner.accent }} onClick={() => selectBanner(index)} aria-label={`Show banner ${index + 1}: ${banner.title}`} aria-pressed={activeBanner === index} />)}</div>
          </section>
        </div>
      )}

      <div className="container">
        {!isHome && <h1 className="customer-tab-title">{view === 'search' ? 'Search Results' : view === 'categories' ? 'Categories' : activeCategory || 'Food Items'}</h1>}
        {activeCategory && (
          <div style={{ marginBottom: 16 }}>
            <button className="customer-filter-chip" onClick={() => navigate('/?view=categories')}>
              {activeCategory} <FiX size={14} />
            </button>
          </div>
        )}
        {view === 'categories' && <div className="customer-category-grid">
          {loading ? Array.from({ length: 8 }, (_, index) => <div key={index} className="shimmer customer-category-skeleton" />) : [...STORE_TYPES, ...categories].map(category => {
            const name = category.type === 'store' ? category._id : category.name;
            const image = category.image || foods.find(food => food.category?.toLowerCase() === category.name.toLowerCase())?.image || products.find(product => product.category?.toLowerCase().includes(category.name.toLowerCase()))?.image;
            return <Link key={category._id} to={`/?category=${encodeURIComponent(name)}`} className="customer-category"><span>{image ? <img src={image} alt="" loading="lazy" /> : category.type === 'store' ? <FiShoppingBag size={32} /> : <MdOutlineRestaurant size={32} />}</span><strong>{category.name}</strong></Link>;
          })}
        </div>}
        {isHome && promoBanner.active && promoBanner.text && <Link to="/offers" className="customer-promo-note">{promoBanner.text}<FiArrowRight /></Link>}
        {isOutOfRange && <div className="customer-location-notice"><FiMapPin /><div><strong>Nothing delivers to this location yet</strong><p>Try another delivery location to see nearby restaurants and stores.</p></div><button onClick={() => setShowLocationPrompt(true)}>Change location</button></div>}
        {view !== 'categories' && <>
          {isHome && popularItems.length > 0 && <section className="customer-item-section">
            <div className="section-header"><h2 className="section-title">Popular Items</h2><Link to="/?view=food">See all <FiArrowRight /></Link></div>
            <div className="customer-popular-items">{popularItems.map(item => renderItem(item, true))}</div>
          </section>}
          <section className="customer-item-section">
            <div className="section-header"><h2 className="section-title">{view === 'search' && search ? 'Search results' : view === 'food' ? 'Explore Food' : 'All Items'}</h2>{isHome && <Link to="/?view=food">See all <FiArrowRight /></Link>}</div>
            {loading ? <div className="customer-items-grid" aria-label="Loading fresh items" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="shimmer customer-item-skeleton" />)}</div> : mixedItems.length ? <div className="customer-items-grid">{mixedItems.slice(0, visibleCount).map(item => renderItem(item))}</div> : <div className="customer-empty-state"><FiShoppingBag size={48} /><h3>{loadError ? 'Could not load items' : search ? 'No matching items' : 'No items available right now'}</h3><p>{loadError ? 'Please try again in a moment.' : 'Try another search, category or delivery location.'}</p><button className="btn btn-primary" onClick={loadError ? fetchData : () => { setSearch(''); navigate('/'); }}> {loadError ? 'Retry' : 'Show all items'}</button></div>}
            {!loading && visibleCount < mixedItems.length && <div className="customer-load-more" ref={moreRef}><button onClick={() => setVisibleCount(count => count + 10)}>Show more items</button></div>}
          </section>
        </>}
      </div>

      <dialog className="customer-location-dialog" ref={modalRef} onCancel={() => setShowLocationPrompt(false)} onClick={event => { if (event.target === modalRef.current) setShowLocationPrompt(false); }}>
        <div className="customer-location-dialog-content">
          <button className="customer-dialog-close" aria-label="Close location selection" onClick={() => setShowLocationPrompt(false)}><FiX size={22} /></button>
          <span className="customer-dialog-location-icon"><FiMapPin size={30} /></span>
          <h2>Delivery location</h2><p>Choose where you want your order delivered.</p>
          <button className="btn btn-primary btn-full" onClick={handleDetectLocation} disabled={locLoading}><FiMapPin />{locLoading ? 'Detecting location…' : 'Use my current location'}</button>
          <form onSubmit={event => {
            event.preventDefault();
            const name = new FormData(event.currentTarget).get('city').trim();
            if (!name) return;
            localStorage.removeItem('jdkart_coords');
            localStorage.setItem('jdkart_loc_name', name);
            setUserCoords(null);
            setLocationText(name);
            window.dispatchEvent(new Event('locationUpdated'));
            setShowLocationPrompt(false);
          }}>
            <label className="form-label" htmlFor="delivery-city">Or enter your city</label><input id="delivery-city" name="city" className="form-input" placeholder="City or area" defaultValue={locationText === 'Current Location' ? '' : locationText} key={locationText} required />
            <button type="submit" className="btn btn-secondary btn-full">Use this location</button>
          </form>
          {(userCoords || locationText) && <button className="customer-clear-location" onClick={clearLocation}>Remove current location</button>}
        </div>
      </dialog>
    </div>
  );
}

function HomeItemCard({ item, compact, qty, onAdd, onBuy, onUpdate }) {
  const hasVariants = Boolean(item.variants?.length);
  let price = item.price;
  let discountedPrice = item.discountedPrice;
  let prefix = '';
  if (!price && hasVariants) {
    const prices = item.variants.map(variant => variant.discountedPrice || variant.price).filter(value => value > 0);
    if (prices.length) { price = Math.min(...prices); discountedPrice = null; prefix = 'From '; }
  }
  const discount = discountedPrice && discountedPrice < price ? Math.round((1 - discountedPrice / price) * 100) : 0;
  const path = `/${item.isProduct ? 'product' : 'food'}/${item._id}`;
  const vendor = item.isProduct ? item.storeId?.name : item.restaurantId?.name;
  const [failedImage, setFailedImage] = useState(null);

  return (
    <article className={`customer-item-card ${compact ? 'compact' : ''}`}>
      <Link to={path} className="customer-item-link">
        <div className="customer-item-image">
          {item.image && failedImage !== item.image ? <img loading="lazy" src={item.image} alt={item.name} onError={() => setFailedImage(item.image)} /> : <span className="customer-image-fallback">{item.isProduct ? <FiShoppingBag /> : <MdOutlineRestaurant />}</span>}
          {!item.isProduct && <span className={`customer-veg-mark ${item.isVeg ? 'veg' : 'nonveg'}`} aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}><i /></span>}
          {discount > 0 && <span className="customer-discount">{discount}% OFF</span>}
        </div>
        <h3>{item.name}</h3><p className="customer-item-vendor">{vendor || item.category}</p>
        <div className="customer-item-price">{prefix}₹{discountedPrice || price}{!compact && discount > 0 && <del>₹{price}</del>}</div>
        {!compact && (item.offer || item.freeDelivery) && <span className="customer-item-offer">{item.offer || 'Free Delivery'}</span>}
      </Link>
      <div className="customer-item-actions">
        {qty > 0 ? <div className="customer-item-stepper"><button onClick={() => onUpdate(qty - 1)} aria-label={`Remove one ${item.name}`}>−</button><span>{qty}</span><button onClick={() => onUpdate(qty + 1)} aria-label={`Add one ${item.name}`}>+</button></div> : hasVariants ? <Link to={path} className="customer-add">ADD</Link> : <button className="customer-add" onClick={onAdd} disabled={!item.isAvailable} aria-label={`Add ${item.name} to cart`}>ADD</button>}
        {hasVariants ? <Link to={path} className="customer-buy">{item.isProduct ? 'Buy' : 'Order'}</Link> : <button className="customer-buy" onClick={onBuy} disabled={!item.isAvailable}>{item.isProduct ? 'Buy' : 'Order'}</button>}
      </div>
    </article>
  );
}
