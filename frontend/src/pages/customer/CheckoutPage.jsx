import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ==========================================
// 📍 DYNAMIC DELIVERY AREA SETTINGS
// Delivery validation is now handled dynamically by the backend Serviceability Engine.
// ==========================================
const ALLOWED_AREAS = []; 
const ALLOWED_PINCODES = [];
const ALLOWED_DISTRIC = [];
const ALLOWED_STATE = [];

export default function CheckoutPage() {
  const { cartItems, totalPrice, clearCart, restaurantId: ctxRestaurantId, storeId: ctxStoreId } = useCart();
  const { user, login } = useAuth(); // we don't need login, but need user
  const navigate = useNavigate();

  // Multi-address support
  const savedAddresses = user?.addresses || [];
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(savedAddresses.length > 0 ? 0 : -1);
  const [showNewAddressForm, setShowNewAddressForm] = useState(savedAddresses.length === 0);
  const [showZoneError, setShowZoneError] = useState(false);

  // New Address / Missing Info Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrHouse, setAddrHouse] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [alternatePhone, setAlternatePhone] = useState(user?.phone || '');

  const hasGPS = !!localStorage.getItem('jdkart_coords');

  const getActiveAddressString = () => {
    if (!showNewAddressForm && selectedAddressIndex >= 0 && savedAddresses[selectedAddressIndex]) {
      return savedAddresses[selectedAddressIndex].address;
    }
    if (hasGPS) {
      return [addrHouse, addrLandmark].filter(Boolean).join(', ');
    }
    return [addrHouse, addrArea, addrLandmark, addrDistrict, addrState, addrPincode].filter(Boolean).join(', ');
  };

  const address = getActiveAddressString();

  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  
  const handlePaymentChange = (method) => {
    if (method === 'upi' || method === 'razorpay') {
      toast.error('Currently we are not accepting the online payment!! Plz use the cash on delivery..', { duration: 4000 });
      setPaymentMethod('cod');
    } else {
      setPaymentMethod(method);
    }
  };

  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [calculating, setCalculating] = useState(true);

  useEffect(() => {
    if (cartItems.length === 0) return;
    const isValidId = (id) => Boolean(id) && id !== 'null' && id !== 'undefined';
    const restaurantIds = Array.from(new Set(cartItems.map(i => i.restaurantId || ctxRestaurantId).filter(isValidId)));
    const storeIds = Array.from(new Set(cartItems.map(i => i.storeId || ctxStoreId).filter(isValidId)));

    api.post('/customer/checkout-info', { items: cartItems, restaurantIds, storeIds })
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
    if (showNewAddressForm) {
      if (!customerName.trim()) { toast.error('Please enter your full name'); return; }
      if (!addrHouse.trim()) { toast.error('Please enter your House/Flat/Block number'); return; }
      
      if (!hasGPS) {
        if (!addrArea.trim()) { toast.error('Please select or enter your Area/Locality'); return; }
        if (!addrDistrict.trim()) { toast.error('Please select or enter your District/City'); return; }
        if (!addrState.trim()) { toast.error('Please select or enter your State'); return; }
        if (!addrPincode.trim()) { toast.error('Please enter your Pincode'); return; }
      }

      if (!alternatePhone.trim()) { toast.error('Please enter a Delivery Mobile Number'); return; }
    }

    if (!address.trim()) { toast.error('Please enter delivery address'); return; }
    
    // Check global phone
    if (!user?.phone && !showNewAddressForm) {
      if (!alternatePhone.trim()) {
        toast.error('Please enter a Mobile Number for delivery updates'); 
        return;
      }
    }

    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      let deliveryCoords = null;
      try {
        const storedCoords = localStorage.getItem('jdkart_coords');
        if (storedCoords) deliveryCoords = JSON.parse(storedCoords);
      } catch(e) {}

      // Build Address Object
      let deliveryAddressObj = {};
      if (!showNewAddressForm && selectedAddressIndex >= 0 && savedAddresses[selectedAddressIndex]) {
         const sa = savedAddresses[selectedAddressIndex];
         deliveryAddressObj = {
           addressLine1: sa.addressLine1 || sa.address || getActiveAddressString(),
           landmark: sa.landmark || '',
           area: sa.area || '',
           city: sa.city || sa.district || '',
           state: sa.state || '',
           pincode: sa.pincode || '',
           latitude: sa.latitude || deliveryCoords?.lat,
           longitude: sa.longitude || deliveryCoords?.lng
         };
      } else {
         deliveryAddressObj = {
           addressLine1: addrHouse,
           landmark: addrLandmark,
           area: addrArea,
           city: addrDistrict,
           state: addrState,
           pincode: addrPincode,
           latitude: deliveryCoords?.lat,
           longitude: deliveryCoords?.lng
         };
      }

      // Perform Serviceability Check
      const servRes = await api.post('/serviceability/check', { address: deliveryAddressObj });
      if (!servRes.data.serviceable) {
        toast.error(servRes.data.message);
        setLoading(false);
        return;
      }
      const serviceAreaId = servRes.data.serviceAreaId;

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
        deliveryAddress: deliveryAddressObj,
        serviceAreaId,
        deliveryCoords,
        alternatePhone: alternatePhone,
        specialInstructions: instructions,
        paymentMethod: paymentMethod === 'upi' ? 'razorpay' : paymentMethod,
      });

      // Update user profile if new address was filled or name was missing
      if (showNewAddressForm) {
        await api.post('/addresses', {
          label: addrLabel,
          addressLine1: addrHouse,
          addressLine2: '',
          landmark: addrLandmark,
          area: addrArea,
          city: addrDistrict,
          state: addrState,
          pincode: addrPincode,
          latitude: deliveryCoords?.lat,
          longitude: deliveryCoords?.lng,
          isDefault: true
        }).catch(() => {});
      }
      
      const order = Array.isArray(orderRes.data.orders) ? orderRes.data.orders[0] : orderRes.data.order;

      if (paymentMethod === 'cod') {
        clearCart();
        if (orderRes.data.autoRouted) {
          toast.success('Order placed! For faster delivery, some items were routed to the nearest branch.', { duration: 5000 });
        } else {
          toast.success('Order placed! Pay on delivery.');
        }
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
        if (orderRes.data.autoRouted) {
          toast.success('Payment successful! For faster delivery, some items were routed to the nearest branch.', { duration: 5000 });
        } else {
          toast.success('Payment successful! 🎉');
        }
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
          if (orderRes.data.autoRouted) {
            toast.success('Payment successful! 🚚 For faster delivery, some items were routed to the nearest branch.', { duration: 5000 });
          } else {
            toast.success('Payment successful! 🎉');
          }
          navigate(`/orders/${order._id}/track`);
        },
        prefill: { name: user.name, email: user.email, contact: user.phone },
        theme: { color: '#22ff34ff' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const errMsg = err.response?.data?.message || '';
      if (errMsg.includes('cannot be delivered to your area') || errMsg.includes('no nearby')) {
        setShowZoneError(true);
      } else {
        toast.error(errMsg || 'Failed to place order');
      }
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
                {savedAddresses.length > 0 && (
                  <button type="button" onClick={() => setShowNewAddressForm(!showNewAddressForm)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>
                    {showNewAddressForm ? 'Select Saved Address' : 'Add New Address'}
                  </button>
                )}
              </div>

              {!showNewAddressForm && savedAddresses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {savedAddresses.map((addr, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedAddressIndex(idx)}
                      style={{ 
                        padding: 16, border: `2px solid ${selectedAddressIndex === idx ? 'var(--primary)' : 'var(--border)'}`, 
                        borderRadius: 12, cursor: 'pointer', background: selectedAddressIndex === idx ? 'rgba(255,87,34,0.05)' : 'var(--bg-card)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{addr.label || 'Other'}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{addr.name}</div>
                        <div>{addr.address}</div>
                        <div>{addr.alternatePhone && `Phone: ${addr.alternatePhone}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {['Home', 'Work', 'Other'].map(lbl => (
                      <button key={lbl} type="button" onClick={() => setAddrLabel(lbl)} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${addrLabel === lbl ? 'var(--primary)' : 'var(--border)'}`, background: addrLabel === lbl ? 'var(--primary)' : 'transparent', color: addrLabel === lbl ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Full Name</label>
                    <input type="text" className="form-input" placeholder="Enter your full name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>House / Flat / Block No.</label>
                    <input type="text" className="form-input" placeholder="e.g. Flat 101, Galaxy Apts" value={addrHouse} onChange={e => setAddrHouse(e.target.value)} />
                  </div>
                  {!hasGPS && (
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
                  )}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Landmark (Optional)</label>
                    <input type="text" className="form-input" placeholder="e.g. Near Apollo Hospital" value={addrLandmark} onChange={e => setAddrLandmark(e.target.value)} />
                  </div>
                  
                  {/* District & State Row */}
                  {!hasGPS && (
                    <>
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

                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Pincode</label>
                        <input type="text" className="form-input" placeholder="e.g. 821304" value={addrPincode} onChange={e => setAddrPincode(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              
              {/* Delivery Phone Number */}
              {(!user?.phone || showNewAddressForm) && (
                <div style={{ marginTop: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Delivery Mobile Number</label>
                  <input type="tel" className="form-input" placeholder="e.g. 9876543210" value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>The delivery agent will call this number.</div>
                </div>
              )}
              </>
            )}
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
                    <input type="radio" name="payment" value={pm.id} checked={paymentMethod === pm.id} onChange={() => handlePaymentChange(pm.id)} style={{ marginTop: 2 }} />
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

      {/* OUT OF ZONE MODAL */}
      {showZoneError && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: 800 }}>Out of Delivery Zone</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6' }}>
              The items in your cart cannot be delivered to this address, and no nearby branches offer them. Would you like to clear your cart and browse restaurants that deliver to you?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => {
                  clearCart();
                  setShowZoneError(false);
                  navigate('/restaurants');
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }}
              >
                Clear Cart & Show Local
              </button>
              <button 
                onClick={() => setShowZoneError(false)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid var(--border)', fontSize: '15px', fontWeight: 600 }}
              >
                Change Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

