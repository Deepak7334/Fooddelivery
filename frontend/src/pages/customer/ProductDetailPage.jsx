import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FiArrowLeft, FiHeart, FiMinus, FiPlus, FiTruck, FiShoppingBag, FiStar, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './CustomerDetails.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addProductToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
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
    <div className="customer-detail-page">
      <div className="cd-breadcrumb container">
        <button onClick={() => navigate(-1)}><FiArrowLeft /> Home</button>
        <span>/</span><span>{product.category || 'Products'}</span>
        <span>/</span><span>{product.name}</span>
      </div>
      <div className="container cd-detail-container">
        <div className="cd-detail-layout">
          <div className="cd-gallery">
            <div className="cd-hero">
              {activeImage ? <img src={activeImage} alt={product.name} /> : <div className="cd-image-placeholder"><FiShoppingBag /><span>No Image</span></div>}
              <button className="cd-circle-button cd-back" aria-label="Go back" onClick={() => navigate(-1)}><FiArrowLeft size={20} /></button>
              <button className="cd-circle-button cd-favorite" aria-label="Add to wishlist" onClick={() => toast.success('Added to Wishlist!')}><FiHeart size={20} /></button>
            </div>
            {product.images && product.images.length > 0 && (
              <div className="cd-thumbnails">
                {[product.image, ...product.images].filter(Boolean).map((img, i) => (
                  <button key={i} className={`cd-thumbnail${activeImage === img ? ' is-selected' : ''}`} onClick={() => setActiveImage(img)} aria-label={`View image ${i + 1}`} aria-pressed={activeImage === img}>
                    <img loading="lazy" src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cd-item-info">
            {product.brand && <div className="cd-brand">{product.brand}</div>}
            <h1>{product.name}</h1>
            <div className="cd-seller-line">
              <span><FiShoppingBag /> {product.storeId?.name || 'JDkart Premium Store'}</span>
              {product.category && <><span className="cd-meta">·</span><span className="cd-meta">{product.category}</span></>}
            </div>
            <div className="cd-pricing">
              <span className="cd-price">₹{finalPrice}</span>
              {originalPrice > finalPrice && <span className="cd-original-price">₹{originalPrice}</span>}
              {product.offer ? <span className="cd-offer"><FiTag /> {product.offer}</span> : discountPercent > 0 ? <span className="cd-discount">{discountPercent}% off</span> : null}
              <span className="cd-rating">{product.rating?.toFixed(1) || '4.0'} <FiStar /></span>
            </div>
            <div className="cd-price-meta">
              <span>Price for {selectedVariant ? selectedVariant.weight : (product.unit || '1 item')}</span>
              <span>{product.totalRatings || 0} Ratings</span>
              {product.freeDelivery && <span className="cd-delivery-badge">Free Delivery</span>}
            </div>
            <section className="cd-section">
              <h2>About this item</h2>
              <p>{product.description || 'No description available.'}</p>
            </section>
            <div className="cd-quality-row">
              <div><FiTruck /><div><strong>{product.storeId?.deliveryFee === 0 ? 'Free Delivery' : `Delivery: ₹${product.storeId?.deliveryFee ?? 30}`}</strong><span>{product.storeId?.deliveryTime || 'Available on all orders'}</span></div></div>
            </div>
            {product.offers && product.offers.length > 0 && (
              <section className="cd-section">
                <h2>Available offers</h2>
                <ul className="cd-offer-list">
                  {product.offers.map((offer, i) => <li key={i}><FiTag /><span>{offer}</span></li>)}
                </ul>
              </section>
            )}
            {product.variants && product.variants.length > 0 && (
              <section className="cd-section">
                <h2>Size</h2>
                <div className="cd-options">
                  {product.variants.map(v => {
                    const isAvailable = v.isAvailable && v.stock !== 0;
                    const vFinalPrice = v.discountedPrice || v.price;
                    return (
                      <button key={v.weight} disabled={!isAvailable} aria-pressed={selectedVariant?.weight === v.weight} onClick={() => isAvailable && setSelectedVariant(v)} className={`cd-option${selectedVariant?.weight === v.weight ? ' is-selected' : ''}`}>
                        <strong>{v.weight}</strong><span>₹{vFinalPrice}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <section className="cd-section cd-quantity-row">
              <h2>Quantity</h2>
              <div className="cd-quantity">
                <button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                <input type="text" aria-label="Quantity" value={quantity} readOnly />
                <button aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)}><FiPlus /></button>
              </div>
            </section>
            <section className="cd-section">
              <h2>Seller</h2>
              <span className="cd-seller-name">{product.storeId?.name || 'JDkart Premium Store'}</span>
              <p>GST invoice available</p>
            </section>
            <section className="cd-section">
              <h2>Specifications</h2>
              <table className="cd-specifications">
                <tbody>
                  {product.ingredients && <tr><th scope="row">Ingredients</th><td>{product.ingredients}</td></tr>}
                  {product.nutritionalInfo && <tr><th scope="row">Nutritional Info</th><td>{product.nutritionalInfo}</td></tr>}
                  {product.storageInstructions && <tr><th scope="row">Storage</th><td>{product.storageInstructions}</td></tr>}
                  {product.mfgDate && <tr><th scope="row">Mfg Date</th><td>{new Date(product.mfgDate).toLocaleDateString()}</td></tr>}
                  {product.expiryDate && <tr><th scope="row">Expiry Date</th><td>{new Date(product.expiryDate).toLocaleDateString()}</td></tr>}
                </tbody>
              </table>
            </section>
            <div className="cd-detail-actions">
              <button className="cd-action-add" onClick={handleAddToCart}>ADD</button>
              <button className="cd-action-primary" onClick={() => { handleAddToCart(); navigate('/cart'); }}>Buy · ₹{finalPrice * quantity}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
