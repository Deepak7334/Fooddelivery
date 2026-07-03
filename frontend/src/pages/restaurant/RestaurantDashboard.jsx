import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30000;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.13)', dot: '#F59E0B' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: 'rgba(59,130,246,0.13)', dot: '#3B82F6' },
  preparing: { label: 'Preparing', color: '#8B5CF6', bg: 'rgba(139,92,246,0.13)', dot: '#8B5CF6' },
  out_for_delivery: { label: 'Out for Delivery', color: '#06B6D4', bg: 'rgba(6,182,212,0.13)', dot: '#06B6D4' },
  delivered: { label: 'Delivered', color: '#22C55E', bg: 'rgba(34,197,94,0.13)', dot: '#22C55E' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.13)', dot: '#EF4444' },
};

// Restaurant can only move orders up to 'preparing'. Admin handles dispatch.
const STATUS_FLOW = {
  pending: 'accepted',
  accepted: 'preparing',
  // out_for_delivery and beyond are admin-controlled
};

const STATUS_NEXT_LABEL = {
  pending: '✓ Accept Order',
  accepted: '🍳 Start Preparing',
};

const timeSince = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#9CA3AF', bg: 'rgba(156,163,175,0.13)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', color: cfg.color, background: cfg.bg,
      textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label}
    </span>
  );
}

function AnimatedNumber({ value, prefix = '' }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const start = typeof prev.current === 'number' ? prev.current : 0;
    const end = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (isNaN(end)) {
      // eslint-disable-next-line
      setDisplay(value); return;
    }
    const dur = 700, startTime = performance.now();
    const tick = (now) => {
      const t = Math.min((now - startTime) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (t < 1) requestAnimationFrame(tick);
      else { setDisplay(end); prev.current = end; }
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{typeof display === 'number' ? display.toLocaleString('en-IN') : display}</>;
}

// ── Order Detail Modal ────────────────────────────────────────────────────────

function OrderModal({ order, onClose, onAction, actionLoading }) {
  if (!order) return null;
  const nextStatus = STATUS_FLOW[order.status];
  const canCancel = order.status === 'pending';
  const isOFD = order.status === 'out_for_delivery';

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Order Details</div>
            <div style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 800, fontSize: 20, marginTop: 3 }}>
              #{order._id?.slice(-8).toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Pending alert */}
        {order.status === 'pending' && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
            This order is waiting for your confirmation
          </div>
        )}

        {/* OFD note */}
        {isOFD && (
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#06B6D4', fontWeight: 600 }}>
            OTP has been sent to customer's email. Customer will share it with the delivery agent.
          </div>
        )}

        {/* OTP display in dev mode */}
        {order._devOtp && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '2px dashed rgba(249,115,22,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Dev Mode — Delivery OTP</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#F97316', letterSpacing: 12, fontFamily: 'monospace' }}>{order._devOtp}</div>
          </div>
        )}

        {/* Customer Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Customer', value: order.customerId?.name || 'Customer' },
            { label: 'Phone', value: order.customerId?.phone || order.customerPhone || '—' },
            { label: 'Email', value: order.customerId?.email || order.customerEmail || '—', span: true },
            { label: 'Address', value: order.deliveryAddress, span: true },
            { label: 'Ordered', value: new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
            { label: 'Status', value: <StatusBadge status={order.status} /> },
          ].map(({ label, value, span }) => (
            <div key={label} style={{ ...(span ? { gridColumn: '1/-1' } : {}), background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Items Ordered</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13, color: '#E5E7EB' }}>
                <span> {item.name} × {item.quantity}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>
            <span>Subtotal</span><span>₹{order.totalAmount?.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>
            <span>Delivery Fee</span><span>₹{order.deliveryFee?.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#22C55E', fontSize: 18 }}>
            <span>Total</span><span>₹{order.finalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F59E0B' }}>
            <strong>Note:</strong> {order.specialInstructions}
          </div>
        )}

        {/* Status History */}
        {order.statusHistory?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Status Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[...order.statusHistory].reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#9CA3AF' }}>
                  <span><StatusBadge status={h.status} /></span>
                  <span>{new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {nextStatus && (
              <button
                disabled={actionLoading}
                onClick={() => onAction(order._id, nextStatus)}
                style={{ flex: 2, minWidth: 140, padding: '12px 18px', borderRadius: 10, border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, background: '#F97316', color: '#fff', opacity: actionLoading ? 0.6 : 1, transition: 'all 0.2s' }}>
                {actionLoading ? 'Updating…' : STATUS_NEXT_LABEL[order.status]}
              </button>
            )}
            {canCancel && (
              <button
                disabled={actionLoading}
                onClick={() => onAction(order._id, 'cancelled')}
                style={{ flex: 1, minWidth: 100, padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, background: 'rgba(239,68,68,0.1)', color: '#EF4444', opacity: actionLoading ? 0.6 : 1 }}>
                ✕ Reject
              </button>
            )}
          </div>
        )}
        {order.status === 'delivered' && (
          <div style={{ textAlign: 'center', color: '#22C55E', fontWeight: 700, fontSize: 16, padding: 8 }}>
            ✅ Order Delivered {order.otpVerified ? '· OTP Verified' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#1A2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto' },
};

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [sortBy, setSortBy] = useState('pending_first');

  const socketRef = useRef(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [sRes, rRes, oRes] = await Promise.all([
        api.get('/restaurant/stats'),
        api.get('/restaurant/my-restaurant'),
        api.get('/restaurant/orders'),
      ]);
      setStats(sRes.data.stats);
      setRestaurant(rRes.data.restaurant);
      setOrders(oRes.data.orders || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard fetch failed:', e);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(() => fetchAll(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Socket.IO for real-time order updates
  useEffect(() => {
    if (!user?.restaurantId) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join_restaurant_room', user.restaurantId);
    socket.on('order:new', (order) => {
      toast('🔔 New order received!', { icon: '📦', duration: 6000 });
      setOrders(prev => [order, ...prev]);
      setStats(prev => prev ? { ...prev, pendingOrders: (prev.pendingOrders || 0) + 1, todayOrders: (prev.todayOrders || 0) + 1 } : prev);
    });
    socket.on('order:updated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    });
    socket.on('order:cancelled', ({ orderId }) => {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o));
    });
    return () => socket.disconnect();
  }, [user?.restaurantId]);

  const handleAction = async (orderId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/restaurant/orders/${orderId}/status`, { status: newStatus });
      const updatedOrder = res.data.order;
      const devOtp = res.data.devOtp;

      // Merge devOtp into order for display in modal
      const enriched = devOtp ? { ...updatedOrder, _devOtp: devOtp } : updatedOrder;
      setOrders(prev => prev.map(o => o._id === orderId ? enriched : o));
      setSelectedOrder(prev => prev?._id === orderId ? enriched : prev);

      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Order marked as ${statusLabel}`);

      if (newStatus === 'out_for_delivery') {
        toast('OTP sent to customer\'s email!', { icon: '🔐', duration: 5000 });
        if (devOtp) toast(`🔐 Dev OTP: ${devOtp}`, { duration: 10000 });
      }
      if (newStatus === 'cancelled') {
        setSelectedOrder(null);
      }

      // Refresh stats
      fetchAll(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update order');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Filtering & Sorting ───────────────────────────────────────────────────

  const displayOrders = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    const q = filterSearch.toLowerCase();
    if (q && !o._id.includes(q) && !(o.customerId?.name || '').toLowerCase().includes(q) && !(o.customerPhone || '').includes(q)) return false;
    if (filterDate !== 'all') {
      const d = new Date(o.createdAt), now = new Date();
      if (filterDate === 'today' && d.toDateString() !== now.toDateString()) return false;
      if (filterDate === 'week' && d < new Date(now - 7 * 86400000)) return false;
      if (filterDate === 'month' && d < new Date(now - 30 * 86400000)) return false;
    }
    return true;
  }).sort((a, b) => {
    const ORDER = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (sortBy === 'pending_first') {
      const ai = ORDER.indexOf(a.status), bi = ORDER.indexOf(b.status);
      if (ai !== bi) return ai - bi;
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'amount_high') return (b.finalAmount || 0) - (a.finalAmount || 0);
    if (sortBy === 'amount_low') return (a.finalAmount || 0) - (b.finalAmount || 0);
    return 0;
  });

  const pendingOrders = orders.filter(o => o.status === 'pending').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const statCards = stats ? [
    { label: "Today's Orders", value: stats.todayOrders, icon: '📦', color: '#F97316' },
    { label: 'Pending', value: stats.pendingOrders, icon: '⏳', color: '#EAB308' },
    { label: 'Total Orders', value: stats.totalOrders, icon: '📋', color: '#8B5CF6' },
    { label: 'Revenue', value: stats.totalRevenue, prefix: '₹', icon: '💰', color: '#22C55E' },
    { label: 'Menu Items', value: stats.totalFoods, icon: '🍽️', color: '#06B6D4' },
  ] : [];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #F97316', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#9CA3AF', fontSize: 14, marginTop: 16 }}>Loading dashboard…</span>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      <OrderModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={handleAction}
        actionLoading={actionLoading}
      />

      <div style={styles.root}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}></span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                {restaurant?.name || 'Your Restaurant'}
                <span style={{ color: '#F97316' }}> Dashboard</span>
              </h1>
              {refreshing && <span className="pulse-dot" />}
            </div>
            <p style={{ fontSize: 13, margin: 0, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: restaurant?.isOpen ? '#22C55E' : '#EF4444', fontWeight: 600 }}>{restaurant?.isOpen ? '● Open' : '● Closed'}</span>
              <span>·</span>
              <span>{restaurant?.address}</span>
              {lastRefresh && <><span>·</span><span>Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></>}
            </p>
          </div>
          <button className="btn-refresh" onClick={() => fetchAll(true)} disabled={refreshing}>
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
            <span className="hide-xs">Refresh</span>
          </button>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
          {statCards.map(c => (
            <div key={c.label} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: c.color, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>
                    <AnimatedNumber value={c.value} prefix={c.prefix || ''} />
                  </div>
                </div>
                <span style={{ fontSize: 24, opacity: 0.85 }}>{c.icon}</span>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: c.color, opacity: 0.55, borderRadius: '0 0 12px 12px' }} />
            </div>
          ))}
        </div>

        {/* ── Pending Orders Alert Strip ─────────────────────────────────── */}
        {pendingOrders.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🔔</span>
                <span style={{ fontWeight: 800, color: '#F59E0B', fontSize: 14 }}>{pendingOrders.length} Pending Order{pendingOrders.length > 1 ? 's' : ''} — Need Action</span>
                <span className="pulse-dot" style={{ background: '#F59E0B' }} />
              </div>
              <button className="btn-outline-amber" onClick={() => { setActiveTab('orders'); setFilterStatus('pending'); }}>View All →</button>
            </div>

            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin', scrollbarColor: 'rgba(245,158,11,0.3) transparent' }}>
              {pendingOrders.map(o => (
                <div key={o._id} className="pending-card" onClick={() => setSelectedOrder(o)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 700, fontSize: 12 }}>#{o._id.slice(-8).toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '2px 7px', borderRadius: 10 }}>{timeSince(o.createdAt)}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#E5E7EB', marginBottom: 2, fontSize: 14 }}>{o.customerId?.name || 'Customer'}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10, lineHeight: 1.5 }}>{o.items?.map(i => `${i.name}×${i.quantity}`).join(' · ')}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#22C55E', fontSize: 16 }}>₹{o.finalAmount?.toLocaleString('en-IN')}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="acbtn accept" disabled={actionLoading} onClick={e => { e.stopPropagation(); handleAction(o._id, 'accepted'); }}>✓ Accept</button>
                    <button className="acbtn reject" disabled={actionLoading} onClick={e => { e.stopPropagation(); handleAction(o._id, 'cancelled'); }}>✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[['overview', 'Overview'], ['orders', 'Orders']].map(([t, l]) => (
            <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{l}</button>
          ))}
        </div>

        {/* ── Overview Tab ───────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>

            {/* Status breakdown */}
            <div className="panel">
              <h3 style={styles.panelTitle}>Order Status Breakdown</h3>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = orders.filter(o => o.status === key).length;
                const pct = orders.length ? (count / orders.length) * 100 : 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: '#D1D5DB' }}>{cfg.label}</span>
                      <span style={{ fontSize: 13, color: cfg.color, fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent activity */}
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={styles.panelTitle}>Recent Orders</h3>
                <button className="btn-outline-primary" onClick={() => navigate('/restaurant/orders')}>View All →</button>
              </div>
              {orders.slice(0, 8).map(o => (
                <div key={o._id} className="activity-row" onClick={() => setSelectedOrder(o)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', fontFamily: 'monospace' }}>#{o._id.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{o.customerId?.name || 'Customer'} · {timeSince(o.createdAt)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={o.status} />
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>₹{o.finalAmount?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <div style={{ color: '#6B7280', textAlign: 'center', padding: 24 }}>No orders yet</div>}
            </div>
          </div>
        )}

        {/* ── Orders Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="panel">

            {/* Filter Row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="filter-input"
                placeholder="🔍 Search order ID / name…"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                style={{ flex: '1 1 160px', minWidth: 140 }}
              />
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="filter-select" value={filterDate} onChange={e => setFilterDate(e.target.value)}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="pending_first">Pending First</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Highest Amount</option>
                <option value="amount_low">Lowest Amount</option>
              </select>
              <button className="btn-outline-primary" onClick={() => navigate('/restaurant/orders')}>Full Orders Page →</button>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 20, padding: '8px 0 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#9CA3AF', flexWrap: 'wrap' }}>
              <span><b style={{ color: '#E5E7EB' }}>{displayOrders.length}</b> orders</span>
              <span><b style={{ color: '#22C55E' }}>₹{displayOrders.reduce((s, o) => s + (o.finalAmount || 0), 0).toLocaleString('en-IN')}</b> revenue</span>
              <span><b style={{ color: '#F59E0B' }}>{displayOrders.filter(o => o.status === 'pending').length}</b> pending</span>
            </div>

            {/* Desktop Table */}
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Order ID', 'Customer', 'Items', 'Amount', 'Status', 'Time', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#6B7280' }}>No orders match your filters</td></tr>
                    : displayOrders.map((o, i) => {
                      const nextStatus = STATUS_FLOW[o.status];
                      const isPending = o.status === 'pending';
                      return (
                        <tr key={o._id} className={`trow${isPending ? ' pending-row' : ''}`} style={{ animationDelay: `${i * 0.015}s`, cursor: 'pointer' }} onClick={() => setSelectedOrder(o)}>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isPending && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'pulse 1.2s ease infinite' }} />}
                              <span style={{ fontFamily: 'monospace', color: '#F97316', fontSize: 12, fontWeight: 700 }}>#{o._id.slice(-8).toUpperCase()}</span>
                            </div>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: '#E5E7EB' }}>{o.customerId?.name || 'Customer'}</div>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>{o.customerId?.phone || o.customerPhone || '—'}</div>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle', color: '#9CA3AF', fontSize: 12 }}>{o.items?.map(i => `${i.name}×${i.quantity}`).join(', ')}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#22C55E' }}>₹{o.finalAmount?.toLocaleString('en-IN')}</span>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}><StatusBadge status={o.status} /></td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle', color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>{timeSince(o.createdAt)}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <button className="acbtn-sm info" onClick={() => setSelectedOrder(o)}>View</button>
                              {nextStatus && (
                                <button className="acbtn-sm accept" disabled={actionLoading} onClick={() => handleAction(o._id, nextStatus)}>
                                  {STATUS_CONFIG[nextStatus]?.label}
                                </button>
                              )}
                              {o.status === 'pending' && (
                                <button className="acbtn-sm reject" disabled={actionLoading} onClick={() => handleAction(o._id, 'cancelled')}>Reject</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards">
              {displayOrders.length === 0
                ? <div style={{ textAlign: 'center', padding: 48, color: '#6B7280' }}>No orders match your filters</div>
                : displayOrders.map((o, i) => {
                  const nextStatus = STATUS_FLOW[o.status];
                  const isPending = o.status === 'pending';
                  return (
                    <div key={o._id} className={`mobile-order-card${isPending ? ' pending-glow' : ''}`} style={{ animationDelay: `${i * 0.02}s` }} onClick={() => setSelectedOrder(o)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isPending && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'pulse 1.2s ease infinite' }} />}
                          <span style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 700, fontSize: 13 }}>#{o._id.slice(-8).toUpperCase()}</span>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 14 }}>{o.customerId?.name || 'Customer'}</span>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{o.customerId?.phone || '—'}</div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#22C55E', fontSize: 15 }}>₹{o.finalAmount?.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>{o.items?.map(it => `${it.name}×${it.quantity}`).join(' · ')} · {timeSince(o.createdAt)}</div>
                      {(nextStatus || o.status === 'pending') && (
                        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                          {nextStatus && <button className="acbtn accept" style={{ flex: 2 }} disabled={actionLoading} onClick={() => handleAction(o._id, nextStatus)}>{STATUS_NEXT_LABEL[o.status]}</button>}
                          {o.status === 'pending' && <button className="acbtn reject" disabled={actionLoading} onClick={() => handleAction(o._id, 'cancelled')}>✕ Reject</button>}
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#0F1117', minHeight: '100vh', padding: '24px 16px', color: '#E5E7EB', maxWidth: 1300, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  panelTitle: { fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 14, marginTop: 0 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;700&display=swap');
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity:0;transform:translateY(6px); } to { opacity:1;transform:none; } }
@keyframes pulse  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(1.6);} }
* { box-sizing: border-box; }

/* Stat Cards */
.stat-card {
  background:#161B22;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;
  position:relative;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;animation:fadeIn 0.4s ease both;
}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.45);}

/* Panel */
.panel{background:#161B22;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px;animation:fadeIn 0.4s ease both;}

/* Pending Card */
.pending-card{background:#1A2030;border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:14px;
  min-width:220px;max-width:240px;flex-shrink:0;cursor:pointer;transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s;}
.pending-card:hover{transform:translateY(-3px);border-color:rgba(245,158,11,0.6);box-shadow:0 8px 24px rgba(245,158,11,0.14);}
.pending-glow{border-color:rgba(245,158,11,0.35)!important;}

/* Pulse dot */
.pulse-dot{display:inline-block;width:8px;height:8px;background:#22C55E;border-radius:50%;animation:pulse 1.2s ease infinite;}

/* Tabs */
.tab-btn{background:none;border:none;border-bottom:2px solid transparent;padding:10px 16px 12px;cursor:pointer;
  color:#6B7280;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all 0.2s;margin-bottom:-1px;}
.tab-btn:hover{color:#D1D5DB;}
.tab-btn.active{color:#F97316;border-bottom-color:#F97316;}

/* Buttons */
.btn-refresh{display:flex;align-items:center;gap:6px;padding:9px 14px;background:rgba(249,115,22,0.12);
  border:1px solid rgba(249,115,22,0.3);border-radius:8px;color:#F97316;font-family:'DM Sans',sans-serif;
  font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;}
.btn-refresh:hover{background:rgba(249,115,22,0.22);}
.btn-refresh:disabled{opacity:0.5;cursor:not-allowed;}

.btn-outline-amber{padding:6px 14px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
  border-radius:8px;color:#F59E0B;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;}
.btn-outline-amber:hover{background:rgba(245,158,11,0.22);}

.btn-outline-primary{padding:7px 14px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);
  border-radius:8px;color:#F97316;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.btn-outline-primary:hover{background:rgba(249,115,22,0.22);}

/* Action buttons (cards) */
.acbtn{padding:8px 12px;border-radius:8px;border:none;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;flex:1;}
.acbtn.accept{background:#F97316;color:#fff;}
.acbtn.accept:hover{background:#EA6C0C;}
.acbtn.reject{background:rgba(239,68,68,0.12);color:#EF4444;border:1px solid rgba(239,68,68,0.3);}
.acbtn.reject:hover{background:rgba(239,68,68,0.22);}
.acbtn:disabled{opacity:0.5;cursor:not-allowed;}

/* Action buttons (table) */
.acbtn-sm{padding:5px 9px;border-radius:6px;border:none;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.acbtn-sm.accept{background:rgba(249,115,22,0.14);color:#F97316;border:1px solid rgba(249,115,22,0.3);}
.acbtn-sm.accept:hover{background:rgba(249,115,22,0.28);}
.acbtn-sm.reject{background:rgba(239,68,68,0.1);color:#EF4444;border:1px solid rgba(239,68,68,0.25);}
.acbtn-sm.reject:hover{background:rgba(239,68,68,0.2);}
.acbtn-sm.info{background:rgba(255,255,255,0.05);color:#9CA3AF;border:1px solid rgba(255,255,255,0.1);}
.acbtn-sm.info:hover{color:#E5E7EB;background:rgba(255,255,255,0.1);}
.acbtn-sm:disabled{opacity:0.5;cursor:not-allowed;}

/* Inputs */
.filter-input{padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
  border-radius:8px;color:#E5E7EB;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color 0.2s;}
.filter-input::placeholder{color:#4B5563;}
.filter-input:focus{border-color:rgba(249,115,22,0.5);}
.filter-select{padding:9px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
  border-radius:8px;color:#E5E7EB;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;outline:none;}
.filter-select option{background:#1F2937;}

/* Table */
.table-wrap{overflow-x:auto;display:block;}
.trow{animation:fadeIn 0.25s ease both;cursor:pointer;}
.trow:hover td{background:rgba(255,255,255,0.025);}
.pending-row td{background:rgba(245,158,11,0.04)!important;}
.pending-row:hover td{background:rgba(245,158,11,0.08)!important;}

/* Activity row */
.activity-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:all 0.15s;border-radius:6px;}
.activity-row:last-child{border-bottom:none;}
.activity-row:hover{background:rgba(255,255,255,0.03);padding-left:6px;padding-right:6px;}

/* Mobile Cards */
.mobile-cards{display:none;flex-direction:column;gap:10px;margin-top:12px;}
.mobile-order-card{background:#1A2030;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px;cursor:pointer;transition:border-color 0.2s;animation:fadeIn 0.25s ease both;}
.mobile-order-card:hover{border-color:rgba(249,115,22,0.3);}

/* Responsive */
@media(max-width:768px){.table-wrap{display:none;} .mobile-cards{display:flex;}}
@media(max-width:560px){.filter-select,.filter-input{font-size:12px;padding:8px 8px;} .hide-xs{display:none;} .pending-card{min-width:200px;} .tab-btn{padding:8px 10px 10px;font-size:12px;}}
`;
