import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const STORE_TYPES = [
  { key: 'all',         label: 'All Stores',    icon: '🏬', color: '#9E9E9E' },
  { key: 'grocery',     label: 'Grocery',        icon: '🛒', color: '#4CAF50' },
  { key: 'pharmacy',    label: 'Pharmacy',       icon: '💊', color: '#2196F3' },
  { key: 'electronics', label: 'Electronics',    icon: '📱', color: '#9C27B0' },
  { key: 'beauty',      label: 'Beauty',         icon: '🧴', color: '#E91E63' },
  { key: 'pets',        label: 'Pets',           icon: '🐾', color: '#FF9800' },
  { key: 'bakery',      label: 'Bakery',         icon: '🥐', color: '#FF5722' },
  { key: 'supermarket', label: 'Supermarket',    icon: '🏪', color: '#607D8B' },
  { key: 'stationery',  label: 'Stationery',     icon: '📚', color: '#795548' },
  { key: 'sports',      label: 'Sports',         icon: '⚽', color: '#00BCD4' },
];

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState('');
  const [type, setType] = useState(searchParams.get('type') || '');

  const { addProductToCart, cartItems, cartType, storeId: cartStoreId, updateQuantity } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    // eslint-disable-next-line
    if (!stores.length && !products.length) setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (type && type !== 'all') params.set('type', type);
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
  }, [search, sort, type]);

  const handleAddProduct = (product) => {
    addProductToCart(product, product.storeId?._id);
    toast.success('Added to cart');
  };

  const getProductQty = (productId, pStoreId) => {
    if (cartType !== 'product' || cartStoreId !== pStoreId) return 0;
    return cartItems.find(i => i.product?._id === productId)?.quantity || 0;
  };

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchSuggestions = search.trim() ? [
    ...products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => ({ ...p, itemType: 'product' })),
    ...stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => ({ ...s, itemType: 'store' }))
  ].slice(0, 6) : [];

  const typeInfo = STORE_TYPES.find(t => t.key === type);

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Header - Hidden when searching via URL */}
        {!searchParams.has('search') ? (
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
              All <span style={{ color: 'var(--primary)' }}>Stores</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Browse top shops and daily essentials</p>
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
                placeholder="🔍 Search stores or products..."
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
                        {s.itemType === 'product' ? '📦' : '🛒'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {s.itemType.charAt(0).toUpperCase() + s.itemType.slice(1)} 
                          {s.storeId?.name ? ` from ${s.storeId.name}` : ''}
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

            <select value={type} onChange={e => setType(e.target.value)} className="form-input" style={{ width: 'auto', padding: '12px 16px' }}>
              <option value="">All Categories</option>
              {STORE_TYPES.filter(t => t.key !== 'all').map(t => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </select>

            {type && type !== 'all' && (
              <button onClick={() => setType('')} className="btn btn-secondary btn-sm">
                {typeInfo?.label || type} ✕
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Stores Section */}
          {(!searchParams.has('search') || stores.length > 0) && (
            <div style={{ order: searchParams.has('search') ? 2 : 1, marginBottom: 40 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                {searchParams.has('search') ? 'Matching Stores' : searchParams.get('city') ? `Stores near ${searchParams.get('city')}` : searchParams.get('lat') ? `Stores near you` : 'Top Stores'}
              </h2>
              {loading ? (
                <div className="vendor-grid">
                  {Array(3).fill(0).map((_, i) => <div key={i} style={{ height: 280, borderRadius: 16 }} className="shimmer" />)}
                </div>
              ) : stores.length === 0 ? (
                searchParams.get('city') || searchParams.get('lat') ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 80, marginBottom: 24 }}>😔</div>
                    <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, marginBottom: 16 }}>
                      "our service not started in your area yet !! soon we expand it in your area"
                    </h2>
                    <button className="btn btn-primary" style={{ marginTop: 24, padding: '12px 28px' }} onClick={() => {
                      if (searchParams.get('lat')) localStorage.removeItem('jdkart_coords');
                      navigate('/stores');
                    }}>
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No stores found</p>
                  </div>
                )
              ) : (
                <div className="vendor-grid">
                  {stores.map(s => <StoreCard key={s._id} store={s} />)}
                </div>
              )}
            </div>
          )}

          {/* Products Section */}
          {(products.length > 0 || !searchParams.has('search')) && (
            <div style={{ order: searchParams.has('search') ? 1 : 2, marginBottom: 40 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                {searchParams.has('search') ? 'Matching Products' : 'Popular Products'}
              </h2>
              {loading ? (
                <div className="items-grid">
                  {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 160, borderRadius: 16 }} className="shimmer" />)}
                </div>
              ) : products.length === 0 ? (
                <div className="empty-state">
                  <p>No products found</p>
                </div>
              ) : (
                <div className="items-grid">
                  {products.map(product => (
                    <HomeProductCard 
                      key={product._id} 
                      product={product} 
                      qty={getProductQty(product._id, product.storeId?._id)}
                      onAdd={() => handleAddProduct(product)}
                      onUpdate={(qty) => updateQuantity(product._id, qty)}
                      onBuy={() => { if (!user) { navigate('/login'); return; } handleAddProduct(product); navigate('/cart'); }}
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

function StoreCard({ store }) {
  const typeInfo = STORE_TYPES.find(t => t.key === store.storeType) || STORE_TYPES[0];
  
  return (
    <Link to={`/stores/${store._id}`} className="card" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', height: 170, background: 'var(--bg-card2)' }}>
        {store.image ? (
          <img src={store.image} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{typeInfo.icon || '🏬'}</div>
        )}
        {!store.isOpen && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>Closed</div>}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
          ⭐ {store.rating?.toFixed(1)}
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{store.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{typeInfo.label}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{store.deliveryTime}</span>
          <span>₹{store.deliveryFee}</span>
          {store.minOrder > 0 && <span> Min ₹{store.minOrder}</span>}
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
    <div className="card item-card" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      <Link to={`/product/${product._id}`} className="item-link" style={{ display: 'flex', gap: 14, marginBottom: 14, textDecoration: 'none', color: 'inherit' }}>
        <div className="item-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, background: 'rgba(33,150,243,0.1)', color: '#2196F3', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
              Store Product
            </span>
            {discount > 0 && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>★ -{discount}% OFF</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{product.name}</div>
          {product.storeId && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {product.storeId.name}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {product.discountedPrice ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 15 }}>₹{product.discountedPrice}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{product.price}</span>
              </>
            ) : <span style={{ fontWeight: 800, fontSize: 15 }}>₹{product.price}</span>}
          </div>
        </div>
        <div className="item-img" style={{ width: 90, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {product.image ? (
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>
          )}
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {qty > 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, padding: '4px 8px', height: 36 }}>
            <button onClick={() => onUpdate(qty - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => onUpdate(qty + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>+</button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            disabled={!product.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: product.isAvailable ? 'rgba(255,87,34,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${product.isAvailable ? 'rgba(255,87,34,0.3)' : 'var(--border)'}`, borderRadius: 8, color: product.isAvailable ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', height: 36 }}
          >
            {product.isAvailable ? '+ Cart' : 'Unavailable'}
          </button>
        )}
        <button onClick={onBuy} disabled={!product.isAvailable}
          style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', opacity: product.isAvailable ? 1 : 0.5, height: 36 }}>
          Buy
        </button>
      </div>
    </div>
  );
}
