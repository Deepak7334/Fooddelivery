import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FiArrowLeft, FiHeart, FiMinus, FiPlus, FiClock, FiShield, FiShoppingBag, FiStar, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './CustomerDetails.css';

export default function FoodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
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
    <div className="customer-detail-page">
      <div className="cd-breadcrumb container">
        <button onClick={() => navigate(-1)}><FiArrowLeft /> Home</button>
        <span>/</span><span>{food.restaurantId?.name || 'Restaurant'}</span>
        <span>/</span><span>{food.category || 'Category'}</span>
        <span>/</span><span>{food.name}</span>
      </div>
      <div className="container cd-detail-container">
        <div className="cd-detail-layout">
          <div className="cd-gallery">
            <div className="cd-hero">
              {activeImage ? <img src={activeImage} alt={food.name} /> : <div className="cd-image-placeholder"><FiShoppingBag /><span>No Image</span></div>}
              <button className="cd-circle-button cd-back" aria-label="Go back" onClick={() => navigate(-1)}><FiArrowLeft size={20} /></button>
              <button className="cd-circle-button cd-favorite" aria-label="Add to wishlist" onClick={() => toast.success('Added to Wishlist!')}><FiHeart size={20} /></button>
            </div>
            {food.images && food.images.length > 0 && (
              <div className="cd-thumbnails">
                {[food.image, ...food.images].filter(Boolean).map((img, i) => (
                  <button key={i} className={`cd-thumbnail${activeImage === img ? ' is-selected' : ''}`} onClick={() => setActiveImage(img)} aria-label={`View image ${i + 1}`} aria-pressed={activeImage === img}>
                    <img loading="lazy" src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cd-item-info">
            <div className="cd-title-row">
              <h1>{food.name}</h1>
              <span className={`cd-veg-mark${food.isVeg ? '' : ' is-nonveg'}`} aria-label={food.isVeg ? 'Vegetarian' : 'Non-vegetarian'}><span /></span>
            </div>
            <div className="cd-seller-line">
              <span><FiShoppingBag /> {food.restaurantId?.name || 'Restaurant'}</span>
              {food.category && <><span className="cd-meta">·</span><span className="cd-meta">{food.category}</span></>}
            </div>
            <div className="cd-pricing">
              <span className="cd-price">₹{basePrice}</span>
              {originalPrice > basePrice && <span className="cd-original-price">₹{originalPrice}</span>}
              {food.offer ? <span className="cd-offer"><FiTag /> {food.offer}</span> : discountPercent > 0 ? <span className="cd-discount">{discountPercent}% off</span> : null}
              <span className="cd-rating">{food.rating?.toFixed(1) || '4.0'} <FiStar /></span>
            </div>
            <div className="cd-price-meta">
              <span>Price for {selectedVariant ? selectedVariant.name : '1 item'}</span>
              <span>{food.totalRatings || 0} Ratings</span>
              {food.freeDelivery && <span className="cd-delivery-badge">Free Delivery</span>}
            </div>
            <section className="cd-section">
              <h2>About this item</h2>
              <p>{food.description || 'A delicious treat freshly prepared for you.'}</p>
            </section>
            <div className="cd-quality-row">
              <div><FiClock /><div><strong>{food.restaurantId?.deliveryFee === 0 ? 'Free Delivery' : `Delivery: ₹${food.restaurantId?.deliveryFee ?? 30}`}</strong><span>{food.restaurantId?.deliveryTime || '30-45 mins'}</span></div></div>
              <div><FiShield /><div><strong>Freshly Prepared</strong><span>Hot & Tasty</span></div></div>
            </div>
            {food.variants && food.variants.length > 0 && (
              <section className="cd-section">
                <h2>Size</h2>
                <div className="cd-options">
                  {food.variants.map(v => {
                    const vFinalPrice = v.discountedPrice || v.price;
                    return (
                      <button key={v.name} disabled={!v.isAvailable} aria-pressed={selectedVariant?.name === v.name} onClick={() => v.isAvailable && setSelectedVariant(v)} className={`cd-option${selectedVariant?.name === v.name ? ' is-selected' : ''}`}>
                        <strong>{v.name}</strong><span>₹{vFinalPrice}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {food.addOns && food.addOns.length > 0 && (
              <section className="cd-section">
                <h2>Add-ons</h2>
                <div className="cd-addon-list">
                  {food.addOns.map(a => {
                    const isSelected = selectedAddOns.find(sel => sel.name === a.name);
                    return (
                      <label key={a.name} className={`cd-addon${isSelected ? ' is-selected' : ''}${a.isAvailable ? '' : ' is-unavailable'}`}>
                        <input type="checkbox" checked={!!isSelected} disabled={!a.isAvailable} onChange={() => a.isAvailable && handleAddOnToggle(a)} />
                        <span>{a.name}</span><strong>+₹{a.price}</strong>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}
            {food.spiceLevels && food.spiceLevels.length > 0 && (
              <section className="cd-section">
                <h2>Spice</h2>
                <div className="cd-options">
                  {food.spiceLevels.map(lvl => (
                    <button key={lvl} onClick={() => setSpiceLevel(lvl)} aria-pressed={spiceLevel === lvl} className={`cd-chip${spiceLevel === lvl ? ' is-selected' : ''}`}>{lvl}</button>
                  ))}
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
              <span className="cd-seller-name">{food.restaurantId?.name || 'Restaurant'}</span>
              <p>Fresh and hygienic preparation</p>
            </section>
            <div className="cd-detail-actions">
              <button className="cd-action-add" onClick={handleAddToCart}>ADD</button>
              <button className="cd-action-primary" onClick={() => { handleAddToCart(); navigate('/cart'); }}>Order · ₹{finalPrice * quantity}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
