import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { calculateDistance } from '../../utils/distance';
import { getCurrentCoordinates } from '../../utils/geolocation';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart, cartType, restaurantId, storeId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [userCoords, setUserCoords] = useState(null);
  const [vendorLocation, setVendorLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [vendorFee, setVendorFee] = useState(30);
  const [vendorTime, setVendorTime] = useState('30-45 mins');
  const [manualMode, setManualMode] = useState(false);

  // Initialize location and fetch vendor details
  useEffect(() => {
    if (totalItems === 0) return;

    let coordsObj = null;
    try {
      const stored = localStorage.getItem('jdkart_coords');
      if (stored) {
        coordsObj = JSON.parse(stored);
        setUserCoords(coordsObj);
      } else {
        setShowLocationPrompt(true);
      }
    } catch (e) {
      setShowLocationPrompt(true);
    }

    const fetchVendor = async () => {
        try {
          if (cartType === 'food' && restaurantId) {
            const res = await api.get(`/customer/restaurants/${restaurantId}`);
            const loc = res.data?.restaurant?.location;
            if (res.data?.restaurant?.deliveryFee !== undefined) setVendorFee(res.data.restaurant.deliveryFee);
            if (res.data?.restaurant?.deliveryTime) setVendorTime(res.data.restaurant.deliveryTime);
            if (loc) {
              let lat = loc.lat != null ? loc.lat : (loc.coordinates ? loc.coordinates[1] : null);
              let lng = loc.lng != null ? loc.lng : (loc.coordinates ? loc.coordinates[0] : null);
              if (lat != null && lng != null) setVendorLocation({ lat, lng });
            }
          } else if (cartType === 'product' && storeId) {
            const res = await api.get(`/store/stores/${storeId}`);
            const loc = res.data?.store?.location;
            if (res.data?.store?.deliveryFee !== undefined) setVendorFee(res.data.store.deliveryFee);
            if (res.data?.store?.deliveryTime) setVendorTime(res.data.store.deliveryTime);
            if (loc) {
              let lat = loc.lat != null ? loc.lat : (loc.coordinates ? loc.coordinates[1] : null);
              let lng = loc.lng != null ? loc.lng : (loc.coordinates ? loc.coordinates[0] : null);
              if (lat != null && lng != null) setVendorLocation({ lat, lng });
            }
          }
        } catch (err) {
          console.error("Failed to fetch vendor details", err);
        }
      };
    fetchVendor();
  }, [totalItems, cartType, restaurantId, storeId]);

  // Compute distance
  useEffect(() => {
    if (userCoords && vendorLocation && !manualMode) {
      const d = calculateDistance(userCoords.lat, userCoords.lng, vendorLocation.lat, vendorLocation.lng);
      setDistance(d);
    } else {
      setDistance(null);
    }
  }, [userCoords, vendorLocation, manualMode]);

  const handleDetectLocation = async () => {
    setLocLoading(true);
    try {
      const coords = await getCurrentCoordinates();
      setUserCoords(coords);
      setManualMode(false);
      localStorage.setItem('jdkart_coords', JSON.stringify(coords));
      setShowLocationPrompt(false);
      setLocLoading(false);
      toast.success("Location set successfully!");
      window.dispatchEvent(new Event('locationUpdated'));
    } catch (err) {
      setLocLoading(false);
      console.error('Location error:', err);
      if (err?.code === 1) {
        toast.error('Location access denied. Please allow location in your browser settings.');
      } else {
        toast.error('Unable to get GPS location. You can enter address manually.');
      }
    }
  };

  const handleManualEntrySelect = () => {
    setManualMode(true);
    setUserCoords(null);
    setDistance(null);
    localStorage.removeItem('jdkart_coords');
    setShowLocationPrompt(false);
    toast.success("Proceeding with manual address entry");
  };

  const outOfService = !manualMode && distance !== null && distance > 5;
  const minOrderRequired = (!manualMode && distance !== null && distance > 2 && distance <= 5) ? 100 : 0;

  // Delivery fee: from vendor settings
  const fee = vendorFee;
  const total = totalPrice + fee;

  if (totalItems === 0) return (
    <div className="page-wrapper">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div className="empty-state-icon"></div>
        <h3>Your Cart is Empty</h3>
        <p>Add items from a restaurant or store to get started</p>
        <button onClick={() => navigate('/')} className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>Browse Home</button>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Your <span style={{ color: 'var(--primary)' }}>Cart</span></h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: outOfService ? 16 : 32 }}>Review your items before checkout</p>

        {outOfService && (
          <div style={{ marginBottom: 32, padding: 24, background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', borderRadius: 16, border: '2px solid rgba(244,67,54,0.3)', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--danger)' }}>
              Our service has not started in your area yet !! 
            </h2>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              We currently do not deliver beyond 5km from this restaurant via GPS. You can also enter your delivery address manually.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleManualEntrySelect} 
                className="btn btn-primary"
                style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700 }}
              >
                Enter Address Manually
              </button>
              <button 
                onClick={() => setShowLocationPrompt(true)} 
                className="btn btn-secondary"
                style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)' }}
              >
                Change Location
              </button>
            </div>
          </div>
        )}

        <div className="cart-layout">
          {/* Cart Items */}
          <div>
            <div className="card" style={{ padding: 0 }}>
              {cartItems.map((item, i) => {
                const id = item.cartItemId || item.foodId || item.productId || item._id;
                return (
                <div key={id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < cartItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 min-content', minWidth: 200 }}>
                    {item.image ? <img loading="lazy" src={item.image} alt={item.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 60, height: 60, background: 'var(--bg-card2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}></div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {item.name}
                        {item.variantName && <span style={{ fontSize: 11, background: 'var(--glass-border)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>{item.variantName}</span>}
                      </div>
                      {item.spiceLevel && <div style={{ fontSize: 11, color: '#FF9800', marginBottom: 2 }}>{item.spiceLevel}</div>}
                      {item.addOns && item.addOns.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                          + {item.addOns.map(a => a.name).join(', ')}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>from {item.restaurantName || item.storeName || 'JDkart'}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>₹{item.price}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1 1 auto', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => updateQuantity(id, item.quantity - 1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', color: 'var(--primary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiMinus size={14} />
                      </button>
                      <span style={{ width: 28, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(id, item.quantity + 1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary)', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiPlus size={14} />
                      </button>
                      <button onClick={() => removeFromCart(id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,67,54,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                    <div style={{ minWidth: 80, textAlign: 'right', fontWeight: 700 }}>₹{item.price * item.quantity}</div>
                  </div>
                </div>
              )})}
            </div>
            <button onClick={clearCart} className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
              <FiTrash2 size={14} /> Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="card" style={{ padding: 24, position: 'sticky', top: 90 }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>Subtotal ({totalItems} items)</span><span>₹{totalPrice}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>Delivery Fee ({vendorTime})</span><span>{fee === 0 ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Free</span> : `₹${fee}`}</span>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span><span style={{ color: 'var(--primary)' }}>₹{total}</span>
              </div>
            </div>

            <button 
              onClick={() => { if (!user) navigate('/login'); else navigate('/checkout'); }} 
              disabled={outOfService || (minOrderRequired > 0 && totalPrice < minOrderRequired) || (!manualMode && distance === null)}
              className="btn btn-primary btn-full btn-lg"
              style={{ opacity: (outOfService || (minOrderRequired > 0 && totalPrice < minOrderRequired) || (!manualMode && distance === null)) ? 0.5 : 1, cursor: (outOfService || (minOrderRequired > 0 && totalPrice < minOrderRequired) || (!manualMode && distance === null)) ? 'not-allowed' : 'pointer' }}
            >
              Proceed to Checkout →
            </button>
            
            {!outOfService && minOrderRequired > 0 && totalPrice < minOrderRequired && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255,152,0,0.1)', color: '#FF9800', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,152,0,0.2)', textAlign: 'center' }}>
                Minimum order of ₹{minOrderRequired} applies for your area ({distance?.toFixed(1)}km away). Add ₹{minOrderRequired - totalPrice} more to checkout!
              </div>
            )}

            <div style={{ marginTop: 16, padding: 12, background: 'rgba(76,175,80,0.08)', borderRadius: 8, border: '1px solid rgba(76,175,80,0.2)', fontSize: 12, color: 'var(--success)', textAlign: 'center' }}>
              Secure payment powered by Razorpay
            </div>
          </div>
        </div>
      </div>

      {showLocationPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px 24px', borderRadius: 24, width: '90%', maxWidth: 400, textAlign: 'center', animation: 'scaleIn 0.3s ease', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowLocationPrompt(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Set Delivery Location</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
              Where should we deliver your order? Choose live GPS or enter your address manually.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={handleDetectLocation} disabled={locLoading} className="btn btn-primary btn-full btn-lg">
                {locLoading ? 'Wait...' : 'Use Current Location'}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                <div className="divider" style={{ flex: 1, margin: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>OR</span>
                <div className="divider" style={{ flex: 1, margin: 0 }} />
              </div>

              <button onClick={handleManualEntrySelect} className="btn btn-secondary btn-full btn-lg">
                Enter Your Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
