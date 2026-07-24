import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FiArrowLeft, FiHeart, FiShare2, FiMinus, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function FoodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selections
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/customer/foods')
      .then(res => {
        const item = res.data.foods?.find(f => f._id === id);
        if (item) {
          setFood(item);
          setActiveImage(item.image || (item.images?.[0] || ''));
          // Default variant selection
          if (item.variants && item.variants.length > 0) {
            const available = item.variants.find(v => v.isAvailable);
            if (available) setSelectedVariant(available);
          }
          if (item.spiceLevels && item.spiceLevels.length > 0) {
            setSpiceLevel(item.spiceLevels[0]);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loading-spinner"></div></div>;
  if (!food) return <div className="page-wrapper"><div className="container" style={{ textAlign: 'center', marginTop: 100 }}><h2>Food not found</h2><button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button></div></div>;

  let pPrice = food.price;
  let dPrice = food.discountedPrice;
  if (selectedVariant) {
    pPrice = selectedVariant.price;
    dPrice = selectedVariant.discountedPrice;
  }

  const basePrice = dPrice || pPrice;
  const originalPrice = pPrice;
  const discountPercent = (originalPrice > basePrice) ? Math.round(((originalPrice - basePrice) / originalPrice) * 100) : 0;
  
  const addOnsPrice = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const finalPrice = basePrice + addOnsPrice;

  const handleAddOnToggle = (addon) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.name === addon.name);
      if (exists) return prev.filter(a => a.name !== addon.name);
      return [...prev, addon];
    });
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(food, food.restaurantId?._id, food.restaurantId?.name, {
        variantName: selectedVariant?.name,
        addOns: selectedAddOns,
        spiceLevel,
        computedPrice: finalPrice
      });
    }
  };

  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header Navigation / Breadcrumbs */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }}>
            <FiArrowLeft size={16} /> Home
          </button>
          <span>❯</span>
          <span>{food.restaurantId?.name || 'Restaurant'}</span>
          <span>❯</span>
          <span>{food.category || 'Category'}</span>
          <span>❯</span>
          <span style={{ color: 'var(--text-primary)' }}>{food.name}</span>
        </div>
      </div>

      <div className="container" style={{ marginTop: 16 }}>
        <div className="details-layout" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 2 }}>
          
          {/* Left Column - Images */}
          <div className="sticky-col">
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Thumbnails */}
              {food.images && food.images.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 64 }}>
                  {[food.image, ...food.images].filter(Boolean).map((img, i) => (
                    <div key={i} onClick={() => setActiveImage(img)} style={{ width: 64, height: 64, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', border: activeImage === img ? '2px solid var(--primary)' : '1px solid var(--border)', padding: 2 }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  ))}
                </div>
              )}
              {/* Main Image */}
              <div style={{ flex: 1, height: 400, border: '1px solid var(--border)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <button style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} onClick={() => toast.success('Added to Wishlist!')}>
                  <FiHeart size={18} />
                </button>
                {activeImage ? <img src={activeImage} alt={food.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ color: 'var(--text-muted)' }}>No Image</div>}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingLeft: food.images && food.images.length > 0 ? 80 : 0 }}>
              <button onClick={handleAddToCart} style={{ flex: 1, padding: '16px 8px', background: 'var(--secondary)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,.2)' }}>
                + Cart
              </button>
              <button onClick={() => { if (!user) { navigate('/login'); return; } handleAddToCart(); navigate('/cart'); }} style={{ flex: 1, padding: '16px 8px', background: 'var(--primary-dark)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,.2)' }}>
                Order
              </button>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div style={{ paddingLeft: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ border: `1px solid ${food.isVeg ? 'var(--success)' : 'var(--danger)'}`, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 2 }}>
                <span style={{ background: food.isVeg ? 'var(--success)' : 'var(--danger)', width: 10, height: 10, borderRadius: '50%' }}></span>
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{food.category}</span>
            </div>
            
            <h1 style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.4, margin: 0 }}>{food.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <span style={{ background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {food.rating?.toFixed(1) || '4.0'} ★
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>{food.totalRatings || 0} Ratings</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Price for {selectedVariant ? selectedVariant.name : '1 item'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>₹{basePrice}</span>
                {(originalPrice > basePrice) && (
                  <span style={{ fontSize: 16, color: '#878787', textDecoration: 'line-through' }}>₹{originalPrice}</span>
                )}
                {food.offer ? (
                  <span style={{ background: '#388E3C', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 4, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 4 }}>🏷️ {food.offer}</span>
                ) : discountPercent > 0 ? (
                  <span style={{ color: '#388E3C', fontSize: 16, fontWeight: 600 }}>{discountPercent}% off</span>
                ) : null}
              </div>
            </div>

            {/* Warranty & Delivery */}
            <div style={{ display: 'flex', gap: 32, marginTop: 24, fontSize: 14, color: 'var(--text-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: 'var(--bg-card2)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 18 }}>⏱️</div>
                <div><div style={{ fontWeight: 600 }}>{ (finalPrice * quantity) < 30 ? 'Delivery: ₹5' : 'Delivery: ₹10' }</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>30-45 mins</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: 'var(--bg-card2)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 18 }}>🍽️</div>
                <div><div style={{ fontWeight: 600 }}>Freshly Prepared</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Hot & Tasty</div></div>
              </div>
            </div>

            {/* Variants */}
            {food.variants && food.variants.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, width: 80 }}>Size</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {food.variants.map(v => {
                    const vFinalPrice = v.discountedPrice || v.price;
                    return (
                      <div key={v.name} onClick={() => v.isAvailable && setSelectedVariant(v)} style={{ border: selectedVariant?.name === v.name ? '2px solid var(--primary)' : '1px solid var(--border)', background: selectedVariant?.name === v.name ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent', color: selectedVariant?.name === v.name ? 'var(--primary)' : 'var(--text-primary)', opacity: v.isAvailable ? 1 : 0.4, borderRadius: 4, padding: '10px 16px', cursor: v.isAvailable ? 'pointer' : 'not-allowed', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, transition: '0.2s' }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{v.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedVariant?.name === v.name ? 'var(--primary)' : 'var(--text-secondary)', marginTop: 4 }}>₹{vFinalPrice}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {food.addOns && food.addOns.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, width: 80 }}>Add-ons</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {food.addOns.map(a => {
                    const isSelected = selectedAddOns.find(sel => sel.name === a.name);
                    return (
                      <div key={a.name} onClick={() => a.isAvailable && handleAddOnToggle(a)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 2, cursor: a.isAvailable ? 'pointer' : 'not-allowed', opacity: a.isAvailable ? 1 : 0.5, background: isSelected ? 'var(--bg-card2)' : 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input type="checkbox" checked={!!isSelected} readOnly style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{a.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>+₹{a.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spice Levels */}
            {food.spiceLevels && food.spiceLevels.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, width: 80 }}>Spice</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {food.spiceLevels.map(lvl => (
                    <button key={lvl} onClick={() => setSpiceLevel(lvl)} style={{ padding: '6px 16px', borderRadius: 100, border: spiceLevel === lvl ? 'none' : '1px solid var(--border)', background: spiceLevel === lvl ? 'var(--primary)' : 'var(--bg-card)', color: spiceLevel === lvl ? 'var(--bg-card)' : 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, width: 80 }}>Quantity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>−</button>
                <input type="text" value={quantity} readOnly style={{ width: 48, height: 32, border: '1px solid var(--border)', textAlign: 'center', fontWeight: 600, fontSize: 14, outline: 'none' }} />
                <button onClick={() => setQuantity(quantity + 1)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>+</button>
              </div>
            </div>
            
            {/* Seller */}
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, width: 80 }}>Seller</div>
              <div style={{ fontSize: 14 }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{food.restaurantId?.name || 'Restaurant'}</span>
                <ul style={{ margin: 0, paddingLeft: 16, marginTop: 8, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  <li>Fresh and hygienic preparation</li>
                </ul>
              </div>
            </div>
            
            {/* Description */}
            <div style={{ marginTop: 32, border: '1px solid var(--border)', borderRadius: 2 }}>
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 16 }}>Item Description</h3>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{food.description || 'A delicious treat freshly prepared for you.'}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
