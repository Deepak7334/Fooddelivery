import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204121.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  preparing: { label: 'Preparing', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  assignment_pending: { label: 'Waiting for Agent', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  out_for_delivery: { label: 'Assigned', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  accepted_by_driver: { label: 'Agent Proceeding', color: '#14B8A6', bg: 'rgba(20,184,166,0.12)' },
  reached_restaurant: { label: 'Agent at Rest.', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  picked_up: { label: 'Picked Up', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  on_the_way: { label: 'Agent on Way', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  reached_customer: { label: 'Agent Arr.', color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  delivered: { label: 'Delivered', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

const AGENT_STATUS_COLOR = { available: '#22C55E', busy: '#F59E0B', offline: 'var(--text-muted)' };

const ADMIN_NEXT = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['cancelled'], // Admin assigns using the dropdown now
  assignment_pending: ['cancelled'],
  out_for_delivery: ['cancelled'],
  accepted_by_driver: ['cancelled'],
  reached_restaurant: ['cancelled'],
  picked_up: ['cancelled'],
  on_the_way: ['cancelled'],
  reached_customer: ['cancelled']
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--text-secondary)', bg: 'rgba(156,163,175,0.12)' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  );
}

// ── Order Detail Modal ─────────────────────────────────────────────────────

function OrderModal({ order, agents, onClose, onStatusChange, onAssignAgent, loading }) {
  const [selectedAgent, setSelectedAgent] = useState(order?.deliveryAgentId?._id || order?.deliveryAgentId || '');
  const [showMap, setShowMap] = useState(false);
  const [agentLocation, setAgentLocation] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line
    setSelectedAgent(order?.deliveryAgentId?._id || order?.deliveryAgentId || '');
    if (order?.deliveryAgentId?.location) {
      setAgentLocation({ lat: order.deliveryAgentId.location.lat, lng: order.deliveryAgentId.location.lng });
    }
  }, [order]);

  useEffect(() => {
    if (showMap && order?.deliveryAgentId) {
      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      socketRef.current = socket;
      socket.emit('join_admin_tracking_room');

      socket.on('admin:delivery_location', (data) => {
        if (data.agentId === (order.deliveryAgentId._id || order.deliveryAgentId)) {
          setAgentLocation({ lat: data.lat, lng: data.lng });
        }
      });
      return () => socket.disconnect();
    }
  }, [showMap, order]);

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
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}> Admin — Order Details</div>
            <div style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 800, fontSize: 20, marginTop: 3 }}>#{order._id?.slice(-8).toUpperCase()}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        {/* OFD note */}
        {isOFD && (
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#06B6D4', fontWeight: 600 }}>
            🚴 Out for delivery — OTP has been sent to customer. Agent collecting OTP at doorstep.
          </div>
        )}
        {order._devOtp && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '2px dashed rgba(249,115,22,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Dev Mode — OTP</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#F97316', letterSpacing: 12, fontFamily: 'monospace' }}>{order._devOtp}</div>
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Customer', value: order.customerId?.name || '—' },
            { label: 'Phone', value: order.customerId?.phone || order.customerPhone || '—' },
            { label: 'Email', value: order.customerId?.email || order.customerEmail || '—', span: true },
            { 
              label: 'Address', 
              value: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span>{typeof order.deliveryAddress === 'object' && order.deliveryAddress !== null 
                    ? [order.deliveryAddress.addressLine1, order.deliveryAddress.landmark, order.deliveryAddress.area, order.deliveryAddress.city, order.deliveryAddress.pincode].filter(Boolean).join(', ')
                    : (order.deliveryAddress || '—')}</span>
                  {((order.deliveryCoords && order.deliveryCoords.lat) || (typeof order.deliveryAddress === 'object' && order.deliveryAddress?.latitude)) && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryCoords?.lat || order.deliveryAddress?.latitude},${order.deliveryCoords?.lng || order.deliveryAddress?.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3B82F6', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      🗺️ Open in Google Maps
                    </a>
                  )}
                </div>
              ), 
              span: true 
            },
            { label: 'Vendor', value: order.restaurantName || order.restaurantId?.name || order.storeName || order.storeId?.name || 'JDkart' },
            { label: 'Status', value: <StatusBadge status={order.status} /> },
            { label: 'Placed At', value: new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), span: true },
            ...(order.deliveredAt ? [{ label: 'Delivered At', value: new Date(order.deliveredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), span: true }] : []),
          ].map(({ label, value, span }) => (
            <div key={label} style={{ ...(span ? { gridColumn: '1/-1' } : {}), background: 'var(--glass)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Items</div>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--glass)', borderRadius: 8, marginBottom: 4, fontSize: 13, color: 'var(--text-primary)' }}>
              <span>{item.name} × {item.quantity}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
            <span style={{ fontWeight: 800, color: '#22C55E', fontSize: 17 }}>Total: ₹{order.finalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Delivery Agent Assignment */}
        {order.deliveryAgentId ? (
          <div style={{ background: order.agentAccepted || order.status !== 'assignment_pending' ? 'rgba(6,182,212,0.08)' : 'rgba(245,158,11,0.08)', border: '1px solid', borderColor: order.agentAccepted || order.status !== 'assignment_pending' ? 'rgba(6,182,212,0.25)' : 'rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: order.agentAccepted || order.status !== 'assignment_pending' ? 'var(--text-muted)' : '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {order.status === 'assignment_pending' ? '⏳ Waiting for Agent to Accept' : 'Assigned Delivery Agent'}
              </div>
              {['out_for_delivery', 'accepted_by_driver', 'reached_restaurant', 'picked_up', 'on_the_way', 'reached_customer'].includes(order.status) && (
                <button
                  onClick={() => setShowMap(true)}
                  style={{ padding: '4px 10px', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 12, color: '#EAB308', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 Track Live
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🚴</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{order.deliveryAgentId?.name || order.deliveryAgentName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.deliveryAgentId?.phone} {order.deliveryAgentId?.vehicleNumber && `· ${order.deliveryAgentId.vehicleNumber}`}</div>
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
                style={{ flex: 1, padding: '9px 10px', background: 'var(--glass-border)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
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

      {/* Live Tracking Map Modal overlay */}
      {showMap && (
        <div style={{ ...ms.overlay, zIndex: 1100 }} onClick={(e) => { e.stopPropagation(); setShowMap(false); }}>
          <div style={{ ...ms.modal, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '80vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>Live Location Tracking</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Agent: {order.deliveryAgentId?.name}</div>
              </div>
              <button onClick={() => setShowMap(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, background: '#0F1117', position: 'relative' }}>
              {agentLocation ? (
                <MapContainer center={[agentLocation.lat, agentLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <Marker position={[agentLocation.lat, agentLocation.lng]} icon={deliveryIcon}>
                    <Popup>
                      <b>{order.deliveryAgentId?.name}</b><br />
                      Vehicle: {order.deliveryAgentId?.vehicleNumber}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Waiting for GPS Signal...</div>
                  <div style={{ fontSize: 12 }}>The agent might have location disabled or bad reception.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '93vh', overflowY: 'auto' },
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
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [bulkAgentId, setBulkAgentId] = useState('');

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
    api.get('/admin/delivery-agents').then(r => setAgents(r.data.agents || [])).catch(() => { });
  }, []);

  const handleStatusChange = async (orderId, status) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/orders/${orderId}/status`, { status });
      const updated = res.data.devOtp ? { ...res.data.order, _devOtp: res.data.devOtp } : res.data.order;
      setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
      setSelectedOrder(prev => prev?._id === orderId ? updated : prev);
      toast.success(`Order marked as ${STATUS_CONFIG[status]?.label || status}`);
      if (status === 'out_for_delivery') toast(' OTP sent to customer!', { icon: '🔐', duration: 5000 });
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

  const handleBulkAssign = async () => {
    if (selectedOrderIds.size === 0) return toast.error('Select orders first');
    if (!bulkAgentId) return toast.error('Select an agent');
    
    setActionLoading(true);
    try {
      const res = await api.patch('/admin/orders/bulk-assign', {
        orderIds: Array.from(selectedOrderIds),
        agentId: bulkAgentId
      });
      toast.success(res.data.message);
      setSelectedOrderIds(new Set());
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to bulk assign');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    const vendorName = (o.restaurantName || o.restaurantId?.name || o.storeName || o.storeId?.name || '').toLowerCase();
    return o._id.includes(q) || (o.customerId?.name || '').toLowerCase().includes(q) || vendorName.includes(q);
  });

  const toggleSelectOrder = (id) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  return (
    <div>
      <style>{CSS}</style>
      <OrderModal order={selectedOrder} agents={agents} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} onAssignAgent={handleAssignAgent} loading={actionLoading} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>All <span style={{ color: 'var(--primary)' }}>Orders</span></h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="ao-input" placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="ao-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="ao-btn" onClick={fetchOrders}>↻ Refresh</button>
        </div>
      </div>

      {selectedOrderIds.size > 0 && (
        <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid #F97316', padding: '12px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, color: '#F97316' }}>{selectedOrderIds.size} orders selected</div>
          <select className="ao-select" value={bulkAgentId} onChange={e => setBulkAgentId(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">-- Select Delivery Agent --</option>
            {agents.filter(a => a.isActive).map(a => (
              <option key={a._id} value={a._id}>{a.name} ({a.deliveryStatus})</option>
            ))}
          </select>
          <button className="ao-btn" onClick={handleBulkAssign} disabled={actionLoading} style={{ background: '#F97316', color: '#fff', border: 'none' }}>
            {actionLoading ? 'Assigning...' : 'Assign Selected'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" checked={filtered.length > 0 && selectedOrderIds.size === filtered.length} onChange={e => {
                    if (e.target.checked) setSelectedOrderIds(new Set(filtered.map(o => o._id)));
                    else setSelectedOrderIds(new Set());
                  }} /></th>
                  <th>Order ID</th><th>Customer</th><th>Vendor</th><th>Items</th><th>Amount</th>
                  <th>Payment</th><th>Status</th><th>Delivery Agent</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No orders found</td></tr>
                ) : filtered.map(o => {
                  const nextStatuses = ADMIN_NEXT[o.status] || [];
                  return (
                    <tr key={o._id} style={{ cursor: 'pointer', background: selectedOrderIds.has(o._id) ? 'rgba(249,115,22,0.05)' : 'transparent' }} onClick={() => setSelectedOrder(o)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedOrderIds.has(o._id)} onChange={() => toggleSelectOrder(o._id)} />
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>#{o._id.slice(-8).toUpperCase()}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{o.customerId?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.customerId?.phone}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{o.restaurantName || o.restaurantId?.name || o.storeName || o.storeId?.name || 'JDkart'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140 }}>{o.items?.map(i => i.name).join(', ')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{o.finalAmount}</td>
                      <td>
                        <span className={`badge badge-${o.paymentStatus}`}>
                          {o.paymentStatus === 'paid' ? (o.paymentMethod === 'cod' ? 'Paid (Cash)' : 'Paid (Online)') : o.paymentStatus}
                        </span>
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td style={{ fontSize: 12 }}>
                        {o.deliveryAgentId ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.deliveryAgentId?.name || o.deliveryAgentName}</div>
                            <div style={{ color: AGENT_STATUS_COLOR[o.deliveryAgentId?.deliveryStatus || 'busy'] }}>● {o.deliveryAgentId?.deliveryStatus || '—'}</div>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>Not assigned</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <div title="Placed At">{new Date(o.createdAt).toLocaleDateString('en-IN')}</div>
                        {o.deliveredAt && <div style={{ color: 'var(--success)', marginTop: 4 }} title="Delivered At">✓ {new Date(o.deliveredAt).toLocaleDateString('en-IN')}</div>}
                      </td>
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
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{o.restaurantName || o.restaurantId?.name || o.storeName || o.storeId?.name || 'JDkart'} · {o.items?.map(i => i.name).join(', ')}</div>
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
.ao-input { padding:9px 12px;background:var(--glass-border);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-primary);font-size:13px;outline:none;width:180px; }
.ao-select { padding:9px 10px;background:var(--glass-border);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;outline:none; }
.ao-select option { background:#1F2937; }
.ao-btn { padding:8px 14px;background:var(--glass-border);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#D1D5DB;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s; }
.ao-btn:hover { background:rgba(255,255,255,0.12); }
.ao-btn-primary { padding:6px 12px;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);border-radius:6px;color:#F97316;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap; }
.ao-btn-primary:hover { background:rgba(249,115,22,0.28); }
.ao-btn-primary:disabled { opacity:0.5;cursor:not-allowed; }
.ao-mobile { display:none;flex-direction:column;gap:10px; }
.ao-card { background:var(--bg-card);border:1px solid var(--glass-border);border-radius:12px;padding:14px;cursor:pointer;transition:border-color 0.2s; }
.ao-card:hover { border-color:rgba(249,115,22,0.3); }
@media(max-width:768px) { .table-wrapper { display:none; } .ao-mobile { display:flex; } }
`;
