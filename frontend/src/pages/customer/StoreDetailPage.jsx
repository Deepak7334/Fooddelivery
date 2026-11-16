import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiStar, FiShoppingBag, FiTag, FiArrowRight, FiSearch, FiX, FiMinus, FiPlus } from 'react-icons/fi';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './CustomerDetails.css';

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
          if (norm === 'grecery' || norm === 'grocerys') norm = 'grocery';
          if (norm === 'shope' || norm === 'shops') norm = 'shop';
          if (norm === 'biscuit' || norm === 'biscuts') norm = 'biscuits';
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
    addProductToCart({
      productId: product._id,
      foodId: product._id,
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

  return (
    <div className="customer-vendor-page">
      <header className="cd-vendor-header">
        <div className="container cd-vendor-summary">
          <div className="cd-vendor-image">
            {store.coverImage || store.image ? <img src={store.coverImage || store.image} alt={store.name} /> : <FiShoppingBag aria-hidden="true" />}
          </div>
          <div className="cd-vendor-info">
            <div className="cd-store-title">
              {store.image && <img className="cd-store-avatar" loading="lazy" src={store.image} alt={store.name} />}
              <h1>{store.name}</h1>
            </div>
            <div className="cd-vendor-meta">
              <span className="cd-rating">{store.rating?.toFixed(1)} <FiStar /></span>
              <span><FiClock /> {store.deliveryTime}</span>
              <span>₹{store.deliveryFee} delivery</span>
              {!store.isOpen && <span className="cd-status is-closed">Closed</span>}
            </div>
          </div>
        </div>
      </header>
      <div className="container cd-vendor-layout">
        {categories.length > 0 && (
          <aside className="cd-category-sidebar">
            <nav className="cd-category-list" aria-label="Product categories">
              {categories.map(cat => <button key={cat} onClick={() => scrollToCategory(cat)} aria-pressed={activeCategory === cat} className={`cd-chip${activeCategory === cat ? ' is-selected' : ''}`}>{cat}</button>)}
            </nav>
          </aside>
        )}
        <div className="cd-vendor-content">
          {Object.keys(filteredGrouped).length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><FiSearch /></div><h3>No products found</h3><p>Try a different search term</p></div>
          ) : (
            Object.entries(filteredGrouped).map(([cat, products]) => (
              <section key={cat} ref={el => { categoryRefs.current[cat] = el; }} className="cd-menu-section">
                <h2>{cat}</h2>
                <div className="cd-item-grid">
                  {products.map(product => (
                    <ProductCard key={product._id} product={product} qty={getQty(product._id)} onAdd={() => handleAdd(product)} onBuy={() => { handleAdd(product); navigate('/cart'); }} onUpdate={(qty) => {
                      if (qty <= 0) {
                        updateQuantity(product._id, 0);
                      } else {
                        updateQuantity(product._id, qty);
                      }
                    }} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
      {cartType === 'product' && cartStoreId === id && cartItems.length > 0 && (
        <div className="cd-vendor-cart">
          <button onClick={() => navigate('/cart')}>
            <span>{cartItems.reduce((s, i) => s + i.quantity, 0)} items · ₹{cartItems.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
            <span>View Cart <FiArrowRight /></span>
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
    <div className="cd-item-card">
      <Link to={`/product/${product._id}`} className="cd-card-link">
        <div className="cd-card-image">
          {product.image ? <img loading="lazy" src={product.image} alt={product.name} /> : <div className="cd-image-placeholder"><FiShoppingBag /></div>}
          <div className="cd-card-badges">
            {product.freeDelivery && <span className="cd-delivery-badge">Free Delivery</span>}
            {product.offer ? <span className="cd-offer"><FiTag /> {product.offer}</span> : discount > 0 ? <span className="cd-discount">{discount}% off</span> : null}
          </div>
        </div>
        <div className="cd-card-info">
          <h3>{product.name}</h3>
          {product.brand && <div className="cd-card-meta">{product.brand}</div>}
          {product.unit && <div className="cd-card-meta">{product.unit}</div>}
          <div className="cd-card-pricing">
            {dPrice ? <><strong>{prefix}₹{dPrice}</strong><span className="cd-original-price">₹{pPrice}</span></> : <strong>{prefix}₹{pPrice}</strong>}
          </div>
          {hasVariants && <div className="cd-card-meta">Sizes: {product.variants.map(v => v.weight).join(', ')}</div>}
        </div>
      </Link>
      <div className="cd-card-actions">
        {qty > 0 && !hasVariants ? (
          <div className="cd-card-quantity">
            <button aria-label={`Remove one ${product.name}`} onClick={() => updateQuantity(product._id, qty - 1)}><FiMinus /></button>
            <span>{qty}</span>
            <button aria-label={`Add one ${product.name}`} onClick={() => updateQuantity(product._id, qty + 1)}><FiPlus /></button>
          </div>
        ) : hasVariants ? (
          <>
            <Link to={`/product/${product._id}`} className="cd-action-add">ADD</Link>
            <Link to={`/product/${product._id}`} className="cd-action-primary">Buy</Link>
          </>
        ) : (
          <button onClick={onAdd} disabled={!product.isAvailable} className="cd-action-add">{product.isAvailable ? 'ADD' : 'Unavailable'}</button>
        )}
        {!hasVariants && <button onClick={onBuy} disabled={!product.isAvailable} className="cd-action-primary">Buy</button>}
      </div>
    </div>
  );
}
