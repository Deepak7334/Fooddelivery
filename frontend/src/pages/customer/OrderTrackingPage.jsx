import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = { pending: 'Order Placed', accepted: 'Accepted', preparing: 'Preparing', out_for_delivery: 'Out for Delivery', delivered: 'Delivered' };
const STATUS_ICONS = { pending: '📦', accepted: '✅', preparing: '👨‍🍳', out_for_delivery: '🛵', delivered: '🎉' };

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const socketRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    api.get(`/customer/orders/${id}`).then(res => {
      setOrder(res.data.order);
      if (res.data.order?.status === 'out_for_delivery') setOtpSent(true);
    }).catch(() => toast.error('Order not found')).finally(() => setLoading(false));

    // Socket connection
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current.emit('join_order_room', id);
    socketRef.current.on('order:status_update', (data) => {
      setOrder(prev => prev ? { ...prev, status: data.status, statusHistory: data.statusHistory } : prev);
      toast(`📦 Order status: ${STATUS_LABELS[data.status] || data.status}`, { icon: STATUS_ICONS[data.status] });
      if (data.status === 'out_for_delivery') setOtpSent(true);
    });
    socketRef.current.on('order:otp_sent', () => {
      setOtpSent(true);
      toast.success('OTP sent to your email! 📧');
    });

    return () => socketRef.current?.disconnect();
  }, [id]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      api.get(`/customer/orders/${id}`).then(res => setOrder(res.data.order)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { toast.error('Enter complete 6-digit OTP'); return; }
    setVerifying(true);
    try {
      const res = await api.post(`/customer/orders/${id}/verify-otp`, { otp: otpStr });
      if (res.data.success) {
        setOrder(prev => ({ ...prev, status: 'delivered', otpVerified: true }));
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setVerifying(false); }
  };

  if (loading) return <div style={{ padding: 120, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!order) return <div className="empty-state" style={{ paddingTop: 120 }}><div className="empty-state-icon">❌</div><h3>Order not found</h3></div>;

  const currentIdx = STATUSES.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            {order.status === 'delivered' ? '🎉 Delivered!' : isCancelled ? '❌ Cancelled' : '📍 Live Tracking'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Order #{order._id?.slice(-8).toUpperCase()}</p>
        </div>

        {/* Status Tracker */}
        {!isCancelled && (
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <div className="step-tracker">
              {STATUSES.map((status, i) => (
                <>
                  <div key={status} className={`step ${i <= currentIdx ? 'done' : ''} ${i === currentIdx ? 'active' : ''}`}>
                    <div className="step-circle">{i <= currentIdx ? STATUS_ICONS[status] : i + 1}</div>
                    <div className="step-label">{STATUS_LABELS[status]}</div>
                  </div>
                  {i < STATUSES.length - 1 && <div key={`line-${i}`} className={`step-line ${i < currentIdx ? 'done' : ''}`} />}
                </>
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

        {/* OTP Verification */}
        {order.status === 'out_for_delivery' && !order.otpVerified && (
          <div className="card" style={{ padding: 28, marginBottom: 20, border: '1px solid rgba(255,87,34,0.3)', animation: 'glow 2s infinite' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--primary)' }}>🔐 Enter Delivery OTP</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 0 }}>
              {otpSent ? 'An OTP has been sent to your email. Enter it to confirm delivery.' : 'OTP will be sent when delivery agent arrives.'}
            </p>
            {otpSent && (
              <>
                <div className="otp-inputs">
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el} type="text" maxLength={1} className="otp-input" value={digit}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      onKeyDown={e => handleOtpKeyDown(e, i)} />
                  ))}
                </div>
                <button onClick={handleVerifyOtp} disabled={verifying || otp.join('').length !== 6} className="btn btn-primary btn-full btn-lg">
                  {verifying ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Verifying...</> : '✅ Verify & Confirm Delivery'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Delivery confirmed */}
        {order.status === 'delivered' && (
          <div className="card" style={{ padding: 28, marginBottom: 20, background: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontWeight: 800, fontSize: 20, color: 'var(--success)', marginBottom: 8 }}>Delivery Confirmed!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Enjoy your meal! Rate your experience.</p>
          </div>
        )}

        {/* Order Details */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🧾 Order Details</h3>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            🏪 {order.restaurantName} · 📍 {order.deliveryAddress}
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
      </div>
    </div>
  );
}
