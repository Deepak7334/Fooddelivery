import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_CFG = {
  assignment_pending: { label: 'New Assignment', color: '#F59E0B', icon: '' },
  out_for_delivery: { label: 'Assigned', color: '#F97316', icon: '' },
  accepted_by_driver: { label: 'Proceed to Restaurant', color: '#14B8A6', icon: '' },
  reached_restaurant: { label: 'Reached Restaurant', color: '#8B5CF6', icon: '' },
  picked_up: { label: 'Picked Up', color: '#3B82F6', icon: '' },
  on_the_way: { label: 'On The Way to Customer', color: '#06B6D4', icon: '' },
  reached_customer: { label: 'Reached Customer', color: '#EAB308', icon: '' },
  delivered: { label: 'Delivered', color: '#22C55E', icon: '' },
};

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
          <p style={{ color: '#9CA3AF', fontSize: 14, margin: '8px 0 0', lineHeight: 1.5 }}>Ask <strong style={{ color: '#E5E7EB' }}>{order?.customerId?.name || 'customer'}</strong> to share their OTP</p>
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

export default function DeliveryOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const location = useLocation();
  const orderFromState = location.state?.order;

  useEffect(() => {
    if (orderFromState) {
      setOrder(orderFromState);
      setLoading(false);
      // Still try to fetch fresh data in background if it's an active order, but silently
      api.get(`/delivery/order/${id}`).then(res => setOrder(res.data.order)).catch(() => {});
      return;
    }

    api.get(`/delivery/order/${id}`)
      .then(res => setOrder(res.data.order))
      .catch((err) => {
        console.error('Order load error:', err);
        const details = err.response ? `[${err.response.status}] ${err.response.data?.message || 'No msg'}` : err.message;
        toast.error(`Failed to load order: ${details}`);
      })
      .finally(() => setLoading(false));
     
  }, [id, orderFromState]);

  const handleStatusUpdate = async (status) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/delivery/orders/${order._id}/status`, { status });
      setOrder(res.data.order);
      toast.success(`Status updated: ${STATUS_CFG[status]?.label}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/delivery/orders/${order._id}/accept`);
      setOrder(res.data.order);
      toast.success('✅ Order accepted! Head to vendor to pick up.');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/delivery/orders/${order._id}/reject`);
      toast.success('Order rejected');
      navigate('/delivery/history');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleVerifyOTP = async (orderId, otp) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/delivery/orders/${orderId}/verify-otp`, { otp });
      toast.success(res.data.message || ' Delivery confirmed!');
      setShowOtp(false);
      navigate('/delivery/history');
    } catch (e) { toast.error(e.response?.data?.message || 'Wrong OTP'); }
    finally { setActionLoading(false); }
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

  if (!order) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Order not found.</div>
  );

  const vendorName = order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart';
  const vendorAddress = order.restaurantId?.address || order.storeId?.address || '—';
  const vendorPhone = order.restaurantId?.phone || order.storeId?.phone || '—';

  return (
    <>
      <style>{CSS}</style>
      {showOtp && <OTPModal order={order} onVerify={handleVerifyOTP} onClose={() => setShowOtp(false)} loading={actionLoading} />}

      <div style={S.root}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 24, marginRight: 12 }}>←</button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#E5E7EB' }}>Order Details</h1>
        </div>

        <div className="active-card" style={{ marginBottom: 16 }}>
          {/* Status banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{STATUS_CFG[order.status]?.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: STATUS_CFG[order.status]?.color }}>{STATUS_CFG[order.status]?.label}</div>
                <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>#{order._id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#22C55E', fontFamily: 'monospace' }}>₹{order.deliveryFee}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>delivery earning</div>
            </div>
          </div>

          {/* Progress steps */}
          <div className="progress-steps">
            {['accepted_by_driver', 'reached_restaurant', 'picked_up', 'reached_customer'].map((s, i) => {
              const statuses = ['assignment_pending', 'out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer', 'delivered'];
              const curIdx = statuses.indexOf(order.status);
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
            <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 14 }}>{vendorName}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{vendorAddress}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{vendorPhone}</div>
          </div>

          {/* Customer drop info */}
          <div className="info-section" style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}> Deliver To</div>
            <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 14 }}>{order.customerId?.name}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{order.deliveryAddress}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>📞 {order.customerId?.phone || order.customerPhone || 'N/A'}</div>
            {order.alternatePhone && <div style={{ fontSize: 12, color: '#9CA3AF' }}>📱 Alt: {order.alternatePhone}</div>}
          </div>

          {/* Items */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Order Items</div>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#D1D5DB', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{ fontFamily: 'monospace' }}>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <button className="map-btn" onClick={() => openMaps(vendorAddress)}>
              Vendor
            </button>
            <button className="map-btn green" onClick={() => openMaps(order.deliveryAddress)}>
              Customer
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(order.status === 'assignment_pending' || order.status === 'out_for_delivery') && (
              <>
                <button className="action-main" disabled={actionLoading} style={{ background: '#22C55E', flex: 2 }} onClick={handleAccept}>
                  ✅ Accept Order
                </button>
                <button className="action-main" disabled={actionLoading} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', flex: 1 }} onClick={handleReject}>
                  Reject
                </button>
              </>
            )}
            {order.status === 'accepted_by_driver' && (
              <button className="action-main" disabled={actionLoading} style={{ background: '#14B8A6' }} onClick={() => handleStatusUpdate('reached_restaurant')}>
                Reached Vendor
              </button>
            )}
            {order.status === 'reached_restaurant' && (
              <button className="action-main" disabled={actionLoading} style={{ background: '#8B5CF6' }} onClick={() => handleStatusUpdate('picked_up')}>
                Confirm Pickup
              </button>
            )}
            {order.status === 'picked_up' && (
              <button className="action-main" disabled={actionLoading} style={{ background: '#06B6D4' }} onClick={() => handleStatusUpdate('on_the_way')}>
                Start for Customer
              </button>
            )}
            {order.status === 'on_the_way' && (
              <button className="action-main" disabled={actionLoading} style={{ background: '#EAB308', color: '#000' }} onClick={() => handleStatusUpdate('reached_customer')}>
                Reached Customer
              </button>
            )}
            {order.status === 'reached_customer' && (
              <button className="action-main" disabled={actionLoading} style={{ background: '#22C55E' }} onClick={() => setShowOtp(true)}>
                Verify Delivery OTP
              </button>
            )}
            {order.status === 'delivered' && (
              <div style={{ padding: 12, textAlign: 'center', background: 'rgba(34,197,94,0.1)', color: '#22C55E', borderRadius: 12, fontWeight: 700, width: '100%' }}>
                ✅ Order Delivered Successfully
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#0F1117', minHeight: '100vh', padding: '16px', maxWidth: 540, margin: '0 auto', color: '#E5E7EB', paddingBottom: 32 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;700&display=swap');
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
* { box-sizing: border-box; }

.active-card { background: #161B22; border: 1px solid rgba(249,115,22,0.3); border-radius: 18px; padding: 20px; animation: fadeIn 0.3s ease; box-shadow: 0 0 24px rgba(249,115,22,0.08); }
.progress-steps { display: flex; align-items: flex-start; gap: 0; margin-bottom: 18px; }
.info-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px; margin-bottom: 12px; }

.map-btn { padding: 12px; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); border-radius: 10px; color: #3B82F6; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
.map-btn:hover { background: rgba(59,130,246,0.22); }
.map-btn.green { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #22C55E; }
.map-btn.green:hover { background: rgba(34,197,94,0.22); }

.action-main { flex: 1; padding: 14px; background: #F97316; border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; width: 100%; }
.action-main:hover { background: #EA6C0C; }
.action-main:disabled { opacity: 0.5; cursor: not-allowed; }
`;
