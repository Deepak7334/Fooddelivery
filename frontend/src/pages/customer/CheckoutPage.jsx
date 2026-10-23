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
  const { cartItems, totalPrice, clearCart, restaurantId: ctxRestaurantId, storeId: ctxStoreId, restaurantName, storeName } = useCart();
  const cartVendorName = restaurantName || storeName || 'Restaurant';
  const { user, login } = useAuth(); // we don't need login, but need user
  const navigate = useNavigate();

  // Multi-address support
  const savedAddresses = user?.addresses || [];
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(savedAddresses.length > 0 ? 0 : -1);
  const [showNewAddressForm, setShowNewAddressForm] = useState(savedAddresses.length === 0);
  const [showZoneError, setShowZoneError] = useState(false);
  const [localRestaurants, setLocalRestaurants] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

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

  const [editingAddressIndex, setEditingAddressIndex] = useState(-1);

  useEffect(() => {
    if (showNewAddressForm) {
      try {
        const last = JSON.parse(localStorage.getItem('jdkart_last_address'));
        if (last) {
          if (last.customerName && !user?.name) setCustomerName(last.customerName);
          if (last.addrHouse && !addrHouse) setAddrHouse(last.addrHouse);
          if (last.addrArea && !addrArea) setAddrArea(last.addrArea);
          if (last.addrDistrict && !addrDistrict) setAddrDistrict(last.addrDistrict);
          if (last.addrState && !addrState) setAddrState(last.addrState);
          if (last.addrPincode && !addrPincode) setAddrPincode(last.addrPincode);
          if (last.addrLandmark && !addrLandmark) setAddrLandmark(last.addrLandmark);
          if (last.alternatePhone && !user?.phone) setAlternatePhone(last.alternatePhone);
        }
      } catch (e) {}
    }
  }, [showNewAddressForm]);

  const hasGPS = !!localStorage.getItem('jdkart_coords');

  const getActiveAddressString = () => {
    if (!showNewAddressForm && selectedAddressIndex >= 0 && savedAddresses[selectedAddressIndex]) {
      const sa = savedAddresses[selectedAddressIndex];
      return sa.address || [sa.addressLine1, sa.area, sa.city, sa.state, sa.pincode].filter(Boolean).join(', ');
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
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState(0);
  const [calculating, setCalculating] = useState(true);

  useEffect(() => {
    if (cartItems.length === 0) return;
    const isValidId = (id) => Boolean(id) && id !== 'null' && id !== 'undefined';
    const restaurantIds = Array.from(new Set(cartItems.map(i => i.restaurantId || ctxRestaurantId).filter(isValidId)));
    const storeIds = Array.from(new Set(cartItems.map(i => i.storeId || ctxStoreId).filter(isValidId)));

    api.post('/customer/checkout-info', { items: cartItems, restaurantIds, storeIds })
      .then(res => {
        setDeliveryFee(res.data.deliveryFees || 0);
        setIsFirstOrder(Boolean(res.data.isFirstOrder));
        setOriginalDeliveryFee(res.data.originalDeliveryFee || 0);
      })
      .catch(err => {
        console.error('Error fetching checkout info:', err);
        toast.error(`Checkout info error: ${err.response?.data?.message || err.message}`);
        setDeliveryFee(30); // fallback
      })
      .finally(() => setCalculating(false));
  }, [cartItems]);

  const getActiveCity = () => {
    if (!showNewAddressForm && selectedAddressIndex >= 0 && savedAddresses[selectedAddressIndex]) {
      const sa = savedAddresses[selectedAddressIndex];
      return sa.city || sa.district || sa.area || '';
    }
    return addrDistrict;
  };

  // Pre-fetch local restaurants so the modal loads instantly if needed
  useEffect(() => {
    let qs = '';
    try {
      const storedCoords = localStorage.getItem('jdkart_coords');
      if (storedCoords) {
        const coords = JSON.parse(storedCoords);
        if (coords.lat && coords.lng) qs = `?lat=${coords.lat}&lng=${coords.lng}`;
      }
    } catch(e) {}
    
    const activeCity = getActiveCity();
    if (!qs && activeCity) {
      qs = `?city=${activeCity}`;
    } else if (!qs) {
      qs = `?city=unknown_location`; // Prevent fetching all if no GPS and no city yet
    }

    api.get(`/customer/restaurants${qs}`).then(res => {
      setLocalRestaurants(res.data.restaurants || []);
    }).catch(() => {});
  }, [selectedAddressIndex, showNewAddressForm, addrDistrict]);

  const handleEditAddress = (e, idx) => {
    e.stopPropagation();
    const addr = savedAddresses[idx];
    setEditingAddressIndex(idx);
    setAddrLabel(addr.label?.charAt(0).toUpperCase() + addr.label?.slice(1).toLowerCase() || 'Other');
    setCustomerName(addr.name || user?.name || '');
    setAddrHouse(addr.addressLine1 || addr.address || '');
    setAddrLandmark(addr.landmark || '');
    setAddrArea(addr.area || '');
    setAddrDistrict(addr.city || addr.district || '');
    setAddrState(addr.state || '');
    setAddrPincode(addr.pincode || '');
    setAlternatePhone(addr.alternatePhone || user?.phone || '');
    setShowNewAddressForm(true);
  };

  const handleSaveAddressStandalone = async () => {
    if (!addrHouse.trim()) { toast.error('House/Flat no is required'); return; }
    
    let deliveryCoords = null;
    try {
      const c = localStorage.getItem('jdkart_coords');
      if (c) deliveryCoords = JSON.parse(c);
    } catch(e){}

    if (!deliveryCoords) {
      if (!addrArea.trim() || !addrDistrict.trim() || !addrState.trim() || !addrPincode.trim()) {
        toast.error('Complete address details are required'); return;
      }
    }

    setSavingAddress(true);
    const updatedAddrObj = {
      label: addrLabel.toUpperCase(),
      name: customerName,
      address: getActiveAddressString(),
      addressLine1: addrHouse,
      addressLine2: '',
      landmark: addrLandmark,
      area: addrArea,
      city: addrDistrict,
      district: addrDistrict,
      state: addrState,
      pincode: addrPincode,
      latitude: deliveryCoords?.lat,
      longitude: deliveryCoords?.lng,
      alternatePhone: alternatePhone,
      isDefault: true
    };

    try {
      if (editingAddressIndex >= 0) {
        const updatedArray = [...savedAddresses];
        updatedArray[editingAddressIndex] = { ...updatedArray[editingAddressIndex], ...updatedAddrObj };
        await api.put('/auth/profile', { addresses: updatedArray });
        toast.success('Address updated successfully!');
      } else {
        await api.put('/auth/profile', { newAddress: updatedAddrObj });
        toast.success('New address saved!');
      }
      
      // window.location.reload() removed 
    } catch (err) {
      toast.error('Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };
  
  const total = totalPrice + deliveryFee;

  const totalSavings = cartItems.reduce((sum, item) => sum + ((item.originalPrice || item.price) - item.price) * item.quantity, 0);

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

      // Save last used address to local storage for autofill next time
      localStorage.setItem('jdkart_last_address', JSON.stringify({
        customerName, addrHouse, addrArea, addrDistrict, addrState, addrPincode, addrLandmark, alternatePhone
      }));
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
      if (showNewAddressForm && user) {
        await api.put('/auth/profile', {
          newAddress: {
            label: addrLabel.toUpperCase(),
            name: customerName,
            address: getActiveAddressString(),
            addressLine1: addrHouse,
            addressLine2: '',
            landmark: addrLandmark,
            area: addrArea,
            city: addrDistrict,
            district: addrDistrict,
            state: addrState,
            pincode: addrPincode,
            latitude: deliveryCoords?.lat,
            longitude: deliveryCoords?.lng,
            alternatePhone: alternatePhone,
            isDefault: true
          }
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
        // Fetch local restaurants
        setLoadingLocal(true);
        let qs = '';
        // Attempt to get coords again
        let fallbackLat, fallbackLng;
        try {
          const storedCoords = localStorage.getItem('jdkart_coords');
          if (storedCoords) {
             const c = JSON.parse(storedCoords);
             fallbackLat = c.lat; fallbackLng = c.lng;
          }
        } catch(e){}

        if (fallbackLat && fallbackLng) {
          qs = `?lat=${fallbackLat}&lng=${fallbackLng}`;
        } else {
          const activeCity = getActiveCity();
          qs = `?city=${activeCity || 'unknown'}`; 
        }
        api.get(`/customer/restaurants${qs}`).then(res => {
          setLocalRestaurants(res.data.restaurants || []);
        }).catch(console.error).finally(() => setLoadingLocal(false));
      } else {
        toast.error(errMsg || 'Failed to place order');
      }
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) return null;

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
                {showNewAddressForm && savedAddresses.length > 0 && (
                  <button type="button" onClick={() => setShowNewAddressForm(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }}>
                    Cancel
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>
                            {addr.label ? addr.label.charAt(0).toUpperCase() + addr.label.slice(1).toLowerCase() : 'Other'}
                          </span>
                        </div>
                        <button type="button" onClick={(e) => handleEditAddress(e, idx)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit</button>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{addr.name || user?.name || 'Customer'}</div>
                        <div style={{ marginTop: 4 }}>{addr.address || [addr.addressLine1, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</div>
                        <div style={{ marginTop: 4 }}>{addr.alternatePhone ? `Phone: ${addr.alternatePhone}` : (user?.phone ? `Phone: ${user.phone}` : '')}</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add New Address Card */}
                  <div 
                    onClick={() => {
                      setEditingAddressIndex(-1);
                      setAddrHouse('');
                      setAddrLandmark('');
                      setShowNewAddressForm(true);
                    }}
                    style={{ 
                      padding: '20px 16px', border: `1px solid var(--border)`, 
                      borderRadius: 12, cursor: 'pointer', background: 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 8, color: 'var(--primary)', fontWeight: 700,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  >
                    <span style={{ fontSize: 20 }}>+</span>
                    <span>Add a new address</span>
                  </div>
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
              {showNewAddressForm && (
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button type="button" className="btn btn-primary" onClick={handleSaveAddressStandalone} disabled={savingAddress}>
                    {savingAddress ? 'Saving...' : (editingAddressIndex >= 0 ? 'Update Address' : 'Save Address')}
                  </button>
                  {savedAddresses.length > 0 && (
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowNewAddressForm(false); setEditingAddressIndex(-1); }} style={{ marginLeft: 12 }}>
                      Cancel
                    </button>
                  )}
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
              <span>{calculating ? '...' : isFirstOrder ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>{originalDeliveryFee > 0 && <del style={{ color: 'var(--text-muted)', marginRight: 6 }}>₹{originalDeliveryFee}</del>}FREE 🎉</span> : deliveryFee === 0 ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>Free Delivery</span> : `₹${deliveryFee}`}</span>
            </div>
            {isFirstOrder && (
              <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', border: '1px dashed rgba(34, 197, 94, 0.3)' }}>
                🎉 Welcome Gift: Free Delivery applied on your 1st order!
              </div>
            )}


            {totalSavings > 0 && (
              <div style={{ padding: '8px 12px', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', border: '1px dashed rgba(76, 175, 80, 0.3)' }}>
                ?? Festive Offer Applied! You saved ?{totalSavings} on this order!
              </div>
            )}
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

      {/* OUT OF ZONE MODAL - PREMIUM REDESIGN */}
      {showZoneError && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', position: 'relative' }}>
            
            {/* Close Button */}
            <button onClick={() => setShowZoneError(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-secondary)', color: 'var(--text)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>✕</button>
            
            {/* Header */}
            <div style={{ padding: '32px 24px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'inline-block', background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>
                📍 DELIVERY UNAVAILABLE
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, lineHeight: '1.3' }}>Oops! This restaurant is out of reach</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{cartVendorName}</p>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>Hungry? Let's find something closer!</p>
            </div>

            {/* Scrollable Restaurant List */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: 'var(--bg-body)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text)' }}>🍽️ Restaurants Near Your Location</div>
              
              {loadingLocal && localRestaurants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                  <span className="spinner" style={{ width: 24, height: 24, marginBottom: 12, borderTopColor: 'var(--primary)' }} />
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Finding restaurants that deliver to you...</div>
                </div>
              ) : localRestaurants.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {localRestaurants.map(rest => (
                    <div key={rest._id} onClick={() => { 
                      setShowZoneError(false); 
                      navigate(`/restaurants/${rest._id}`); 
                      setTimeout(() => clearCart(), 50);
                    }} style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}>
                      <div style={{ width: 100, height: 100, flexShrink: 0, background: 'var(--bg-secondary)' }}>
                        <img loading="lazy" src={rest.image || 'https://via.placeholder.com/100'} alt={rest.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{rest.name}</h4>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                          <span>📍</span> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{rest.city || 'Local Area'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{rest.cuisine?.slice(0,2).join(', ') || 'Various'}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }}></span> Delivers to you
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>No nearby restaurants found that deliver to this location.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <button 
                onClick={() => {
                  setShowZoneError(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span></span> Change Delivery Address
              </button>
              <button 
                onClick={() => {
                  setShowZoneError(false);
                  navigate('/restaurants');
                  setTimeout(() => clearCart(), 50);
                }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border)', fontSize: '15px', fontWeight: 300, color: 'var(--text)', borderRadius: '12px', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span></span> Clear Cart & Explore Local Restaurants
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

