import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { formatAddress, getDeliveryCoords } from '../../utils/address';

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  assignment_pending:  { label: 'New Assignment',          color: '#F59E0B', icon: '✅ ' },
  out_for_delivery:    { label: 'Assigned',                color: '#F97316', icon: '✅ ' },
  accepted_by_driver:  { label: 'Go to Restaurant',        color: '#14B8A6', icon: '✅ ' },
  reached_restaurant:  { label: 'At Restaurant',           color: '#8B5CF6', icon: '✅ ' },
  picked_up:           { label: 'Order Picked Up',         color: '#3B82F6', icon: '✅' },
  on_the_way:          { label: 'Heading to Customer',     color: '#06B6D4', icon: '✅ ' },
  reached_customer:    { label: 'At Customer Door',        color: '#EAB308', icon: '✅ ' },
  delivered:           { label: 'Delivered',               color: '#22C55E', icon: '🎉' },
};

const PROGRESS_STEPS = [
  { key: 'accepted_by_driver', label: 'Accepted', icon: '✓ ' },
  { key: 'on_the_way',         label: 'On Way',   icon: '🚚' },
  { key: 'reached_customer',   label: 'Arrived',  icon: '📍' },
];

const STATUS_ORDER = ['assignment_pending','out_for_delivery','accepted_by_driver','reached_restaurant','picked_up','on_the_way','reached_customer','delivered'];

// ── OTP Modal ─────────────────────────────────────────────────────────────────
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
    <div className="dd-modal-backdrop">
      <div className="dd-modal">
        <div className="dd-modal-icon">🔐</div>
        <h2 className="dd-modal-title">Delivery OTP</h2>
        <p className="dd-modal-sub">
          Ask <strong>{order?.customerId?.name || 'customer'}</strong> for their OTP
        </p>
        <div className="dd-otp-row">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              value={d}
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              maxLength={1}
              className={`dd-otp-box${d ? ' filled' : ''}`}
            />
          ))}
        </div>
        <div className="dd-modal-actions">
          <button onClick={onClose} className="dd-btn-ghost">Cancel</button>
          <button
            onClick={submitOtp}
            disabled={loading || otp.join('').length !== 6}
            className="dd-btn-confirm"
          >
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
  const { theme, toggleTheme } = useTheme();
  const [activeOrders, setActiveOrders]   = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpOrder, setOtpOrder]           = useState(null);
  const [earnings, setEarnings]           = useState(null);
  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [activeRes, ordersRes, profileRes, earningsRes] = await Promise.allSettled([
        api.get('/delivery/orders/active'),
        api.get('/delivery/orders?status=assignment_pending'),
        api.get('/delivery/profile'),
        api.get('/delivery/earnings'),
      ]);
      if (activeRes.status === 'fulfilled') setActiveOrders(activeRes.value.data.orders || []);
      if (ordersRes.status === 'fulfilled') setPendingOrders(ordersRes.value.data.orders || []);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data.user);
      if (earningsRes.status === 'fulfilled') setEarnings(earningsRes.value.data.stats);
    } catch (e) { console.error('Failed to load dashboard data:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user?._id) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join_delivery_room', user._id);
    socket.on('delivery:new_assignment', (order) => {
      toast('New order assigned!', { icon: '🔔', duration: 8000 });
      setPendingOrders(prev => [order, ...prev.filter(o => o._id !== order._id)]);
    });
    socket.on('delivery:order_cancelled', ({ orderId }) => {
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      setActiveOrders(prev => {
        const next = prev.filter(o => o._id !== orderId);
        if (next.length < prev.length) toast.error('An active order was cancelled');
        return next;
      });
      setOtpOrder(prev => prev?._id === orderId ? null : prev);
    });
    return () => socket.disconnect();
  }, [user?._id]);

  const lastLocUpdateRef = useRef(0);

  useEffect(() => {
    if (!profile || profile.deliveryStatus === 'offline') return;
    let watchId;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        ({ coords: { latitude, longitude } }) => {
          const now = Date.now();
          if (now - lastLocUpdateRef.current > 5000) { // Throttle EVERYTHING (HTTP + Socket) to once every 5 seconds
            api.patch('/delivery/location', { lat: latitude, lng: longitude }).catch(() => {});
            socketRef.current?.emit('delivery:update_location', { agentId: user._id, lat: latitude, lng: longitude });
            lastLocUpdateRef.current = now;
          }
        },
        () => {}, // Silently ignore geo errors (e.g. user denied or desktop)
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
      );
    }
    return () => { if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.deliveryStatus, user?._id]);

  const handleAccept = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/delivery/orders/${orderId}/accept`);
      setActiveOrders(prev => [res.data.order, ...prev]);
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      toast.success('Order accepted! Head to restaurant.');
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
      setActiveOrders(prev => prev.map(o => o._id === orderId ? res.data.order : o));
      toast.success(`${STATUS_CFG[status]?.icon} ${STATUS_CFG[status]?.label}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleVerifyOTP = async (orderId, otp) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/delivery/orders/${orderId}/verify-otp`, { otp });
      toast.success(res.data.message || '🎉 Delivery confirmed!');
      setOtpOrder(null);
      setActiveOrders(prev => prev.filter(o => o._id !== orderId));
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
    } catch { toast.error('Failed to update availability'); }
  };

  const openMaps = (dest, coords) => {
    if (coords && coords.lat && coords.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`, '_blank');
    } else {
      const q = typeof dest === 'object' ? formatAddress(dest) : (dest || '');
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
    }
  };

  const isOnline = profile?.deliveryStatus !== 'offline';
  const isBusy   = profile?.deliveryStatus === 'busy';

  if (loading) return (
    <div className="dd-loader">
      <div className="dd-spinner" />
      <span>Loading your dashboard…</span>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      {otpOrder && (
        <OTPModal order={otpOrder} onVerify={handleVerifyOTP} onClose={() => setOtpOrder(null)} loading={actionLoading} />
      )}

      <div className="dd-root">

        {/* ── TOP BAR ── */}
        <header className="dd-topbar">
          <div className="dd-topbar-left">
            <div className="dd-avatar"></div>
            <div>
              <div className="dd-name">{profile?.name || user?.name}</div>
              <div className="dd-vehicle">{profile?.vehicleNumber || 'Delivery Partner'}</div>
            </div>
          </div>
          <div className="dd-topbar-right">
            <button
              onClick={toggleTheme}
              className="dd-theme-toggle"
              title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
              aria-label="Toggle Day / Night Mode"
            >
              {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
            <button
              className={`dd-status-toggle ${isOnline ? (isBusy ? 'busy' : 'online') : 'offline'}`}
              onClick={toggleAvailability}
            >
              <span className="dd-status-dot" />
              {isOnline ? (isBusy ? 'Busy' : 'Online') : 'Go Online'}
            </button>
          </div>
        </header>

        {/* ── EARNINGS STRIP ── */}
        <div className="dd-earnings-strip">
          <div className="dd-earn-card">
            <div className="dd-earn-label">Today</div>
            <div className="dd-earn-value green">₹{earnings?.todayEarnings || 0}</div>
            <div className="dd-earn-sub">{earnings?.todayDeliveries || 0} drops</div>
          </div>
          <div className="dd-earn-divider" />
          <div className="dd-earn-card">
            <div className="dd-earn-label">This Week</div>
            <div className="dd-earn-value cyan">₹{earnings?.weeklyEarnings || 0}</div>
            <div className="dd-earn-sub">earned</div>
          </div>
          <div className="dd-earn-divider" />
          <div className="dd-earn-card">
            <div className="dd-earn-label">All Time</div>
            <div className="dd-earn-value purple">{earnings?.totalDeliveries || 0}</div>
            <div className="dd-earn-sub">deliveries</div>
          </div>
        </div>

        {/* ── PENDING ASSIGNMENTS ── */}
        {pendingOrders.length > 0 && (
          <section className="dd-section">
            <div className="dd-section-header">
              <span className="dd-section-title amber">
                🔔 New Assignments
              </span>
              <span className="dd-badge-count amber">{pendingOrders.length}</span>
            </div>

            {pendingOrders.map(order => {
              const vendorName = order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart';
              const vendorAddress = formatAddress(order.restaurantId?.address || order.storeId?.address);
              const vendorPhone   = order.restaurantId?.phone   || order.storeId?.phone   || '—';
              const deliveryAddressText = formatAddress(order.deliveryAddress);
              const coords = getDeliveryCoords(order);
              return (
                <div key={order._id} className="dd-pending-card">
                  <div className="dd-pending-top">
                    <div>
                      <div className="dd-order-id">#{order._id ? order._id.slice(-8).toUpperCase() : 'N/A'}</div>
                      <div className="dd-vendor-name">{vendorName}</div>
                      <div className="dd-delivery-addr">📦 {vendorAddress} (📞 {vendorPhone})</div>
                      <div className="dd-delivery-addr">📍 {deliveryAddressText.length > 50 ? `${deliveryAddressText.slice(0, 50)}…` : deliveryAddressText}</div>
                      {coords && coords.lat && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 6 }}>
                          🧭 Navigate to Customer
                        </a>
                      )}
                    </div>
                    <div className="dd-earn-pill">
                      <div className="dd-earn-pill-amt">₹{order.deliveryFee ?? 0}</div>
                      <div className="dd-earn-pill-lbl">earn</div>
                    </div>
                  </div>
                  <div className="dd-items-preview">
                    {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' · ')}
                  </div>
                  <div className="dd-pending-actions">
                    <button
                      className="dd-btn-accept"
                      disabled={actionLoading}
                      onClick={() => handleAccept(order._id)}
                    >
                      ✓ Accept
                    </button>
                    <button
                      className="dd-btn-reject"
                      disabled={actionLoading}
                      onClick={() => handleReject(order._id)}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── ACTIVE ORDERS ── */}
        <section className="dd-section">
          <div className="dd-section-header">
            <span className="dd-section-title">Active Deliveries</span>
            {activeOrders.length > 0 && (
              <span className="dd-badge-count orange">{activeOrders.length}</span>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="dd-empty-state">
              <div className="dd-empty-icon"></div>
              <div className="dd-empty-title">No active delivery</div>
              <div className="dd-empty-sub">Accept an assignment to get started</div>
            </div>
          ) : (
            activeOrders.map(order => {
              const vendorName    = order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart';
              const vendorAddress = formatAddress(order.restaurantId?.address || order.storeId?.address);
              const vendorPhone   = order.restaurantId?.phone   || order.storeId?.phone   || '—';
              const deliveryAddressText = formatAddress(order.deliveryAddress);
              const coords        = getDeliveryCoords(order);
              const cfg           = STATUS_CFG[order.status] || {};
              const curIdx        = STATUS_ORDER.indexOf(order.status);

              return (
                <div key={order._id} className="dd-active-card">

                  {/* Status Header */}
                  <div className="dd-active-header" style={{ borderColor: cfg.color + '40' }}>
                    <div className="dd-status-info">
                      <span className="dd-status-icon">{cfg.icon}</span>
                      <div>
                        <div className="dd-status-label" style={{ color: cfg.color }}>{cfg.label}</div>
                        <div className="dd-order-id">#{order._id ? order._id.slice(-8).toUpperCase() : 'N/A'}</div>
                      </div>
                    </div>
                    <div className="dd-fee-display">
                      <div className="dd-fee-amt">₹{order.deliveryFee ?? 0}</div>
                      <div className="dd-fee-lbl">your cut</div>
                    </div>
                  </div>

                  {/* Progress Track */}
                  <div className="dd-progress-track">
                    {PROGRESS_STEPS.map((step, i) => {
                      const stepIdx = STATUS_ORDER.indexOf(step.key);
                      const done    = curIdx >= stepIdx || (step.key === 'picked_up' && curIdx >= STATUS_ORDER.indexOf('on_the_way'));
                      const active  = curIdx === stepIdx;
                      return (
                        <div key={step.key} className="dd-progress-step">
                          <div
                            className={`dd-step-circle${done ? ' done' : ''}${active ? ' active' : ''}`}
                            style={done ? { background: cfg.color, borderColor: cfg.color, boxShadow: active ? `0 0 0 3px ${cfg.color}30` : 'none' } : {}}
                          >
                            {done ? '✓' : step.icon}
                          </div>
                          <div className={`dd-step-label${done ? ' done' : ''}`}>{step.label}</div>
                          {i < PROGRESS_STEPS.length - 1 && (
                            <div className={`dd-step-connector${done ? ' done' : ''}`} style={done ? { background: cfg.color } : {}} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pickup Info */}
                  <div className="dd-info-block pickup">
                    <div className="dd-info-label">📦 Pickup</div>
                    <div className="dd-info-name">{vendorName}</div>
                    <div className="dd-info-detail">{vendorAddress}</div>
                    <div className="dd-info-detail">📞 {vendorPhone}</div>
                  </div>

                  {/* Drop Info */}
                  <div className="dd-info-block drop">
                    <div className="dd-info-label">🏠 Drop Off</div>
                    <div className="dd-info-name">{order.customerId?.name || order.customerName || 'Customer'}</div>
                    <div className="dd-info-detail">{deliveryAddressText}</div>
                    <div className="dd-info-detail">📞 {order.customerId?.phone || order.customerPhone || 'N/A'}</div>
                    {order.alternatePhone && <div className="dd-info-detail">📱 Alt: {order.alternatePhone}</div>}
                    {coords && coords.lat && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px', background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 6, fontWeight: 700 }}>
                           🧭 Open in Google Maps
                        </a>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="dd-items-list">
                    <div className="dd-items-header">Order Items</div>
                    {order.items?.map((item, i) => (
                      <div key={i} className="dd-item-row">
                        <span>{item.name} <span className="dd-item-qty">×{item.quantity}</span></span>
                        <span className="dd-item-price">₹{(item.price || 0) * (item.quantity || 1)}</span>
                      </div>
                    ))}
                    <div className="dd-items-total">
                      <span>Total</span>
                      <span>₹{order.finalAmount || 0}</span>
                    </div>
                  </div>

                  {/* Map Buttons */}
                  <div className="dd-map-row">
                    <button className="dd-map-btn blue" onClick={() => openMaps(vendorAddress)}>
                      Vendor Map
                    </button>
                    <button className="dd-map-btn green" onClick={() => openMaps(deliveryAddressText, coords)}>
                      Customer Map
                    </button>
                  </div>

                  {/* Action Button */}
                  <div className="dd-action-row" style={{ flexWrap: 'wrap' }}>
                    {order.status === 'accepted_by_driver' && (
                      <>
                        <button className="dd-action-btn teal" disabled={actionLoading} onClick={() => handleStatusUpdate(order._id, 'reached_restaurant')}>
                           At Vendor
                        </button>
                        <button className="dd-action-btn cyan" disabled={actionLoading} onClick={() => handleStatusUpdate(order._id, 'on_the_way')}>
                           Heading to Customer
                        </button>
                      </>
                    )}
                    {order.status === 'reached_restaurant' && (
                      <button className="dd-action-btn purple" disabled={actionLoading} onClick={() => handleStatusUpdate(order._id, 'picked_up')}>
                         Confirm Pickup
                      </button>
                    )}
                    {order.status === 'picked_up' && (
                      <button className="dd-action-btn cyan" disabled={actionLoading} onClick={() => handleStatusUpdate(order._id, 'on_the_way')}>
                         Heading to Customer
                      </button>
                    )}
                    {order.status === 'on_the_way' && (
                      <button className="dd-action-btn amber" disabled={actionLoading} onClick={() => handleStatusUpdate(order._id, 'reached_customer')}>
                         Arrived at Customer
                      </button>
                    )}
                    {order.status === 'reached_customer' && (
                      <button className="dd-action-btn green" disabled={actionLoading} onClick={() => setOtpOrder(order)}>
                         Verify OTP & Deliver
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {activeOrders.length === 0 && pendingOrders.length === 0 && (
          <div className="dd-idle-banner">
            <span>⚡</span> All caught up — waiting for new orders…
          </div>
        )}
      </div>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Loader ── */
.dd-loader {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--bg-dark); gap: 14px; font-family: 'Inter', sans-serif;
  color: var(--text-muted); font-size: 14px;
}
.dd-spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(249,115,22,0.2);
  border-top-color: #F97316;
  border-radius: 50%;
  animation: dd-spin 0.75s linear infinite;
}

/* ── Root ── */
.dd-root {
  font-family: 'Inter', sans-serif;
  background: transparent;
  min-height: auto;
  color: var(--text-primary);
  max-width: 600px;
  margin: 0 auto;
  padding: 0 0 48px;
}

/* ── Top Bar ── */
.dd-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 14px;
  gap: 12px;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.dd-topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.dd-avatar {
  width: 42px; height: 42px; flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #F97316, #EF4444);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.dd-name  { font-size: 15px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dd-vehicle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.dd-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.dd-theme-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--glass); border: 1px solid var(--border);
  color: var(--text-primary); cursor: pointer; transition: all 0.2s;
}
.dd-theme-toggle:hover {
  background: var(--glass-border);
}

.dd-status-toggle {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 20px;
  font-size: 12px; font-weight: 700;
  cursor: pointer;
  border: 1.5px solid;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
  white-space: nowrap;
}
.dd-status-toggle.online  { background: rgba(34,197,94,0.1);  border-color: rgba(34,197,94,0.4);  color: #22C55E; }
.dd-status-toggle.busy    { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.4); color: #F59E0B; }
.dd-status-toggle.offline { background: var(--glass); border-color: var(--border); color: var(--text-secondary); }
.dd-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
  animation: dd-pulse 2s ease infinite;
}
.dd-logout-btn {
  padding: 7px 12px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 10px;
  color: #EF4444; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: background 0.2s;
}
.dd-logout-btn:hover { background: rgba(239,68,68,0.18); }

/* ── Earnings Strip ── */
.dd-earnings-strip {
  display: flex;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
  gap: 0;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.dd-earn-card { flex: 1; text-align: center; }
.dd-earn-divider {
  width: 1px; background: var(--border);
  align-self: stretch; margin: 0 4px;
}
.dd-earn-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 5px; }
.dd-earn-value { font-size: 20px; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; }
.dd-earn-value.green  { color: #22C55E; }
.dd-earn-value.cyan   { color: #06B6D4; }
.dd-earn-value.purple { color: #A78BFA; }
.dd-earn-sub { font-size: 10px; color: var(--text-muted); margin-top: 3px; }

/* ── Sections ── */
.dd-section { margin-bottom: 20px; }
.dd-section-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
}
.dd-section-title {
  font-size: 12px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--text-muted);
}
.dd-section-title.amber { color: #F59E0B; }
.dd-badge-count {
  font-size: 11px; font-weight: 800;
  padding: 2px 8px; border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
}
.dd-badge-count.amber  { background: rgba(245,158,11,0.15); color: #F59E0B; }
.dd-badge-count.orange { background: rgba(249,115,22,0.15); color: #F97316; }

/* ── Pending Card ── */
.dd-pending-card {
  background: var(--bg-card);
  border: 1px solid rgba(245,158,11,0.3);
  box-shadow: var(--shadow-card);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  animation: dd-fadein 0.25s ease;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.dd-pending-top {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 12px; margin-bottom: 10px;
}
.dd-order-id  { font-family: 'JetBrains Mono', monospace; color: #F97316; font-size: 11px; font-weight: 700; margin-bottom: 3px; }
.dd-vendor-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.dd-delivery-addr { font-size: 12px; color: var(--text-secondary); margin-top: 3px; }
.dd-earn-pill { text-align: right; flex-shrink: 0; }
.dd-earn-pill-amt { font-size: 22px; font-weight: 900; color: #22C55E; font-family: 'JetBrains Mono', monospace; line-height: 1; }
.dd-earn-pill-lbl { font-size: 10px; color: var(--text-muted); }
.dd-items-preview { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.5; }
.dd-pending-actions { display: flex; gap: 10px; }
.dd-btn-accept {
  flex: 2; padding: 12px 10px;
  background: #F97316; border: none;
  border-radius: 12px; color: #fff;
  font-size: 14px; font-weight: 800;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.dd-btn-accept:hover:not(:disabled) { background: #EA6C0C; transform: translateY(-1px); }
.dd-btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }
.dd-btn-reject {
  flex: 1; padding: 12px 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 12px; color: #EF4444;
  font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: background 0.15s;
}
.dd-btn-reject:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.dd-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Active Card ── */
.dd-active-card {
  background: var(--bg-card);
  border: 1px solid rgba(249,115,22,0.25);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 16px;
  animation: dd-fadein 0.3s ease;
  box-shadow: var(--shadow-card);
  transition: background 0.25s ease, border-color 0.25s ease;
}
.dd-active-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}
.dd-status-info { display: flex; align-items: center; gap: 10px; }
.dd-status-icon { font-size: 26px; line-height: 1; }
.dd-status-label { font-size: 16px; font-weight: 800; }
.dd-fee-display { text-align: right; }
.dd-fee-amt { font-size: 24px; font-weight: 900; color: #22C55E; font-family: 'JetBrains Mono', monospace; line-height: 1; }
.dd-fee-lbl { font-size: 10px; color: var(--text-muted); }

/* ── Progress Track ── */
.dd-progress-track {
  display: flex; align-items: flex-start;
  margin-bottom: 18px;
  position: relative;
}
.dd-progress-step {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; position: relative;
}
.dd-step-circle {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--bg-card2);
  border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
  transition: all 0.3s;
  position: relative; z-index: 1;
  color: var(--text-muted);
}
.dd-step-circle.done { color: #fff; font-size: 14px; }
.dd-step-label {
  font-size: 9px; font-weight: 600;
  color: var(--text-muted);
  margin-top: 5px; text-align: center;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.dd-step-label.done { color: var(--text-primary); }
.dd-step-connector {
  position: absolute;
  top: 16px; left: calc(50% + 16px);
  width: calc(100% - 32px);
  height: 2px;
  background: var(--border);
  transition: background 0.3s;
}

/* ── Info Blocks ── */
.dd-info-block {
  border-radius: 12px; padding: 12px 14px; margin-bottom: 10px;
  border: 1px solid;
}
.dd-info-block.pickup {
  background: rgba(249,115,22,0.06);
  border-color: rgba(249,115,22,0.2);
}
.dd-info-block.drop {
  background: rgba(34,197,94,0.06);
  border-color: rgba(34,197,94,0.2);
}
.dd-info-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 5px; }
.dd-info-name { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; }
.dd-info-detail { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

/* ── Items List ── */
.dd-items-list { margin-bottom: 14px; }
.dd-items-header {
  font-size: 10px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.07em;
  margin-bottom: 8px;
}
.dd-item-row {
  display: flex; justify-content: space-between;
  font-size: 13px; color: var(--text-secondary);
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.dd-item-qty { color: var(--text-muted); }
.dd-item-price { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary); }
.dd-items-total {
  display: flex; justify-content: space-between;
  padding-top: 8px;
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  border-top: 1px solid var(--border);
}

/* ── Map Row ── */
.dd-map-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; margin-bottom: 12px;
}
.dd-map-btn {
  padding: 11px 8px;
  border-radius: 10px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: all 0.15s;
  border: 1px solid;
  white-space: nowrap;
}
.dd-map-btn.blue {
  background: rgba(59,130,246,0.1);
  border-color: rgba(59,130,246,0.3);
  color: #60A5FA;
}
.dd-map-btn.blue:hover { background: rgba(59,130,246,0.2); }
.dd-map-btn.green {
  background: rgba(34,197,94,0.1);
  border-color: rgba(34,197,94,0.3);
  color: #34D399;
}
.dd-map-btn.green:hover { background: rgba(34,197,94,0.2); }

/* ── Action Buttons ── */
.dd-action-row { display: flex; gap: 10px; }
.dd-action-btn {
  flex: 1; padding: 14px 12px;
  border: none; border-radius: 14px;
  color: #fff; font-size: 15px; font-weight: 800;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: all 0.15s;
  text-align: center;
}
.dd-action-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.dd-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dd-action-btn.teal   { background: linear-gradient(135deg, #14B8A6, #0D9488); }
.dd-action-btn.purple { background: linear-gradient(135deg, #8B5CF6, #7C3AED); }
.dd-action-btn.cyan   { background: linear-gradient(135deg, #06B6D4, #0891B2); }
.dd-action-btn.amber  { background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; }
.dd-action-btn.green  { background: linear-gradient(135deg, #22C55E, #16A34A); }

/* ── Empty / Idle States ── */
.dd-empty-state {
  text-align: center; padding: 36px 20px;
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
}
.dd-empty-icon  { font-size: 44px; margin-bottom: 10px; }
.dd-empty-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.dd-empty-sub   { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.dd-idle-banner {
  text-align: center; padding: 18px 20px;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.25);
  border-radius: 14px;
  color: #22C55E; font-weight: 700; font-size: 13px;
  margin-top: 4px;
}

/* ── OTP Modal ── */
.dd-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.dd-modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 32px 24px;
  width: 100%; max-width: 380px;
  animation: dd-fadein 0.2s ease;
  text-align: center;
  box-shadow: var(--shadow);
}
.dd-modal-icon  { font-size: 52px; margin-bottom: 12px; line-height: 1; }
.dd-modal-title { font-size: 22px; font-weight: 900; color: var(--text-primary); margin-bottom: 8px; }
.dd-modal-sub   { font-size: 14px; color: var(--text-secondary); margin-bottom: 28px; line-height: 1.6; }
.dd-modal-sub strong { color: var(--text-primary); }
.dd-otp-row {
  display: flex; gap: 8px; justify-content: center;
  margin-bottom: 28px;
}
.dd-otp-box {
  width: 46px; height: 56px;
  text-align: center;
  font-size: 26px; font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-card2);
  border: 2px solid var(--border);
  border-radius: 12px; color: var(--text-primary);
  outline: none; transition: all 0.2s;
}
.dd-otp-box.filled { border-color: #F97316; background: rgba(249,115,22,0.08); }
.dd-otp-box:focus  { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.2); }
.dd-modal-actions  { display: flex; gap: 10px; }
.dd-btn-ghost {
  flex: 1; padding: 13px;
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: 12px; color: var(--text-secondary);
  font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: background 0.15s;
}
.dd-btn-ghost:hover { background: var(--glass-border); }
.dd-btn-confirm {
  flex: 2; padding: 13px;
  background: #22C55E; border: none;
  border-radius: 12px; color: #fff;
  font-size: 15px; font-weight: 800;
  cursor: pointer; font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.dd-btn-confirm:hover:not(:disabled) { background: #16A34A; }
.dd-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Light Mode Specific Refinements ── */
:root[data-theme="light"] .dd-topbar,
:root[data-theme="light"] .dd-earnings-strip,
:root[data-theme="light"] .dd-pending-card,
:root[data-theme="light"] .dd-active-card,
:root[data-theme="light"] .dd-empty-state,
:root[data-theme="light"] .dd-modal {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.08);
}
:root[data-theme="light"] .dd-pending-card {
  border-color: rgba(245, 158, 11, 0.4);
}
:root[data-theme="light"] .dd-active-card {
  border-color: rgba(249, 115, 22, 0.35);
}
:root[data-theme="light"] .dd-earn-value.green,
:root[data-theme="light"] .dd-earn-pill-amt,
:root[data-theme="light"] .dd-fee-amt {
  color: #16A34A;
}
:root[data-theme="light"] .dd-earn-value.cyan {
  color: #0891B2;
}
:root[data-theme="light"] .dd-earn-value.purple {
  color: #7C3AED;
}
:root[data-theme="light"] .dd-map-btn.blue {
  background: rgba(37,99,235,0.08);
  border-color: rgba(37,99,235,0.25);
  color: #2563EB;
}
:root[data-theme="light"] .dd-map-btn.green {
  background: rgba(22,163,74,0.08);
  border-color: rgba(22,163,74,0.25);
  color: #16A34A;
}
:root[data-theme="light"] .dd-step-circle {
  background: #f1f5f9;
  border-color: rgba(0, 0, 0, 0.12);
}
:root[data-theme="light"] .dd-step-label.done {
  color: #1e293b;
}
:root[data-theme="light"] .dd-otp-box {
  background: #f8fafc;
  border-color: rgba(0, 0, 0, 0.15);
}
:root[data-theme="light"] .dd-idle-banner {
  background: rgba(22,163,74,0.08);
  border-color: rgba(22,163,74,0.22);
  color: #16A34A;
}

/* ── Animations ── */
@keyframes dd-spin    { to { transform: rotate(360deg); } }
@keyframes dd-pulse   { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
@keyframes dd-fadein  { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }

/* ── Responsive ── */
@media (max-width: 400px) {
  .dd-root { padding: 12px 12px 48px; }
  .dd-topbar { padding: 12px; border-radius: 14px; }
  .dd-name { font-size: 14px; }
  .dd-earnings-strip { padding: 14px 10px; }
  .dd-earn-value { font-size: 17px; }
  .dd-active-card { padding: 16px; }
  .dd-fee-amt { font-size: 20px; }
  .dd-action-btn { font-size: 14px; padding: 12px 8px; }
  .dd-otp-box { width: 40px; height: 50px; font-size: 22px; }
  .dd-status-toggle { padding: 6px 10px; font-size: 11px; }
  .dd-logout-btn { padding: 6px 10px; }
}

@media (min-width: 601px) {
  .dd-root { padding: 24px 24px 48px; }
  .dd-topbar { padding: 16px 20px; }
  .dd-earn-value { font-size: 22px; }
  .dd-active-card { padding: 24px; }
  .dd-fee-amt { font-size: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;
