import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  accepted:         { label: 'Accepted',          color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  preparing:        { label: 'Preparing',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  out_for_delivery: { label: 'Out for Delivery',  color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  delivered:        { label: 'Delivered',          color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  cancelled:        { label: 'Cancelled',          color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

const AGENT_STATUS_COLOR = { available: '#22C55E', busy: '#F59E0B', offline: '#6B7280' };

// Admin can move any order forward or cancel
const ADMIN_NEXT = {
  pending:          ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  preparing:        ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  );
}

// ── Order Detail Modal ─────────────────────────────────────────────────────

function OrderModal({ order, agents, onClose, onStatusChange, onAssignAgent, loading }) {
  const [selectedAgent, setSelectedAgent] = useState(order?.deliveryAgentId?._id || order?.deliveryAgentId || '');

  useEffect(() => {
    setSelectedAgent(order?.deliveryAgentId?._id || order?.deliveryAgentId || '');
  }, [order]);

  if (!order) return null;

  const nextStatuses = ADMIN_NEXT[order.status] || [];
  const isOFD = order.status === 'out_for_delivery';
  const needsAgent = order.status === 'preparing';
  const availableAgents = agents.filter(a => a.isActive && (a.deliveryStatus === 'available' || a._id === selectedAgent));

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>🔑 Admin — Order Details</div>
            <div style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 800, fontSize: 20, marginTop: 3 }}>#{order._id?.slice(-8).toUpperCase()}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        {/* OFD note */}
        {isOFD && (
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#06B6D4', fontWeight: 600 }}>
            🚴 Out for delivery — OTP has been sent to customer. Agent collecting OTP at doorstep.
          </div>
        )}
        {order._devOtp && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '2px dashed rgba(249,115,22,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Dev Mode — OTP</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#F97316', letterSpacing: 12, fontFamily: 'monospace' }}>{order._devOtp}</div>
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Customer', value: order.customerId?.name || '—' },
            { label: 'Phone', value: order.customerId?.phone || order.customerPhone || '—' },
            { label: 'Email', value: order.customerId?.email || order.customerEmail || '—', span: true },
            { label: 'Address', value: order.deliveryAddress || '—', span: true },
            { label: 'Restaurant', value: typeof order.restaurantId === 'object' ? order.restaurantId?.name : order.restaurantName },
            { label: 'Status', value: <StatusBadge status={order.status} /> },
          ].map(({ label, value, span }) => (
            <div key={label} style={{ ...(span ? { gridColumn: '1/-1' } : {}), background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Items</div>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 4, fontSize: 13, color: '#E5E7EB' }}>
              <span>🍽 {item.name} × {item.quantity}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
            <span style={{ fontWeight: 800, color: '#22C55E', fontSize: 17 }}>Total: ₹{order.finalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Delivery Agent Assignment */}
        {order.deliveryAgentId ? (
          <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Assigned Delivery Agent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🚴</span>
              <div>
                <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 15 }}>{order.deliveryAgentId?.name || order.deliveryAgentName}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{order.deliveryAgentId?.phone} {order.deliveryAgentId?.vehicleNumber && `· ${order.deliveryAgentId.vehicleNumber}`}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: AGENT_STATUS_COLOR[order.deliveryAgentId?.deliveryStatus || 'busy'] }}>● {order.deliveryAgentId?.deliveryStatus || 'busy'}</span>
            </div>
          </div>
        ) : needsAgent ? (
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#F97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>⚠️ Assign Delivery Agent Before Dispatching</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                style={{ flex: 1, padding: '9px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#E5E7EB', fontSize: 13 }}>
                <option value="">— Select agent —</option>
                {availableAgents.map(a => (
                  <option key={a._id} value={a._id}>{a.name} ({a.phone}) — {a.deliveryStatus}</option>
                ))}
              </select>
              <button
                disabled={!selectedAgent || loading}
                onClick={() => onAssignAgent(order._id, selectedAgent)}
                style={{ padding: '9px 16px', background: '#F97316', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: !selectedAgent ? 'not-allowed' : 'pointer', opacity: !selectedAgent ? 0.5 : 1 }}>
                Assign
              </button>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {nextStatuses.length > 0 && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {nextStatuses.map(ns => (
              <button key={ns} disabled={loading} onClick={() => onStatusChange(order._id, ns)}
                style={{ flex: 1, minWidth: 120, padding: '12px 16px', borderRadius: 10, border: ns === 'cancelled' ? '1px solid rgba(239,68,68,0.4)' : 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1, background: ns === 'cancelled' ? 'rgba(239,68,68,0.1)' : '#F97316', color: ns === 'cancelled' ? '#EF4444' : '#fff', transition: 'all 0.2s' }}>
                {loading ? 'Updating…' : ns === 'cancelled' ? '✕ Cancel Order' : ns === 'accepted' ? '✓ Accept' : ns === 'preparing' ? '🍳 Start Preparing' : ns === 'out_for_delivery' ? '🚴 Dispatch (Send OTP)' : ns === 'delivered' ? '✅ Mark Delivered' : STATUS_CONFIG[ns]?.label}
              </button>
            ))}
          </div>
        )}
        {(order.status === 'delivered' || order.status === 'cancelled') && (
          <div style={{ textAlign: 'center', color: STATUS_CONFIG[order.status]?.color, fontWeight: 700, fontSize: 15, padding: 8 }}>
            {order.status === 'delivered' ? `✅ Delivered${order.otpVerified ? ' · OTP Verified' : ''}` : '❌ Order Cancelled'}
          </div>
        )}
      </div>
    </div>
  );
}

const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#1A2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '93vh', overflowY: 'auto' },
};

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) q.set('status', statusFilter);
      const res = await api.get(`/admin/orders?${q}`);
      setOrders(res.data.orders || []);
      setTotalPages(res.data.pages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    api.get('/admin/delivery-agents').then(r => setAgents(r.data.agents || [])).catch(() => {});
  }, []);

  const handleStatusChange = async (orderId, status) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/orders/${orderId}/status`, { status });
      const updated = res.data.devOtp ? { ...res.data.order, _devOtp: res.data.devOtp } : res.data.order;
      setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
      setSelectedOrder(prev => prev?._id === orderId ? updated : prev);
      toast.success(`Order marked as ${STATUS_CONFIG[status]?.label || status}`);
      if (status === 'out_for_delivery') toast('📧 OTP sent to customer!', { icon: '🔐', duration: 5000 });
      if (res.data.devOtp) toast(`🔐 Dev OTP: ${res.data.devOtp}`, { duration: 10000 });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update status'); }
    finally { setActionLoading(false); }
  };

  const handleAssignAgent = async (orderId, agentId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/orders/${orderId}/assign-agent`, { agentId });
      setOrders(prev => prev.map(o => o._id === orderId ? res.data.order : o));
      setSelectedOrder(prev => prev?._id === orderId ? res.data.order : prev);
      toast.success('Delivery agent assigned!');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to assign agent'); }
    finally { setActionLoading(false); }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o._id.includes(q) || (o.customerId?.name || '').toLowerCase().includes(q) || (o.restaurantId?.name || o.restaurantName || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <style>{CSS}</style>
      <OrderModal order={selectedOrder} agents={agents} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} onAssignAgent={handleAssignAgent} loading={actionLoading} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>📦 All <span style={{ color: 'var(--primary)' }}>Orders</span></h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="ao-input" placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="ao-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="ao-btn" onClick={fetchOrders}>↻ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th><th>Customer</th><th>Restaurant</th><th>Items</th><th>Amount</th>
                  <th>Payment</th><th>Status</th><th>Delivery Agent</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No orders found</td></tr>
                ) : filtered.map(o => {
                  const nextStatuses = ADMIN_NEXT[o.status] || [];
                  return (
                    <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(o)}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>#{o._id.slice(-8).toUpperCase()}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{o.customerId?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.customerId?.phone}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{o.restaurantId?.name || o.restaurantName}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140 }}>{o.items?.map(i => i.name).join(', ')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{o.finalAmount}</td>
                      <td><span className={`badge badge-${o.paymentStatus}`}>{o.paymentStatus}</span></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td style={{ fontSize: 12 }}>
                        {o.deliveryAgentId ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#E5E7EB' }}>{o.deliveryAgentId?.name || o.deliveryAgentName}</div>
                            <div style={{ color: AGENT_STATUS_COLOR[o.deliveryAgentId?.deliveryStatus || 'busy'] }}>● {o.deliveryAgentId?.deliveryStatus || '—'}</div>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>Not assigned</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button className="ao-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setSelectedOrder(o)}>View</button>
                          {nextStatuses.filter(s => s !== 'cancelled').map(ns => (
                            <button key={ns} className="ao-btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={actionLoading} onClick={() => handleStatusChange(o._id, ns)}>
                              {ns === 'accepted' ? 'Accept' : ns === 'preparing' ? 'Prepare' : ns === 'out_for_delivery' ? '🚴 Dispatch' : ns === 'delivered' ? '✅ Done' : ns}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="ao-mobile">
            {filtered.map(o => (
              <div key={o._id} className="ao-card" onClick={() => setSelectedOrder(o)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>#{o._id.slice(-8).toUpperCase()}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{o.customerId?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{o.restaurantId?.name || o.restaurantName} · {o.items?.map(i => i.name).join(', ')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: 15 }}>₹{o.finalAmount}</span>
                  <span style={{ fontSize: 12, color: o.deliveryAgentId ? '#06B6D4' : 'var(--text-muted)' }}>
                    {o.deliveryAgentId ? `🚴 ${o.deliveryAgentId?.name || o.deliveryAgentName}` : 'No agent'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">← Prev</button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const CSS = `
.ao-input { padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#E5E7EB;font-size:13px;outline:none;width:180px; }
.ao-select { padding:9px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#E5E7EB;font-size:13px;cursor:pointer;outline:none; }
.ao-select option { background:#1F2937; }
.ao-btn { padding:8px 14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#D1D5DB;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s; }
.ao-btn:hover { background:rgba(255,255,255,0.12); }
.ao-btn-primary { padding:6px 12px;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);border-radius:6px;color:#F97316;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap; }
.ao-btn-primary:hover { background:rgba(249,115,22,0.28); }
.ao-btn-primary:disabled { opacity:0.5;cursor:not-allowed; }
.ao-mobile { display:none;flex-direction:column;gap:10px; }
.ao-card { background:#161B22;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;cursor:pointer;transition:border-color 0.2s; }
.ao-card:hover { border-color:rgba(249,115,22,0.3); }
@media(max-width:768px) { .table-wrapper { display:none; } .ao-mobile { display:flex; } }
`;
