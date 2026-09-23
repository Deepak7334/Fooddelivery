import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const STATUS_LABEL = {
  out_for_delivery: 'Assigned',
  picked_up: 'Picked Up',
  on_the_way: 'On My Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR = {
  out_for_delivery: '#F97316',
  picked_up: '#8B5CF6',
  on_the_way: '#06B6D4',
  delivered: '#22C55E',
  cancelled: '#EF4444',
};

const timeSince = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
};

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || '#9CA3AF';
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: color + '18', border: `1px solid ${color}30`, textTransform: 'uppercase' }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function DeliveryHistory() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/delivery/earnings');
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const allOrders = data?.history || [];
  const filtered = filter === 'all' ? allOrders
    : filter === 'delivered' ? allOrders.filter(o => o.status === 'delivered')
      : allOrders.filter(o => ['out_for_delivery', 'picked_up', 'on_the_way'].includes(o.status));

  const s = data?.stats || {};

  return (
    <div>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>📊 Earnings & <span style={{ color: 'var(--primary, #F97316)' }}>History</span></h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Your delivery performance & earnings overview</p>
      </div>

      {/* Earnings Cards */}
      <div className="earn-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "Today's Earnings", value: `₹${s.todayEarnings ?? 0}`, sub: `${s.todayDeliveries ?? 0} deliveries today`, color: '#22C55E', icon: '💰' },
          { label: 'This Week', value: `₹${s.weeklyEarnings ?? 0}`, sub: 'week earnings', color: '#06B6D4', icon: '📅' },
          { label: 'Total Earned', value: `₹${s.totalEarnings ?? 0}`, sub: `${s.totalDeliveries ?? 0} total deliveries`, color: '#F97316', icon: '🏆' },
          { label: 'Active Orders', value: s.activeOrders ?? 0, sub: 'in progress', color: '#8B5CF6', icon: '🚴' },
        ].map(c => (
          <div key={c.label} className="earn-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c.color, fontFamily: 'monospace', lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{c.sub}</div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.8 }}>{c.icon}</span>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: c.color, opacity: 0.5, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      {/* Per-delivery commission info */}
      <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>💡</span>
        <div style={{ fontSize: 13, color: '#F97316', fontWeight: 600 }}>
          You earn the full <strong>delivery fee</strong> for each completed order. Current avg: ₹{allOrders.length ? Math.round(allOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.deliveryFee || 0), 0) / Math.max(1, allOrders.filter(o => o.status === 'delivered').length)) : 0}/delivery
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'All Orders'], ['delivered', '✅ Delivered'], ['active', '🔄 Active']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`filt-btn ${filter === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {/* History List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto', borderColor: '#F97316', borderTopColor: 'transparent' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 600 }}>No deliveries yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Accept your first order to see it here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(o => {
            return (
            <div 
              key={o._id} 
              className="hist-card active-clickable"
              onClick={() => navigate(`/delivery/orders/${o._id}`, { state: { order: o } })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 700, fontSize: 12 }}>#{o._id.slice(-8).toUpperCase()}</div>
                  <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: 15, marginTop: 2 }}>{o.restaurantName || o.restaurantId?.name || o.storeName || o.storeId?.name || 'JDkart'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={o.status} />
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{timeSince(o.updatedAt || o.createdAt)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>📍 {o.deliveryAddress}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{o.items?.map(i => `${i.name}×${i.quantity}`).join(', ')}</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {o.status === 'delivered' && (
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#22C55E', fontSize: 15 }}>+₹{o.deliveryFee}</span>
                  )}
                  <span style={{ fontFamily: 'monospace', color: '#9CA3AF', fontSize: 13 }}>₹{o.finalAmount}</span>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}

const CSS = `
.earn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.earn-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 13px; padding: 16px; position: relative; overflow: hidden; }
.hist-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px; transition: all 0.2s; }
.hist-card:hover { border-color: rgba(249,115,22,0.3); }
.active-clickable { cursor: pointer; border-color: rgba(249,115,22,0.4); box-shadow: 0 0 10px rgba(249,115,22,0.1); }
.active-clickable:hover { background: #1c222b; transform: translateY(-2px); }
.filt-btn { padding: 7px 14px; background: var(--glass-border); border: 1px solid var(--glass-border); border-radius: 8px; color: #9CA3AF; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
.filt-btn.active { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.4); color: #F97316; }
.spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
`;
