import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const MAIN_STEPS = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const STEP_MAP = {
  pending: 0, accepted: 1, preparing: 2, out_for_delivery: 3,
  accepted_by_driver: 3, reached_restaurant: 3, picked_up: 3, on_the_way: 3, reached_customer: 3,
  delivered: 4
};
const STATUS_LABELS = {
  pending: 'Order Placed', accepted: 'Accepted', preparing: 'Preparing Food',
  out_for_delivery: 'Agent Assigned', accepted_by_driver: 'Agent Heading to Restaurant',
  reached_restaurant: 'Agent Waiting at Restaurant', picked_up: 'Order Picked Up',
  on_the_way: 'Agent On the Way', reached_customer: 'Agent Arrived with Food',
  delivered: 'Delivered'
};
const STATUS_ICONS = {
  pending: '📦', accepted: '✅', preparing: '👨‍🍳', out_for_delivery: '🛵',
  accepted_by_driver: '🏍', reached_restaurant: '🏪', picked_up: '🏃',
  on_the_way: '🚴', reached_customer: '📍', delivered: '🎉'
};

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/customer/orders/${id}`).then(res => {
      setOrder(res.data.order);
    }).catch(() => toast.error('Order not found')).finally(() => setLoading(false));

    // Socket connection
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current.emit('join_order_room', id);
    socketRef.current.on('order:status_update', (data) => {
      setOrder(prev => prev ? { ...prev, status: data.status, statusHistory: data.statusHistory } : prev);
      toast(`Order status: ${STATUS_LABELS[data.status] || data.status}`, { icon: STATUS_ICONS[data.status] || '🔔' });
    });

    return () => socketRef.current?.disconnect();
  }, [id]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      api.get(`/customer/orders/${id}`).then(res => setOrder(res.data.order)).catch(() => { });
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);


  if (loading) return <div style={{ padding: 120, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!order) return <div className="empty-state" style={{ paddingTop: 120 }}><div className="empty-state-icon"></div><h3>Order not found</h3></div>;

  const currentIdx = STEP_MAP[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            {order.status === 'delivered' ? ' Delivered!' : isCancelled ? ' Cancelled' : ' Live Tracking'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Order #{order._id?.slice(-8).toUpperCase()}</p>
        </div>

        {/* Status Tracker */}
        {!isCancelled && (
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <div className="step-tracker">
              {MAIN_STEPS.map((stepId, i) => (
                <div key={stepId} style={{ display: 'contents' }}>
                  <div className={`step ${i <= currentIdx ? 'done' : ''} ${i === currentIdx ? 'active' : ''}`}>
                    <div className="step-circle">{i <= currentIdx ? STATUS_ICONS[i === 3 && currentIdx === 3 ? order.status : stepId] : i + 1}</div>
                    <div className="step-label">{i === 3 && currentIdx === 3 ? STATUS_LABELS[order.status] : STATUS_LABELS[stepId]}</div>
                  </div>
                  {i < MAIN_STEPS.length - 1 && <div className={`step-line ${i < currentIdx ? 'done' : ''}`} />}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginTop: 8 }}>
              {STATUS_LABELS[order.status]} {STATUS_ICONS[order.status]}
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Estimated delivery: {order.estimatedDeliveryTime}
            </div>
          </div>
        )}

        {/* Delivery Agent Info */}
        {order.deliveryAgentName && !isCancelled && order.status !== 'delivered' && (
          <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🚴</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 800, margin: 0, fontSize: 16 }}>{order.deliveryAgentName}</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>{order.deliveryAgentId?.vehicleNumber || 'Your Delivery Partner'}</p>
            </div>
            {order.deliveryAgentId?.phone && (
              <a href={`tel:${order.deliveryAgentId.phone}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>Call Agent</a>
            )}
          </div>
        )}
        {/* Delivery confirmed */}
        {order.status === 'delivered' && (
          <div className="card" style={{ padding: 28, marginBottom: 20, background: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
            <h3 style={{ fontWeight: 800, fontSize: 20, color: 'var(--success)', marginBottom: 8 }}>Delivery Confirmed!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Enjoy your meal! Rate your experience.</p>
          </div>
        )}

        {/* Order Details */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}> Order Details</h3>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart'} ·  {order.deliveryAddress}
          </div>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
              <span>{item.name} × {item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
            <span>Total Paid</span>
            <span style={{ color: 'var(--primary)' }}>₹{order.finalAmount}</span>
          </div>
        </div>
        {/* OTP Display (Zomato Style) */}
        {order.status === 'reached_customer' && !order.otpVerified && (
          <div className="card" style={{ padding: 28, marginTop: 20, border: '1px solid rgba(255,87,34,0.3)', background: 'rgba(255,87,34,0.05)', textAlign: 'center', animation: 'glow 2s infinite' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--primary)' }}>Delivery Agent has Arrived!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Please share this Delivery PIN with your agent to receive your food.
            </p>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--primary)', letterSpacing: 16, fontFamily: 'monospace', paddingLeft: 16 }}>
              {order.deliveryOTP || '----'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
