import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createSocket } from '../../lib/socket';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { formatAddress } from '../../utils/address';
import { FiPackage, FiCheck, FiClock, FiTruck, FiCheckCircle, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import './CustomerTransactions.css';

const CANCELLATION_WINDOW_SECONDS = 150; // 2 minutes 30 seconds
const WHATSAPP_SUPPORT_NUMBER = '917762971182';

const getRemainingSeconds = (createdAt) => {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - createdTime) / 1000);
  return Math.max(0, CANCELLATION_WINDOW_SECONDS - elapsed);
};

const formatCountdown = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const MAIN_STEPS = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const STEP_VISUALS = [FiPackage, FiCheck, FiClock, FiTruck, FiCheckCircle];
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
  const [cancelling, setCancelling] = useState(false);
  const [, setTick] = useState(0);
  const socketRef = useRef(null);

  // Live 1-second ticker for the 2:30 min cancellation countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get(`/customer/orders/${id}`).then(res => {
      setOrder(res.data.order);
    }).catch(() => toast.error('Order not found')).finally(() => setLoading(false));

    // Socket connection
    socketRef.current = createSocket();
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

  if (loading) return <div className="customer-transactions tx-loading"><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!order) return (
    <div className="page-wrapper customer-transactions tx-tracking">
      <div className="empty-state">
        <div className="empty-state-icon"><FiPackage size={52} /></div>
        <h3>Order not found</h3>
        <p style={{ color: '#64748B', fontSize: 14, margin: '8px 0 20px' }}>
          This order may have expired, or you might need to sign in with your account to view it.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/orders" className="btn btn-primary" style={{ minWidth: 140 }}>My Orders</Link>
          <Link to="/" className="btn btn-secondary" style={{ minWidth: 140 }}>Browse Food</Link>
        </div>
      </div>
    </div>
  );

  const handleCancelOrder = async () => {
    const remaining = getRemainingSeconds(order.createdAt);
    if (remaining <= 0) {
      toast.error('After 2.30 minutes Apka order cancel nhi ho sakta..');
      return;
    }
    if (!window.confirm('Cancel this order? Free cancellation is only available within 2:30 minutes.')) return;
    setCancelling(true);
    try {
      await api.patch(`/customer/orders/${order._id}/cancel`);
      setOrder(prev => ({ ...prev, status: 'cancelled' }));
      toast.success('Order cancelled successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const currentIdx = STEP_MAP[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';
  const remainingSeconds = getRemainingSeconds(order.createdAt);
  const canCancel = !isCancelled && ['pending', 'accepted'].includes(order.status) && remainingSeconds > 0;
  const cancellationExpired = !isCancelled && ['pending', 'accepted'].includes(order.status) && remainingSeconds === 0;

  const whatsappMessage = encodeURIComponent(`Hi JDkart Support, I need help with my Order #${order._id?.slice(-8).toUpperCase()}`);
  const whatsappUrl = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${whatsappMessage}`;

  return (
    <div className="page-wrapper customer-transactions tx-tracking">
      <header className="tx-page-header">
        <div className="container tx-header-inner">
          <div>
            <h1>{order.status === 'delivered' ? 'Order Delivered' : isCancelled ? 'Order Cancelled' : 'Track Order'}</h1>
            <p>Order #{order._id?.slice(-8).toUpperCase()}</p>
          </div>

          {!isCancelled && order.status !== 'delivered' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {canCancel ? (
                <button 
                  onClick={handleCancelOrder} 
                  disabled={cancelling}
                  className="btn btn-sm btn-cancel-countdown"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#DC2626',
                    border: '1.5px solid rgba(239,68,68,0.3)',
                    padding: '8px 16px',
                    fontWeight: 800,
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Cancel order within 2:30 minutes"
                >
                  <FiX size={15} />
                  {cancelling ? 'Cancelling...' : `Cancel (${formatCountdown(remainingSeconds)})`}
                </button>
              ) : (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-whatsapp-support"
                  style={{
                    background: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px',
                    fontWeight: 800,
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.35)'
                  }}
                  title="Need help with this order? Chat on WhatsApp"
                >
                  <FaWhatsapp size={16} />  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="container">
        {/* 2:30 min Cancellation Window Banner */}
        {canCancel && (
          <div className="cancellation-window-banner" style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: '#9A3412',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            lineHeight: 1.4
          }}>
            <span style={{ fontSize: 18 }}>⏱️</span>
            <div>
              <strong>Cancellation window: {formatCountdown(remainingSeconds)} left.</strong> After 2.30 minutes Apka order cancel nhi ho sakta..
            </div>
          </div>
        )}

        {cancellationExpired && (
          <div className="cancellation-window-banner" style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            lineHeight: 1.4
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <div>
                <strong>Order Confirmed:</strong> After 2.30 minutes Apka order cancel nhi ho sakta..
              </div>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: '#15803D',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: 12.5
              }}
            >
              <FaWhatsapp size={15} /> Chat on WhatsApp
            </a>
          </div>
        )}
        {/* Status Tracker */}
        {!isCancelled && (
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <div className="step-tracker">
              {MAIN_STEPS.map((stepId, i) => {
                const Icon = STEP_VISUALS[i];
                return (
                  <div key={stepId} style={{ display: 'contents' }}>
                    <div className={`step ${i <= currentIdx ? 'done' : ''} ${i === currentIdx ? 'active' : ''}`}>
                      <div className="step-circle">{i <= currentIdx ? <Icon size={17} /> : i + 1}</div>
                      <div className="step-label">{i === 3 && currentIdx === 3 ? STATUS_LABELS[order.status] : STATUS_LABELS[stepId]}</div>
                    </div>
                    {i < MAIN_STEPS.length - 1 && <div className={`step-line ${i < currentIdx ? 'done' : ''}`} />}
                  </div>
                );
              })}
            </div>
            <div className="tx-tracking-status">
              {STATUS_LABELS[order.status]}
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Estimated delivery: {order.estimatedDeliveryTime}
            </div>
          </div>
        )}

        {/* Delivery Agent Info */}
        {order.deliveryAgentName && !isCancelled && order.status !== 'delivered' && (
          <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.02)' }}>
            <span className="tx-icon-tile"><FiTruck size={24} /></span>
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
            <p style={{ color: 'var(--text-secondary)' }}>Enjoy your meal! / Grocery And Rate your experience.</p>
          </div>
        )}

        {/* Order Details */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}> Order Details</h3>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart'} ·  {formatAddress(order.deliveryAddress)}
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
          <div className="card" style={{ padding: 24, marginTop: 20, border: '1px solid #FED7AA', background: '#FFF7ED', textAlign: 'center' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--primary)' }}>Delivery Agent has Arrived!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Please share this Delivery PIN with your DeliveryBoy to receive your food and Grocery.
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
