import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';

export default function CartPage() {
  const { cartItems, restaurantName, removeFromCart, updateQuantity, totalPrice, totalItems, deliveryFee, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fee = 30;
  const taxes = Math.round(totalPrice * 0.05);
  const total = totalPrice + fee + taxes;

  if (totalItems === 0) return (
    <div className="page-wrapper">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div className="empty-state-icon"></div>
        <h3>Your Cart is Empty</h3>
        <p>Add items from a restaurant to get started</p>
        <button onClick={() => navigate('/restaurants')} className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>Browse Restaurants</button>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Your <span style={{ color: 'var(--primary)' }}>Cart</span></h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>From: {restaurantName}</p>

        <div className="cart-layout">
          {/* Cart Items */}
          <div>
            <div className="card" style={{ padding: 0 }}>
              {cartItems.map((item, i) => (
                <div key={item.foodId} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < cartItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {item.image ? <img src={item.image} alt={item.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 60, height: 60, background: 'var(--bg-card2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}></div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>₹{item.price}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => updateQuantity(item.foodId, item.quantity - 1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', color: 'var(--primary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiMinus size={14} />
                    </button>
                    <span style={{ width: 28, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.foodId, item.quantity + 1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary)', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiPlus size={14} />
                    </button>
                    <button onClick={() => removeFromCart(item.foodId)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,67,54,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  <div style={{ minWidth: 80, textAlign: 'right', fontWeight: 700 }}>₹{item.price * item.quantity}</div>
                </div>
              ))}
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
                <span>Delivery Fee</span><span>₹{fee}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>Taxes (5%)</span><span>₹{taxes}</span>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span><span style={{ color: 'var(--primary)' }}>₹{total}</span>
              </div>
            </div>
            <button onClick={() => { if (!user) navigate('/login'); else navigate('/checkout'); }} className="btn btn-primary btn-full btn-lg">
              Proceed to Checkout →
            </button>
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(76,175,80,0.08)', borderRadius: 8, border: '1px solid rgba(76,175,80,0.2)', fontSize: 12, color: 'var(--success)', textAlign: 'center' }}>
              Secure payment powered by Razorpay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
