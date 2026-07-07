import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { FiArrowLeft, FiHeart, FiShare2, FiMinus, FiPlus, FiInfo, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addProductToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selections
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/store/products')
      .then(res => {
        const item = res.data.products?.find(p => p._id === id);
        if (item) {
          setProduct(item);
          setActiveImage(item.image || (item.images?.[0] || ''));
          if (item.variants && item.variants.length > 0) {
            const available = item.variants.find(v => v.isAvailable && v.stock !== 0);
            if (available) setSelectedVariant(available);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loading-spinner"></div></div>;
  if (!product) return <div className="page-wrapper"><div className="container" style={{ textAlign: 'center', marginTop: 100 }}><h2>Product not found</h2><button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button></div></div>;

  let pPrice = product.price;
  let dPrice = product.discountedPrice;
  if (selectedVariant) {
    pPrice = selectedVariant.price;
    dPrice = selectedVariant.discountedPrice;
  }

  const basePrice = dPrice || pPrice;
  const originalPrice = pPrice;
  const discountPercent = (originalPrice > basePrice) ? Math.round(((originalPrice - basePrice) / originalPrice) * 100) : 0;
  
  const finalPrice = basePrice;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addProductToCart(product, product.storeId?._id, product.storeId?.name, {
        variantName: selectedVariant?.weight || product.unit,
        computedPrice: basePrice
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
          <span>{product.category || 'Products'}</span>
          <span>❯</span>
          <span style={{ color: 'var(--text-primary)' }}>{product.name}</span>
        </div>
      </div>

      <div className="container" style={{ marginTop: 16 }}>
        <div className="details-layout" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 2 }}>
          
          {/* Left Column - Images */}
          <div className="sticky-col">
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Thumbnails */}
              {product.images && product.images.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 64 }}>
                  {[product.image, ...product.images].filter(Boolean).map((img, i) => (
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
                {activeImage ? <img src={activeImage} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ color: 'var(--text-muted)' }}>No Image</div>}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingLeft: product.images && product.images.length > 0 ? 80 : 0 }}>
              <button onClick={handleAddToCart} style={{ flex: 1, padding: '16px 8px', background: 'var(--secondary)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,.2)' }}>
                ADD TO CART
              </button>
              <button onClick={() => { handleAddToCart(); navigate('/cart'); }} style={{ flex: 1, padding: '16px 8px', background: 'var(--primary-dark)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 1px 2px 0 rgba(0,0,0,.2)' }}>
                BUY NOW
              </button>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div style={{ paddingLeft: 16 }}>
            {product.brand && <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{product.brand}</div>}
            <h1 style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.4, margin: 0 }}>{product.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <span style={{ background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {product.rating?.toFixed(1) || '4.0'} ★
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>{product.totalRatings || 0} Ratings</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Price for {selectedVariant ? selectedVariant.weight : (product.unit || '1 item')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>₹{finalPrice}</span>
                {(originalPrice > finalPrice) && (
                  <span style={{ fontSize: 16, color: '#878787', textDecoration: 'line-through' }}>₹{originalPrice}</span>
                )}
                {product.offer ? (
                  <span style={{ background: '#388E3C', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 4, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 4 }}>🏷️ {product.offer}</span>
                ) : discountPercent > 0 ? (
                  <span style={{ color: '#388E3C', fontSize: 16, fontWeight: 600 }}>{discountPercent}% off</span>
                ) : null}
              </div>
            </div>

            {/* Available Offers */}
            {product.offers && product.offers.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Available offers</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
                  {product.offers.map((offer, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8 }}>
                      <img src="https://rukminim2.flixcart.com/www/36/36/promos/06/09/2016/c22c9fc4-0555-4460-8401-bf5c28d7ba29.png?q=90" width="18" height="18" alt="tag" />
                      <span>{offer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warranty & Delivery */}
            <div style={{ display: 'flex', gap: 32, marginTop: 24, fontSize: 14, color: 'var(--text-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: 'var(--bg-card2)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>📦</div>
                <div><div style={{ fontWeight: 600 }}>{ (finalPrice * quantity) < 30 ? 'Delivery: ₹5' : 'Delivery: ₹10' }</div><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Available on all orders</div></div>
              </div>
            </div>

            {/* Size Variants */}
            {product.variants && product.variants.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 24 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, width: 80 }}>Size</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {product.variants.map(v => {
                    const isAvailable = v.isAvailable && v.stock !== 0;
                    const vFinalPrice = v.discountedPrice || v.price;
                    return (
                      <div key={v.weight} onClick={() => isAvailable && setSelectedVariant(v)} style={{ border: selectedVariant?.weight === v.weight ? '2px solid var(--primary)' : '1px solid var(--border)', background: selectedVariant?.weight === v.weight ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent', color: selectedVariant?.weight === v.weight ? 'var(--primary)' : 'var(--text-primary)', opacity: isAvailable ? 1 : 0.4, borderRadius: 4, padding: '10px 16px', cursor: isAvailable ? 'pointer' : 'not-allowed', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, transition: '0.2s' }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{v.weight}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedVariant?.weight === v.weight ? 'var(--primary)' : 'var(--text-secondary)', marginTop: 4 }}>₹{vFinalPrice}</span>
                      </div>
                    );
                  })}
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
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{product.storeId?.name || 'JDkart Premium Store'}</span>
                <ul style={{ margin: 0, paddingLeft: 16, marginTop: 8, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  <li>GST invoice available</li>
                </ul>
              </div>
            </div>

            {/* Description & Details */}
            <div style={{ marginTop: 32, border: '1px solid var(--border)', borderRadius: 2 }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 16 }}>Product Description</h3>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{product.description || 'No description available.'}</p>
              </div>
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 16 }}>Specifications</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    {product.ingredients && <tr><td style={{ color: 'var(--text-secondary)', width: '30%', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>Ingredients</td><td style={{ color: 'var(--text-primary)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{product.ingredients}</td></tr>}
                    {product.nutritionalInfo && <tr><td style={{ color: 'var(--text-secondary)', width: '30%', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>Nutritional Info</td><td style={{ color: 'var(--text-primary)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{product.nutritionalInfo}</td></tr>}
                    {product.storageInstructions && <tr><td style={{ color: 'var(--text-secondary)', width: '30%', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>Storage</td><td style={{ color: 'var(--text-primary)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{product.storageInstructions}</td></tr>}
                    {product.mfgDate && <tr><td style={{ color: 'var(--text-secondary)', width: '30%', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>Mfg Date</td><td style={{ color: 'var(--text-primary)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{new Date(product.mfgDate).toLocaleDateString()}</td></tr>}
                    {product.expiryDate && <tr><td style={{ color: 'var(--text-secondary)', width: '30%', padding: '8px 0' }}>Expiry Date</td><td style={{ color: 'var(--text-primary)', padding: '8px 0' }}>{new Date(product.expiryDate).toLocaleDateString()}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
