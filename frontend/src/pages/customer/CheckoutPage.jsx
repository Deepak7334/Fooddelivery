import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { cartItems, restaurantId, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState(user?.address || '');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loading, setLoading] = useState(false);
  const fee = 30;
  const taxes = Math.round(totalPrice * 0.05);
  const total = totalPrice + fee + taxes;

  const handlePlaceOrder = async () => {
    if (!address.trim()) { toast.error('Please enter delivery address'); return; }
    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      // 1. Create order
      const orderRes = await api.post('/customer/orders', {
        restaurantId,
        items: cartItems.map(i => ({ foodId: i.foodId, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        deliveryAddress: address,
        specialInstructions: instructions,
        paymentMethod: paymentMethod === 'upi' ? 'razorpay' : paymentMethod,
      });
      const order = orderRes.data.order;

      if (paymentMethod === 'cod') {
        clearCart();
        toast.success('Order placed! Pay on delivery. 🎉');
        navigate(`/orders/${order._id}/track`);
        return;
      }

      if (paymentMethod === 'upi') {
        // Navigate to dedicated UPI payment page
        navigate('/payment/upi', { state: { orderId: order._id, amount: total } });
        return;
      }

      // Razorpay flow
      const payRes = await api.post('/payment/create-order', { orderId: order._id });
      const { razorpayOrderId, amount, key, mock } = payRes.data;

      if (mock || key === 'rzp_test_mock') {
        await api.post('/payment/verify', {
          orderId: order._id, razorpayOrderId, razorpayPaymentId: 'mock_payment',
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
        name: 'FoodHub',
        description: 'Food Order Payment',
        order_id: razorpayOrderId,
        handler: async (response) => {
          await api.post('/payment/verify', {
            orderId: order._id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          clearCart();
          toast.success('Payment successful! 🎉');
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
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 17 }}>📍 Delivery Address</h3>
              <textarea className="form-input" rows={3} placeholder="Enter your full delivery address..." value={address} onChange={e => setAddress(e.target.value)} style={{ resize: 'vertical' }} />
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
                  { id: 'upi', label: '📱 UPI / Online Payment', desc: 'GPay · PhonePe · Paytm · BHIM · QR Code', badge: 'RECOMMENDED' },
                  { id: 'razorpay', label: '💳 Cards & Wallets', desc: 'Credit / Debit Card · Net Banking · Wallets' },
                  { id: 'cod', label: '💵 Cash on Delivery', desc: 'Pay cash when your order arrives' },
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>
              <span>Delivery Fee</span><span>₹{fee}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>
              <span>Taxes</span><span>₹{taxes}</span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
              <span>Total</span><span style={{ color: 'var(--primary)' }}>₹{total}</span>
            </div>
            <button onClick={handlePlaceOrder} disabled={loading} className="btn btn-primary btn-full btn-lg">
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Placing...</> : paymentMethod === 'cod' ? '🛵 Place Order' : paymentMethod === 'upi' ? `📱 Proceed to UPI Payment · ₹${total}` : `💳 Pay ₹${total}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
