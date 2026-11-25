import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useMemo } from 'react';
import { getVendorDistance, formatDistance } from '../../utils/distance';
import { FiClock, FiMapPin, FiPackage, FiSearch, FiShoppingBag, FiStar, FiX } from 'react-icons/fi';
import './CustomerBrowse.css';

const STORE_TYPES = [
  { key: 'all', label: 'All Categories' },
  { key: 'grocery', label: 'Grocery' },
  { key: 'stationery', label: 'Stationery' },
  { key: 'bakery', label: 'Bakery' },
];

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('');
  const [type, setType] = useState(searchParams.get('type') || '');

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

  const { addProductToCart, cartItems, cartType, storeId: cartStoreId, updateQuantity } = useCart();
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
    if (!stores.length && !products.length) setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (sort) params.set('sort', sort);
    if (type && type !== 'all') {
      params.set('type', type);
      params.set('category', type);
    }
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
      api.get(`/store/stores?${params}`),
      api.get(`/store/products?${params}`)
    ])
      .then(([storeRes, prodRes]) => {
        const fetchedStores = storeRes.data.stores || [];
        setStores(fetchedStores);
        
        // Do not filter products by city/geo. Always show popular products regardless of location match as requested by user.
        setProducts(prodRes.data.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [debouncedSearch, sort, type]);

  // Sort stores with support for Nearest / Distance
  const displayedStores = useMemo(() => {
    if (!stores || stores.length === 0) return [];
    let list = [...stores];
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
  }, [stores, sort, userCoords]);

  // Filter & sort products for Grocery & Stores page
  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (type && type !== 'all') {
      const target = type.toLowerCase();
      list = list.filter(p => {
        const cat = (p.category || '').toLowerCase();
        const storeType = (p.storeId?.storeType || '').toLowerCase();
        return cat.includes(target) || storeType.includes(target);
      });
    }
    if (sort === 'rating') {
      list.sort((a, b) => (b.rating || b.storeId?.rating || 0) - (a.rating || a.storeId?.rating || 0));
    } else if (sort === 'deliveryFee') {
      list.sort((a, b) => (a.storeId?.deliveryFee || 0) - (b.storeId?.deliveryFee || 0));
    } else if (sort === 'deliveryTime') {
      list.sort((a, b) => {
        const timeA = parseInt(a.storeId?.deliveryTime) || 30;
        const timeB = parseInt(b.storeId?.deliveryTime) || 30;
        return timeA - timeB;
      });
    } else if (sort === 'nearest' && userCoords) {
      list.sort((a, b) => {
        const distA = a.storeId ? getVendorDistance(a.storeId, userCoords) : null;
        const distB = b.storeId ? getVendorDistance(b.storeId, userCoords) : null;
        if (distA != null && distB != null) return distA - distB;
        if (distA != null) return -1;
        if (distB != null) return 1;
        return 0;
      });
    }
    return list;
  }, [products, type, sort, userCoords]);

  const handleAddProduct = (product) => {
    addProductToCart(product, product.storeId?._id);
    toast.success('Added to cart');
  };

  const getProductQty = (productId, pStoreId) => {
    if (cartType !== 'product' || cartStoreId !== pStoreId) return 0;
    return cartItems.find(i => i.product?._id === productId)?.quantity || 0;
  };

  const typeInfo = STORE_TYPES.find(t => t.key === type);

  return (
    <div className="page-wrapper customer-browse">
      <div className="container">
        <header className="browse-header">
          {!searchParams.has('search') ? (
            <>
              <h1>Grocery & Stores</h1>
              <p>Browse top shops and daily essentials</p>
            </>
          ) : (
            <h1>Search Results for <span>"{searchParams.get('search')}"</span></h1>
          )}
        </header>

        <div className="browse-filters browse-filters-right">
          <select value={sort} onChange={e => setSort(e.target.value)} className={`browse-filter${sort ? ' is-active' : ''}`} aria-label="Sort stores and products">
            <option value="">Sort by</option>
            <option value="nearest">Nearest</option>
            <option value="rating">Rating</option>
            <option value="deliveryTime">Delivery Time</option>
            <option value="deliveryFee">Delivery Fee</option>
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className={`browse-filter${type && type !== 'all' ? ' is-active' : ''}`} aria-label="Store category">
            <option value="">All Categories</option>
            {STORE_TYPES.filter(t => t.key !== 'all').map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          {type && type !== 'all' && (
            <button onClick={() => setType('')} className="browse-filter is-active" aria-label={`Clear ${typeInfo?.label || type} filter`}>
              {typeInfo?.label || type} <FiX size={14} aria-hidden="true" />
            </button>
          )}
          {searchParams.has('search') && (
            <button onClick={() => navigate('/stores')} className="browse-filter is-active" aria-label="Clear search">
              Search: "{searchParams.get('search')}" <FiX size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="browse-sections">
          {/* Popular / Matching Products */}
          <section className="browse-section">
            <h2>{searchParams.has('search') ? 'Matching Products' : 'Popular Products'}</h2>
            {loading ? (
              <div className="browse-product-grid" aria-label="Loading products" aria-busy="true">
                {Array(6).fill(0).map((_, i) => <div key={i} className="shimmer browse-skeleton" />)}
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="browse-empty"><p>No products found</p></div>
            ) : (
              <div className="browse-product-grid">
                {displayedProducts.map(product => (
                  <HomeProductCard
                    key={product._id}
                    product={product}
                    qty={getProductQty(product._id, product.storeId?._id)}
                    onAdd={() => handleAddProduct(product)}
                    onUpdate={(qty) => updateQuantity(product._id, qty)}
                    onBuy={() => { handleAddProduct(product); navigate('/cart'); }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Matching Stores ONLY when actively searching and matching stores exist */}
          {searchParams.has('search') && stores.length > 0 && (
            <section className="browse-section">
              <h2>Matching Stores</h2>
              <div className="browse-vendor-grid">
                {displayedStores.map(s => <StoreCard key={s._id} store={s} userCoords={userCoords} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreCard({ store, userCoords }) {
  const typeInfo = STORE_TYPES.find(t => t.key === store.storeType) || STORE_TYPES[0];
  const dist = getVendorDistance(store, userCoords);
  const distStr = formatDistance(dist);
  
  return (
    <Link to={`/stores/${store._id}`} className="browse-vendor-card">
      <div className="browse-vendor-image">
        {store.image ? (
          <img loading="lazy" src={store.image} alt={store.name} />
        ) : (
          <div className="browse-image-placeholder"><FiShoppingBag size={38} aria-hidden="true" /></div>
        )}
        {!store.isOpen && <div className="browse-closed">Closed</div>}
        {distStr && <span className="browse-distance"><FiMapPin size={12} aria-hidden="true" /> {distStr}</span>}
      </div>
      <div className="browse-vendor-details">
        <div className="browse-vendor-title">
          <h3>{store.name}</h3>
          <span className="browse-rating"><FiStar size={12} aria-hidden="true" /> {store.rating?.toFixed(1)}</span>
        </div>
        <p>{typeInfo.label}</p>
        <div className="browse-vendor-meta">
          <span><FiClock size={13} aria-hidden="true" /> {store.deliveryTime}</span>
          <span>₹{store.deliveryFee} delivery</span>
          {store.minOrder > 0 && <span>Min ₹{store.minOrder}</span>}
        </div>
      </div>
    </Link>
  );
}

function HomeProductCard({ product, qty, onAdd, onUpdate, onBuy }) {
  const discount = product.discountedPrice && product.discountedPrice < product.price
    ? Math.round((1 - product.discountedPrice / product.price) * 100)
    : 0;

  return (
    <article className="browse-product-card">
      <Link to={`/product/${product._id}`} className="browse-product-link">
        <div className="browse-product-image">
          {product.image ? (
            <img loading="lazy" src={product.image} alt={product.name} />
          ) : (
            <div className="browse-image-placeholder"><FiPackage size={30} aria-hidden="true" /></div>
          )}
          {discount > 0 && <span className="browse-discount">{discount}% OFF</span>}
        </div>
        <div className="browse-product-details">
          <div className="browse-badges"><span className="browse-chip">Store Product</span></div>
          <h3>{product.name}</h3>
          {product.storeId && <p className="browse-product-vendor">from {product.storeId.name}</p>}
          <div className="browse-price">
            {product.discountedPrice ? (
              <><strong>₹{product.discountedPrice}</strong><del>₹{product.price}</del></>
            ) : <strong>₹{product.price}</strong>}
          </div>
        </div>
      </Link>
      <div className="browse-product-actions">
        {qty > 0 ? (
          <div className="browse-quantity">
            <button onClick={() => onUpdate(qty - 1)} aria-label={`Remove one ${product.name}`}>−</button>
            <span>{qty}</span>
            <button onClick={() => onUpdate(qty + 1)} aria-label={`Add one ${product.name}`}>+</button>
          </div>
        ) : (
          <button onClick={onAdd} disabled={!product.isAvailable} className="browse-add">
            {product.isAvailable ? 'ADD' : 'Unavailable'}
          </button>
        )}
        <button onClick={onBuy} disabled={!product.isAvailable} className="browse-buy">Buy</button>
      </div>
    </article>
  );
}
