import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  assignment_pending: { label: 'New Assignment', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: '' },
  out_for_delivery: { label: 'Assigned', color: '#F97316', bg: 'rgba(249,115,22,0.15)', icon: '' },
  accepted_by_driver: { label: 'Proceed to Restaurant', color: '#14B8A6', bg: 'rgba(20,184,166,0.15)', icon: '' },
  reached_restaurant: { label: 'Reached Restaurant', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', icon: '' },
  picked_up: { label: 'Picked Up', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', icon: '' },
  on_the_way: { label: 'On The Way to Customer', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', icon: '' },
  reached_customer: { label: 'Reached Customer', color: '#EAB308', bg: 'rgba(234,179,8,0.15)', icon: '' },
  delivered: { label: 'Delivered', color: '#22C55E', bg: 'rgba(34,197,94,0.15)', icon: '' },
};

const AGENT_STATUS_COLOR = { available: '#22C55E', busy: '#F59E0B', offline: '#6B7280' };

// ── OTP Verify Modal ──────────────────────────────────────────────────────────
function OTPModal({ order, onVerify, onClose, loading }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);

  const handleInput = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const submitOtp = () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter all 6 digits'); return; }
    onVerify(order._id, code);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1A2030', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Enter Delivery OTP</h2>
          <p style={{ color: '#9CA3AF', fontSize: 14, margin: '8px 0 0', lineHeight: 1.5 }}>Ask <strong style={{ color: '#E5E7EB' }}>{order?.customerId?.name || 'customer'}</strong> to share their OTP from the email/app</p>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          {otp.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              value={d}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              maxLength={1}
              style={{ width: 46, height: 54, textAlign: 'center', fontSize: 24, fontWeight: 800, fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', border: `2px solid ${d ? '#F97316' : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, color: '#E5E7EB', outline: 'none', transition: 'border-color 0.2s' }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#9CA3AF', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submitOtp} disabled={loading || otp.join('').length !== 6}
            style={{ flex: 2, padding: 13, background: '#22C55E', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Verifying…' : '✅ Confirm Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [activeRes, ordersRes, profileRes, earningsRes] = await Promise.all([
        api.get('/delivery/orders/active'),
        api.get('/delivery/orders?status=assignment_pending'),
        api.get('/delivery/profile'),
        api.get('/delivery/earnings'),
      ]);
      setActiveOrder(activeRes.data.order || null);
      setPendingOrders(ordersRes.data.orders || []);
      setProfile(profileRes.data.user);
      setEarnings(earningsRes.data.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Socket for real-time order assignment
  useEffect(() => {
    if (!user?._id) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

    socket.emit('join_delivery_room', user._id);
    socket.on('delivery:new_assignment', (order) => {
      toast(' New order assigned!', { icon: '🔔', duration: 8000 });
      setPendingOrders(prev => [order, ...prev.filter(o => o._id !== order._id)]);
    });

    socket.on('delivery:order_cancelled', ({ orderId }) => {
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      if (activeOrder?._id === orderId) { setActiveOrder(null); toast.error('Order was cancelled'); }
    });
    return () => socket.disconnect();
  }, [user?._id, activeOrder?._id]);

  // Live GPS Tracking
  useEffect(() => {
    if (!profile || profile.deliveryStatus === 'offline') return;

    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          api.patch('/delivery/location', { lat: latitude, lng: longitude }).catch(() => { });
          if (socketRef.current && user?._id) {
            socketRef.current.emit('delivery:update_location', { agentId: user._id, lat: latitude, lng: longitude });
          }
        },
        (error) => console.log('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [profile?.deliveryStatus, user?._id]);

  const handleAccept = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/delivery/orders/${orderId}/accept`);
      setActiveOrder(res.data.order);
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      toast.success('✅ Order accepted! Head to restaurant to pick up.');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async (orderId) => {
    setActionLoading(true);
    try {
      await api.patch(`/delivery/orders/${orderId}/reject`);
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      toast('Order rejected', { icon: '↩️' });
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleStatusUpdate = async (orderId, status) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/delivery/orders/${orderId}/status`, { status });
      setActiveOrder(res.data.order);
      toast.success(`Status updated: ${STATUS_CFG[status]?.label}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleVerifyOTP = async (orderId, otp) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/delivery/orders/${orderId}/verify-otp`, { otp });
      toast.success(res.data.message || ' Delivery confirmed!');
      setShowOTP(false);
      setActiveOrder(null);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Wrong OTP'); }
    finally { setActionLoading(false); }
  };

  const toggleAvailability = async () => {
    const newStatus = profile?.deliveryStatus === 'offline' ? 'available' : 'offline';
    try {
      const res = await api.patch('/delivery/availability', { deliveryStatus: newStatus });
      setProfile(res.data.user);
      toast.success(`You are now ${newStatus}`);
    } catch (e) { toast.error('Failed to update availability'); }
  };

  const openMaps = (address) => {
    const q = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#9CA3AF', marginTop: 14, fontSize: 14 }}>Loading…</span>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      {showOTP && activeOrder && <OTPModal order={activeOrder} onVerify={handleVerifyOTP} onClose={() => setShowOTP(false)} loading={actionLoading} />}

      <div style={S.root}>

        {/* ── Top Bar ─────────────────────────────────────────── */}
        <div style={S.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#F97316,#EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🚴</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#E5E7EB' }}>{profile?.name || user?.name}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{profile?.vehicleNumber || 'Delivery Partner'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="toggle-avail" onClick={toggleAvailability}
              style={{ background: profile?.deliveryStatus === 'offline' ? 'rgba(107,114,128,0.15)' : 'rgba(34,197,94,0.15)', borderColor: AGENT_STATUS_COLOR[profile?.deliveryStatus || 'available'] + '50', color: AGENT_STATUS_COLOR[profile?.deliveryStatus || 'available'] }}>
              ● {profile?.deliveryStatus === 'offline' ? 'Go Online' : profile?.deliveryStatus === 'busy' ? 'Busy' : 'Online'}
            </button>
            <button onClick={() => logout()} style={{ padding: '7px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>

        {/* ── Stats Row ───────────────────────────────────────── */}
        <div className="stats-row">
          {[
            { label: "Today's Earnings", value: `₹${earnings?.todayEarnings || 0}`, sub: `${earnings?.todayDeliveries || 0} deliveries`, color: '#22C55E' },
            { label: 'This Week', value: `₹${earnings?.weeklyEarnings || 0}`, sub: 'in earnings', color: '#06B6D4' },
            { label: 'Total Deliveries', value: earnings?.totalDeliveries || 0, sub: 'all time', color: '#8B5CF6' },
          ].map(c => (
            <div key={c.label} className="stat-chip">
              <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: c.color, fontFamily: 'monospace', margin: '3px 0' }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── ACTIVE ORDER ────────────────────────────────────── */}
        {activeOrder ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Active Delivery</div>
            <div className="active-card">
              {/* Status banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{STATUS_CFG[activeOrder.status]?.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: STATUS_CFG[activeOrder.status]?.color }}>{STATUS_CFG[activeOrder.status]?.label}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>#{activeOrder._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: '#22C55E', fontFamily: 'monospace' }}>₹{activeOrder.deliveryFee}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>delivery earning</div>
                </div>
              </div>

              {/* Progress steps */}
              <div className="progress-steps">
                {['accepted_by_driver', 'reached_restaurant', 'picked_up', 'reached_customer'].map((s, i) => {
                  const statuses = ['assignment_pending', 'out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer', 'delivered'];
                  const curIdx = statuses.indexOf(activeOrder.status);
                  const myIdx = statuses.indexOf(s);
                  const done = curIdx >= myIdx || (s === 'picked_up' && curIdx >= statuses.indexOf('on_the_way'));
                  const active = curIdx === myIdx || (s === 'picked_up' && curIdx === statuses.indexOf('on_the_way'));

                  return (
                    <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? STATUS_CFG[s]?.color || '#F97316' : 'rgba(255,255,255,0.07)', border: `2px solid ${done ? STATUS_CFG[s]?.color || '#F97316' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all 0.3s', boxShadow: active ? `0 0 12px ${STATUS_CFG[s]?.color}60` : 'none' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: 9, color: done ? '#E5E7EB' : '#4B5563', marginTop: 4, textAlign: 'center', fontWeight: done ? 700 : 400 }}>
                        {['Go Rest', 'Reached', 'Pick/Run', 'Done'][i]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Restaurant pickup info */}
              <div className="info-section">
                <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Pickup</div>
                <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 14 }}>{activeOrder.restaurantId?.name}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{activeOrder.restaurantId?.address}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{activeOrder.restaurantId?.phone}</div>
              </div>

              {/* Customer drop info */}
              <div className="info-section" style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}> Deliver To</div>
                <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 14 }}>{activeOrder.customerId?.name}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{activeOrder.deliveryAddress}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>📞 {activeOrder.customerId?.phone || activeOrder.customerPhone || 'N/A'}</div>
                {activeOrder.alternatePhone && <div style={{ fontSize: 12, color: '#9CA3AF' }}>📱 Alt: {activeOrder.alternatePhone}</div>}
              </div>

              {/* Items */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Order Items</div>
                {activeOrder.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#D1D5DB', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>{item.name} × {item.quantity}</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <button className="map-btn" onClick={() => openMaps(activeOrder.restaurantId?.address)}>
                  Restaurant
                </button>
                <button className="map-btn green" onClick={() => openMaps(activeOrder.deliveryAddress)}>
                  Customer
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {activeOrder.status === 'accepted_by_driver' && (
                  <button className="action-main" disabled={actionLoading} style={{ background: '#14B8A6' }} onClick={() => handleStatusUpdate(activeOrder._id, 'reached_restaurant')}>
                    Reached Restaurant
                  </button>
                )}
                {activeOrder.status === 'reached_restaurant' && (
                  <button className="action-main" disabled={actionLoading} style={{ background: '#8B5CF6' }} onClick={() => handleStatusUpdate(activeOrder._id, 'picked_up')}>
                    Confirm Pickup
                  </button>
                )}
                {activeOrder.status === 'picked_up' && (
                  <button className="action-main" disabled={actionLoading} style={{ background: '#06B6D4' }} onClick={() => handleStatusUpdate(activeOrder._id, 'on_the_way')}>
                    Start for Customer
                  </button>
                )}
                {activeOrder.status === 'on_the_way' && (
                  <button className="action-main" disabled={actionLoading} style={{ background: '#EAB308', color: '#000' }} onClick={() => handleStatusUpdate(activeOrder._id, 'reached_customer')}>
                    Reached Customer Location
                  </button>
                )}
                {activeOrder.status === 'reached_customer' && (
                  <button className="action-otp" disabled={actionLoading} onClick={() => setShowOTP(true)}>
                    Ask for OTP & Deliver
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)', marginBottom: 20 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}></div>
            <div style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>No active delivery</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>Accept an order below to start</div>
          </div>
        )}

        {/* ── PENDING ASSIGNMENTS ─────────────────────────────── */}
        {pendingOrders.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🔔 New Assignments ({pendingOrders.length})
              </div>
              <span className="pulse-dot" style={{ background: '#F59E0B' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingOrders.map(order => (
                <div key={order._id} className="pending-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 700, fontSize: 12 }}>#{order._id.slice(-8).toUpperCase()}</div>
                      <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 15, marginTop: 2 }}>{order.restaurantId?.name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>→ {order.deliveryAddress?.slice(0, 40)}…</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', fontFamily: 'monospace' }}>₹{order.deliveryFee}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>earn</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
                    {order.items?.map(i => `${i.name}×${i.quantity}`).join(', ')}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-accept" disabled={actionLoading || !!activeOrder} onClick={() => handleAccept(order._id)}>
                      ✓ Accept Order
                    </button>
                    <button className="btn-reject" disabled={actionLoading} onClick={() => handleReject(order._id)}>
                      ✕ Reject
                    </button>
                  </div>
                  {activeOrder && <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 8, textAlign: 'center' }}>Complete current delivery before accepting a new one</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!activeOrder && pendingOrders.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '28px 20px', background: 'rgba(34,197,94,0.04)', borderRadius: 16, border: '1px solid rgba(34,197,94,0.15)', color: '#22C55E', fontWeight: 700 }}>
            All caught up! Waiting for new orders…
          </div>
        )}
      </div>
    </>
  );
}

const S = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#0F1117', minHeight: '100vh', padding: '16px', maxWidth: 540, margin: '0 auto', color: '#E5E7EB', paddingBottom: 32 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 16px', background: '#161B22', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;700&display=swap');
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes pulse  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(1.6);} }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
* { box-sizing: border-box; }

.toggle-avail { padding: 7px 14px; border: 1px solid; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }

.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.stat-chip { background: #161B22; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; }

.active-card { background: #161B22; border: 1px solid rgba(249,115,22,0.3); border-radius: 18px; padding: 20px; animation: fadeIn 0.3s ease; box-shadow: 0 0 24px rgba(249,115,22,0.08); }

.progress-steps { display: flex; align-items: flex-start; gap: 0; margin-bottom: 18px; }

.info-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px; margin-bottom: 12px; }

.map-btn { padding: 12px; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); border-radius: 10px; color: #3B82F6; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
.map-btn:hover { background: rgba(59,130,246,0.22); }
.map-btn.green { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #22C55E; }
.map-btn.green:hover { background: rgba(34,197,94,0.22); }

.action-main { flex: 1; padding: 14px; background: #F97316; border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
.action-main:hover { background: #EA6C0C; }
.action-main:disabled { opacity: 0.5; cursor: not-allowed; }

.action-otp { flex: 1; padding: 14px; background: rgba(34,197,94,0.15); border: 2px solid rgba(34,197,94,0.4); border-radius: 12px; color: #22C55E; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
.action-otp:hover { background: rgba(34,197,94,0.25); }
.action-otp:disabled { opacity: 0.5; cursor: not-allowed; }

.pending-card { background: #161B22; border: 1px solid rgba(245,158,11,0.3); border-radius: 14px; padding: 16px; animation: fadeIn 0.25s ease; }

.btn-accept { flex: 2; padding: 11px; background: #F97316; border: none; border-radius: 10px; color: #fff; font-weight: 800; font-size: 14px; cursor: pointer; font-family:'DM Sans',sans-serif; transition: all 0.2s; }
.btn-accept:hover { background: #EA6C0C; }
.btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-reject { flex: 1; padding: 11px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; color: #EF4444; font-weight: 700; font-size: 13px; cursor: pointer; font-family:'DM Sans',sans-serif; }
.btn-reject:hover { background: rgba(239,68,68,0.2); }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

.pulse-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; animation: pulse 1.2s ease infinite; }
`;
