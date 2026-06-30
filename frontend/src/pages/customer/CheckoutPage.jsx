import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ==========================================
// 📍 DELIVERY AREA SETTINGS
// ==========================================
// Add your specific village areas here (e.g. ['Area 1', 'Area 2'])
// If this list has items, the Area field becomes a dropdown.
const ALLOWED_AREAS = ['Tilokhar', 'Panduka','Parchha','Padariya',]; 

// Add your allowed pincodes here (e.g. ['123456'])
// If this list has items, we check the user's pincode against it.
const ALLOWED_PINCODES = ['821304'];
const ALLOWED_DISTRIC = ['Rohtas'];
const ALLOWED_STATE = ['Bihar']; 
// ==========================================

export default function CheckoutPage() {
  const { cartItems, totalPrice, clearCart, restaurantId: ctxRestaurantId, storeId: ctxStoreId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addrHouse, setAddrHouse] = useState(user?.address || '');
  const [addrArea, setAddrArea] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  
  const address = [addrHouse, addrArea, addrDistrict, addrState, addrPincode].filter(Boolean).join(', ');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [calculating, setCalculating] = useState(true);

  useEffect(() => {
    if (cartItems.length === 0) return;
    const isValidId = (id) => Boolean(id) && id !== 'null' && id !== 'undefined';
    const restaurantIds = Array.from(new Set(cartItems.map(i => i.restaurantId || ctxRestaurantId).filter(isValidId)));
    const storeIds = Array.from(new Set(cartItems.map(i => i.storeId || ctxStoreId).filter(isValidId)));

    api.post('/customer/checkout-info', { restaurantIds, storeIds })
      .then(res => {
        setDeliveryFee(res.data.deliveryFees || 0);
      })
      .catch(err => {
        console.error('Error fetching checkout info:', err);
        toast.error(`Checkout info error: ${err.response?.data?.message || err.message}`);
        setDeliveryFee(30); // fallback
      })
      .finally(() => setCalculating(false));
  }, [cartItems]);

  const handleSaveAddress = async () => {
    if (!address.trim()) return toast.error('Address cannot be empty');
    setSavingAddress(true);
    try {
      await api.put('/auth/profile', { address });
      toast.success('Address saved to profile!');
    } catch (err) {
      toast.error('Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };
  
  const total = totalPrice + deliveryFee;

  const handlePlaceOrder = async () => {
    // --- EXPLICIT FIELD VALIDATION ---
    if (!addrHouse.trim()) { toast.error('Please enter your House/Flat/Block number'); return; }
    if (!addrArea.trim()) { toast.error('Please select or enter your Area/Locality'); return; }
    if (!addrDistrict.trim()) { toast.error('Please select or enter your District'); return; }
    if (!addrState.trim()) { toast.error('Please select or enter your State'); return; }
    if (!addrPincode.trim()) { toast.error('Please enter your Pincode'); return; }
    if (!address.trim()) { toast.error('Please enter delivery address'); return; }

    // --- LOCATION RESTRICTION CHECK ---
    if (ALLOWED_PINCODES.length > 0 && !ALLOWED_PINCODES.includes(addrPincode.trim())) {
      toast.error(
       "Sorry, currently our service is not available in your Entered Pincode.\n\n माफ़ कीजिए, अभी हमारी सेवा आपके दर्ज किए गए पिनकोड में उपलब्ध नहीं है"
      );
      return;
    }
    if (ALLOWED_AREAS.length > 0 && !ALLOWED_AREAS.includes(addrArea.trim())) {
      toast.error('Sorry, currently our service is not available in your selected area.');
      return;
    }
    if (ALLOWED_DISTRIC.length > 0 && !ALLOWED_DISTRIC.includes(addrDistrict.trim())) {
      toast.error('Sorry, currently our service is not available in your selected district.');
      return;
    }
    if (ALLOWED_STATE.length > 0 && !ALLOWED_STATE.includes(addrState.trim())) {
      toast.error('Sorry, currently our service is not available in your selected state.');
      return;
    }
    // ----------------------------------

    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      // 1. Create order
      const orderRes = await api.post('/customer/orders', {
        items: cartItems.map(i => ({ 
          foodId: i.type === 'food' ? (i.foodId || i._id) : null,
          productId: i.type === 'product' ? (i.productId || i._id) : null,
          type: i.type,
          restaurantId: i.restaurantId,
          storeId: i.storeId,
          name: i.name, 
          price: i.price, 
          quantity: i.quantity, 
          image: i.image 
        })),
        deliveryAddress: address,
        alternatePhone: alternatePhone,
        specialInstructions: instructions,
        paymentMethod: paymentMethod === 'upi' ? 'razorpay' : paymentMethod,
      });

      if (address.trim() && address !== user?.address) {
        api.put('/auth/profile', { address }).catch(() => {});
      }
      
      const order = Array.isArray(orderRes.data.orders) ? orderRes.data.orders[0] : orderRes.data.order;

      if (paymentMethod === 'cod') {
        clearCart();
        toast.success('Order placed! Pay on delivery. ');
        navigate(`/orders/${order._id}/track`);
        return;
      }

      if (paymentMethod === 'upi') {
        navigate('/payment/upi', { state: { orderId: order._id, orderIds: orderRes.data.orders?.map(o => o._id), amount: total } });
        return;
      }

      const orderIds = Array.isArray(orderRes.data.orders) ? orderRes.data.orders.map(o => o._id) : [order._id];

      // Razorpay flow
      const payRes = await api.post('/payment/create-order', { orderIds });
      const { razorpayOrderId, amount, key, mock } = payRes.data;

      if (mock || key === 'rzp_test_mock') {
        await api.post('/payment/verify', {
          orderIds, razorpayOrderId, razorpayPaymentId: 'mock_payment',
          razorpaySignature: 'mock',
        });
        clearCart();
        toast.success('Payment successful! 🎉');
        navigate(`/orders/${order._id}/track`);
        return;
      }

      const options = {
        key,
        amount,
        currency: 'INR',
        name: 'JDkart',
        description: 'Food & Grocery Order Payment',
        order_id: razorpayOrderId,
        handler: async (response) => {
          await api.post('/payment/verify', {
            orderIds,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          clearCart();
          toast.success('Payment successful! ');
          navigate(`/orders/${order._id}/track`);
        },
        prefill: { name: user.name, email: user.email, contact: user.phone },
        theme: { color: '#22ff34ff' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) { navigate('/cart'); return null; }

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>
          <span style={{ color: 'var(--primary)' }}>Checkout</span>
        </h1>
        <div className="cart-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Delivery Address */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}> Delivery Address</h3>
                {address !== user?.address && address.trim().length > 0 && (
                  <button type="button" onClick={handleSaveAddress} disabled={savingAddress} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>
                    {savingAddress ? 'Saving...' : 'Update Default'}
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>House / Flat / Block No.</label>
                  <input type="text" className="form-input" placeholder="e.g. Flat 101, Galaxy Apts" value={addrHouse} onChange={e => setAddrHouse(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Area / Sector / Locality</label>
                  {ALLOWED_AREAS.length > 0 ? (
                    <select className="form-input" value={addrArea} onChange={e => setAddrArea(e.target.value)}>
                      <option value="">Select your area...</option>
                      {ALLOWED_AREAS.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className="form-input" placeholder="e.g. Koramangala 4th Block" value={addrArea} onChange={e => setAddrArea(e.target.value)} />
                  )}
                </div>
                
                {/* District & State Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>District</label>
                    {ALLOWED_DISTRIC.length > 0 ? (
                      <select className="form-input" value={addrDistrict} onChange={e => setAddrDistrict(e.target.value)}>
                        <option value="">Select district...</option>
                        {ALLOWED_DISTRIC.map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" className="form-input" placeholder="e.g. Rohtas" value={addrDistrict} onChange={e => setAddrDistrict(e.target.value)} />
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>State</label>
                    {ALLOWED_STATE.length > 0 ? (
                      <select className="form-input" value={addrState} onChange={e => setAddrState(e.target.value)}>
                        <option value="">Select state...</option>
                        {ALLOWED_STATE.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" className="form-input" placeholder="e.g. Bihar" value={addrState} onChange={e => setAddrState(e.target.value)} />
                    )}
                  </div>
                </div>

                {/* Pincode Row */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Pincode</label>
                  <input type="text" className="form-input" placeholder="e.g. 821304" value={addrPincode} onChange={e => setAddrPincode(e.target.value)} />
                </div>
              </div>
              
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>Alternate Phone Number (Optional)</h3>
                <input type="tel" className="form-input" placeholder="e.g. +91 9876543210" value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} />
              </div>
            </div>

            {/* Special Instructions */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 17 }}> Special Instructions</h3>
              <textarea className="form-input" rows={2} placeholder="e.g. No onions, extra spicy..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ resize: 'none' }} />
            </div>

            {/* Payment Method */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 17 }}> Payment Method</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { id: 'upi', label: ' UPI / Online Payment', desc: 'GPay · PhonePe · Paytm · BHIM · QR Code', badge: 'RECOMMENDED' },
                  { id: 'razorpay', label: 'Cards & Wallets', desc: 'Credit / Debit Card · Net Banking · Wallets' },
                  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay cash when your order arrives' },
                ].map(pm => (
                  <label key={pm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: paymentMethod === pm.id ? 'rgba(255,87,34,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${paymentMethod === pm.id ? 'rgba(255,87,34,0.4)' : 'var(--border)'}`, cursor: 'pointer', transition: 'var(--transition)' }}>
                    <input type="radio" name="payment" value={pm.id} checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} style={{ marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {pm.label}
                        {pm.badge && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,87,34,0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 999 }}>{pm.badge}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{pm.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card" style={{ padding: 24, position: 'sticky', top: 90 }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Order Summary</h3>
            {cartItems.map(item => (
              <div key={item.foodId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span>{item.name} × {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>
              <span>Subtotal</span><span>₹{totalPrice}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--text-secondary)' }}>
              <span>Delivery Fee</span>
              <span>{calculating ? '...' : deliveryFee === 0 ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Free Delivery</span> : `₹${deliveryFee}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px dashed var(--border)', fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>₹{calculating ? '...' : total}</span>
            </div>
            <button 
              className="btn btn-primary btn-lg btn-full" 
              onClick={handlePlaceOrder}
              disabled={loading || calculating || cartItems.length === 0}
            >
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Placing...</> : paymentMethod === 'cod' ? ' Place Order' : paymentMethod === 'upi' ? `Proceed to UPI Payment · ₹${calculating ? '...' : total}` : ` Pay ₹${calculating ? '...' : total}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
