import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const STORE_TYPE_ICONS = {
  grocery: '🛒', pharmacy: '💊', electronics: '📱', beauty: '🧴',
  pets: '🐾', bakery: '🥐', supermarket: '🏪', stationery: '📚', sports: '⚽', other: '🏬',
};

export default function StoreDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addProductToCart, cartItems, cartType, storeId: cartStoreId, updateQuantity } = useCart();

  const [store, setStore] = useState(null);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const categoryRefs = useRef({});

  useEffect(() => {
    api.get(`/store/stores/${id}`)
      .then(res => {
        setStore(res.data.store);
        
        const rawGrouped = res.data.grouped || {};
        const cleanGrouped = {};
        
        Object.keys(rawGrouped).forEach(key => {
          let norm = key.trim().toLowerCase();
          
          // Fix common typos
          if (norm === 'grecery' || norm === 'grocerys') norm = 'grocery';
          if (norm === 'shope' || norm === 'shops') norm = 'shop';
          if (norm === 'biscuit' || norm === 'biscuts') norm = 'biscuits';
          
          // Capitalize first letter
          norm = norm.charAt(0).toUpperCase() + norm.slice(1);
          
          if (!cleanGrouped[norm]) {
            cleanGrouped[norm] = [];
          }
          cleanGrouped[norm] = cleanGrouped[norm].concat(rawGrouped[key]);
        });
        
        setGrouped(cleanGrouped);
        const cats = Object.keys(cleanGrouped);
        if (cats.length) setActiveCategory(cats[0]);
      })
      .catch(() => toast.error('Store not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const getQty = (productId) => {
    if (cartType !== 'product' || cartStoreId !== id) return 0;
    return cartItems.find(i => i.productId === productId)?.quantity || 0;
  };

  const handleAdd = (product) => {
    if (!user) { navigate('/login'); return; }
    addProductToCart({
      productId: product._id,
      foodId: product._id, // alias for checkout compatibility
      name: product.name,
      price: product.discountedPrice || product.price,
      image: product.image,
      unit: product.unit,
    }, id, store.name);
  };

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    const el = categoryRefs.current[cat];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categories = Object.keys(grouped);

  // Filter products by search
  const filteredGrouped = search
    ? Object.fromEntries(
        Object.entries(grouped)
          .map(([cat, prods]) => [cat, prods.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()))])
          .filter(([, prods]) => prods.length > 0)
      )
    : grouped;

  if (loading) return (
    <div style={{ paddingTop: 70, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!store) return null;

  const icon = STORE_TYPE_ICONS[store.storeType];

  return (
    <div style={{ paddingTop: 70, minHeight: '100vh' }}>
      {/* Store Header */}
      <div style={{ position: 'relative', height: 200, background: 'linear-gradient(135deg, #0a1628, #16213e)', overflow: 'hidden' }}>
        {store.coverImage || store.image ? (
          <img src={store.coverImage || store.image} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>{icon}</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
        <div className="container" style={{ position: 'absolute', bottom: 20, left: 0, right: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            {store.image && (
              <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                <img src={store.image} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{store.name}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.8)', flexWrap: 'wrap' }}>
                <span>⭐ {store.rating?.toFixed(1)}</span>
                <span>⏱ {store.deliveryTime}</span>
                <span>₹{store.deliveryFee} delivery</span>
                {!store.isOpen && <span style={{ color: '#F44336', fontWeight: 700 }}>● Closed</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 0, background: 'var(--bg-dark)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', maxWidth: 400 }}>
            <span style={{ padding: '0 14px', display: 'flex', alignItems: 'center' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search in ${store.name}…`}
              style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ padding: '0 14px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>}
          </div>
        </div>
      </div>

      <div className="container" style={{ display: 'flex', gap: 24, padding: '24px 16px', alignItems: 'flex-start' }}>
        {/* Category sidebar — desktop */}
        {categories.length > 0 && (
          <div style={{ width: 180, flexShrink: 0, position: 'sticky', top: 130, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', scrollbarWidth: 'none' }}
            className="desktop-nav" style2={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => scrollToCategory(cat)} style={{
                  padding: '9px 14px', borderRadius: 8, textAlign: 'left', fontWeight: 600, fontSize: 13,
                  background: activeCategory === cat ? 'rgba(255,87,34,0.1)' : 'transparent',
                  color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                  border: activeCategory === cat ? '1px solid rgba(255,87,34,0.2)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile horizontal category tabs */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4, scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => scrollToCategory(cat)} style={{
                  padding: '7px 14px', borderRadius: 100, whiteSpace: 'nowrap', fontWeight: 600, fontSize: 12,
                  background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                  color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {Object.keys(filteredGrouped).length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48 }}>🔍</div>
              <h3>No products found</h3>
              <p>Try a different search term</p>
            </div>
          ) : (
            Object.entries(filteredGrouped).map(([cat, products]) => (
              <div key={cat} ref={el => { categoryRefs.current[cat] = el; }} style={{ marginBottom: 36, scrollMarginTop: 160 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>{cat}</h2>
                <div className="items-grid-small">
                  {products.map(product => (
                    <ProductCard key={product._id} product={product} qty={getQty(product._id)} onAdd={() => handleAdd(product)} onBuy={() => { if (!user) { navigate('/login'); return; } handleAdd(product); navigate('/cart'); }} onUpdate={(qty) => {
                      if (!user) { navigate('/login'); return; }
                      if (qty <= 0) {
                        updateQuantity(product._id, 0);
                      } else {
                        updateQuantity(product._id, qty);
                      }
                    }} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating cart button */}
      {cartType === 'product' && cartStoreId === id && cartItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <button
            onClick={() => navigate('/cart')}
            className="btn btn-primary"
            style={{ padding: '14px 32px', borderRadius: 100, fontSize: 16, fontWeight: 700, boxShadow: '0 8px 32px rgba(255,87,34,0.4)', display: 'flex', gap: 12, alignItems: 'center' }}
          >
            <span></span>
            <span>{cartItems.reduce((s, i) => s + i.quantity, 0)} items</span>
            <span>·</span>
            <span>₹{cartItems.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
            <span>→ View Cart</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, qty, onAdd, onBuy }) {
  const { updateQuantity } = useCart();
  const hasVariants = product.variants && product.variants.length > 0;

  let pPrice = product.price;
  let dPrice = product.discountedPrice;
  let prefix = '';

  if ((!pPrice || pPrice === 0) && hasVariants) {
    const prices = product.variants.map(v => v.discountedPrice || v.price).filter(p => p > 0);
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
      
      <Link to={`/product/${product._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
        {/* Image */}
        <div style={{ height: 130, borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: 'var(--bg-dark)', position: 'relative' }}>
          {product.image ? (
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>
          )}
          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            {product.freeDelivery && (
              <div style={{ background: 'linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%)', color: '#059669', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                Free Delivery
              </div>
            )}
            {product.offer ? (
              <div style={{ background: 'linear-gradient(90deg, #F0F9FF 0%, #E0F2FE 100%)', color: '#0369A1', border: '1px dashed #7DD3FC', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                🏷️ {product.offer}
              </div>
            ) : discount > 0 ? (
              <div style={{ background: '#388E3C', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                {discount}% off
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, lineHeight: 1.3 }}>{product.name}</div>
        {product.brand && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{product.brand}</div>}
        {product.unit && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{product.unit}</div>}

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
        {hasVariants && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Sizes: {product.variants.map(v => v.weight).join(', ')}
          </div>
        )}
      </Link>

      {/* Add / Qty stepper */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {qty > 0 && !hasVariants ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, padding: '4px 8px', height: 36 }}>
            <button onClick={() => updateQuantity(product._id, qty - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => updateQuantity(product._id, qty + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer', fontWeight: 700, width: 28, height: 28 }}>+</button>
          </div>
        ) : hasVariants ? (
          <>
            <Link to={`/product/${product._id}`} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, boxSizing: 'border-box' }}>
              + Cart
            </Link>
            <Link to={`/product/${product._id}`} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, boxSizing: 'border-box' }}>
              Buy
            </Link>
          </>
        ) : (
          <button
            onClick={onAdd}
            disabled={!product.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: product.isAvailable ? 'rgba(255,87,34,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${product.isAvailable ? 'rgba(255,87,34,0.3)' : 'var(--border)'}`, borderRadius: 8, color: product.isAvailable ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', height: 36 }}
          >
            {product.isAvailable ? '+ Cart' : 'Unavailable'}
          </button>
        )}
        {!hasVariants && (
          <button onClick={onBuy} disabled={!product.isAvailable}
            style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: product.isAvailable ? 'pointer' : 'not-allowed', opacity: product.isAvailable ? 1 : 0.5, height: 36 }}>
            Buy
          </button>
        )}
      </div>
    </div>
  );
}
