import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
const STATUS_COLOR = { available: '#22C55E', busy: '#F59E0B', offline: '#6B7280' };
const STATUS_BG = { available: 'rgba(34,197,94,0.12)', busy: 'rgba(245,158,11,0.12)', offline: 'rgba(107,114,128,0.12)' };

function AgentBadge({ status }) {
  const isAvail = status === 'available';
  const isBusy = status === 'busy';
  const col = isAvail ? '#10B981' : isBusy ? '#F59E0B' : '#6B7280';
  const bg = isAvail ? 'rgba(16,185,129,0.1)' : isBusy ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: bg, border: `1px solid ${col}30` }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}` }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</span>
    </div>
  );
}

function AgentModal({ agent, onClose, onSave }) {
  const isEdit = !!agent?._id;
  const [form, setForm] = useState({ name: agent?.name || '', email: agent?.email || '', password: '', phone: agent?.phone || '', vehicleNumber: agent?.vehicleNumber || '', deliveryStatus: agent?.deliveryStatus || 'available' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, isEdit ? agent._id : null);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1A2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{isEdit ? '✏️ Edit Agent' : '➕ Add Delivery Agent'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {[
            { key: 'name', label: 'Full Name*', type: 'text', placeholder: 'Rajan Kumar' },
            { key: 'email', label: 'Email*', type: 'email', placeholder: 'rajan@example.com' },
            ...(isEdit ? [] : [{ key: 'password', label: 'Password*', type: 'password', placeholder: 'Min 6 characters' }]),
            { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '98xxxxxxxx' },
            { key: 'vehicleNumber', label: 'Vehicle Number', type: 'text', placeholder: 'TN01AB1234' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
              <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E5E7EB', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          {isEdit && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</label>
              <select value={form.deliveryStatus} onChange={e => setForm(f => ({ ...f, deliveryStatus: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E5E7EB', fontSize: 14, outline: 'none' }}>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#9CA3AF', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', background: '#F97316', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : isEdit ? 'Update Agent' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgentDetailsModal({ agentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentLocation, setAgentLocation] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/delivery-agents/${agentId}/details`)
      .then(res => {
        setData(res.data);
        if (res.data.agent.location) {
          setAgentLocation({ lat: res.data.agent.location.lat, lng: res.data.agent.location.lng });
        }
      })
      .catch(e => toast.error('Failed to load agent details'))
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => {
    if (data?.agent) {
      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      socketRef.current = socket;
      socket.emit('join_admin_tracking_room');

      socket.on('admin:delivery_location', (locData) => {
        if (locData.agentId === agentId) {
          setAgentLocation({ lat: locData.lat, lng: locData.lng });
        }
      });
      return () => socket.disconnect();
    }
  }, [data, agentId]);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data) return null;

  const { agent, orders, stats } = data;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#12151C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 900, height: '90vh', maxHeight: 800, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 32px', background: 'linear-gradient(to right, #1A2030, #161B22)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${STATUS_COLOR[agent.deliveryStatus] || '#6B7280'}, ${STATUS_COLOR[agent.deliveryStatus] || '#6B7280'}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🚴</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#F9FAFB' }}>{agent.name}</h2>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                {agent.phone} · {agent.vehicleNumber || 'No Vehicle'} · <AgentBadge status={agent.deliveryStatus} />
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 40, height: 40, color: '#9CA3AF', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left Panel: Map & Stats */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 0 }}>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Total Assigned', value: stats.totalAssigned, color: '#3B82F6' },
                { label: 'Delivered', value: stats.delivered, color: '#22C55E' },
                { label: 'Active', value: stats.active, color: '#F59E0B' },
                { label: 'Cancelled', value: stats.cancelled, color: '#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, background: '#0F1117', position: 'relative', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B8A6', boxShadow: '0 0 8px #14B8A6' }}></div> Live Tracking
              </div>

              {agentLocation ? (
                <MapContainer center={[agentLocation.lat, agentLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  <Marker position={[agentLocation.lat, agentLocation.lng]} icon={deliveryIcon}>
                    <Popup><b>{agent.name} (Live)</b></Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6B7280', textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}></div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Waiting for GPS Signal...</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Agent is currently not sharing location or app is closed.</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Delivery History */}
          <div style={{ width: 380, display: 'flex', flexDirection: 'column', background: '#161B22', flexShrink: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 800, color: '#E5E7EB', fontSize: 15 }}>
              Delivery History
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6B7280', fontSize: 13 }}>No orders assigned yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orders.map(o => (
                    <div key={o._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontFamily: 'monospace', color: '#F97316', fontWeight: 700, fontSize: 13 }}>#{o._id.slice(-8).toUpperCase()}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(o.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600, marginBottom: 2 }}>{o.restaurantId?.name || 'Restaurant'}</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>to {o.customerId?.name || 'Customer'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>₹{o.finalAmount}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: o.status === 'delivered' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: o.status === 'delivered' ? '#22C55E' : '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDeliveryAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalAgent, setModalAgent] = useState(null); // null = closed, {} = new, agent = edit
  const [detailsAgentId, setDetailsAgentId] = useState(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/delivery-agents');
      setAgents(res.data.agents || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleSave = async (form, agentId) => {
    try {
      if (agentId) {
        const res = await api.put(`/admin/delivery-agents/${agentId}`, form);
        setAgents(prev => prev.map(a => a._id === agentId ? { ...a, ...res.data.agent } : a));
        toast.success('Agent updated!');
      } else {
        const res = await api.post('/admin/delivery-agents', form);
        setAgents(prev => [res.data.agent, ...prev]);
        toast.success('Delivery agent added!');
      }
      setModalAgent(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving agent'); throw e; }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/admin/delivery-agents/${id}/toggle`);
      setAgents(prev => prev.map(a => a._id === id ? { ...a, isActive: res.data.agent.isActive } : a));
      toast.success('Agent status updated');
    } catch (e) { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this delivery agent? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/delivery-agents/${id}`);
      setAgents(prev => prev.filter(a => a._id !== id));
      toast.success('Agent removed');
    } catch (e) { toast.error('Failed to delete agent'); }
  };

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.phone || '').includes(q);
  });

  const stats = {
    total: agents.length,
    available: agents.filter(a => a.deliveryStatus === 'available' && a.isActive).length,
    busy: agents.filter(a => a.deliveryStatus === 'busy').length,
    offline: agents.filter(a => a.deliveryStatus === 'offline' || !a.isActive).length,
  };

  return (
    <div className="da-wrapper">
      <style>{CSS}</style>
      {modalAgent !== null && <AgentModal agent={modalAgent === 'new' ? null : modalAgent} onClose={() => setModalAgent(null)} onSave={handleSave} />}
      {detailsAgentId && <AgentDetailsModal agentId={detailsAgentId} onClose={() => setDetailsAgentId(null)} />}

      {/* Header */}
      <div className="da-header">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: '#F9FAFB' }}>
            Fleet <span style={{ color: '#F97316' }}>Management</span>
          </h1>
          <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>Monitor and coordinate your delivery partners</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input className="da-input" placeholder="Search agents by name, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <button className="da-btn-add" onClick={() => setModalAgent('new')}>+ Add Partner</button>
        </div>
      </div>

      {/* Stats */}
      <div className="da-stat-grid">
        {[
          { label: 'Total Fleet', value: stats.total, color: '#8B5CF6' },
          { label: 'Available (Idle)', value: stats.available, color: '#10B981' },
          { label: 'Active on Delivery', value: stats.busy, color: '#F59E0B' },
          { label: 'Offline / Inactive', value: stats.offline, color: '#6B7280' },
        ].map(c => (
          <div key={c.label} className="da-stat">
            <div className="da-stat-label">{c.label}</div>
            <div className="da-stat-val" style={{ color: c.color }}>{c.value}</div>
            <div className="da-stat-bar" style={{ background: c.color }} />
          </div>
        ))}
      </div>

      {/* Agent Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ background: '#11141A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24 }}>
          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}></div>
          <h3 style={{ color: '#F3F4F6' }}>No delivery partners found</h3>
          <p style={{ color: '#9CA3AF' }}>Recruit and add your first delivery partner to start dispatching orders.</p>
          <button className="da-btn-add" style={{ marginTop: 16 }} onClick={() => setModalAgent('new')}>+ Add Partner</button>
        </div>
      ) : (
        <div className="da-grid">
          {filtered.map(agent => (
            <div key={agent._id} className={`da-card ${!agent.isActive ? 'da-card-inactive' : ''}`}>
              <div className="da-card-header">
                <div className="da-avatar" style={{ background: `linear-gradient(135deg, ${STATUS_COLOR[agent.deliveryStatus] || '#6B7280'}, ${STATUS_COLOR[agent.deliveryStatus] || '#6B7280'}66)` }}>
                  🚴
                </div>
                <div style={{ flex: 1 }}>
                  <div className="da-name" style={{ color: agent.isActive ? '#F3F4F6' : '#6B7280' }}>
                    {agent.name}
                  </div>
                  <div className="da-email">{agent.phone || agent.email}</div>
                </div>
                <AgentBadge status={agent.deliveryStatus} />
              </div>

              <div className="da-metrics">
                {[
                  { label: 'Vehicle Reg', value: agent.vehicleNumber || 'Unregistered' },
                  { label: 'Live Orders', value: agent.activeOrders || 0, highlight: true },
                  { label: 'Account State', value: agent.isActive ? 'Verified' : 'Suspended', bad: !agent.isActive },
                  { label: 'Joined', value: new Date(agent.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
                ].map(({ label, value, highlight, bad }) => (
                  <div key={label} className="da-metric-box">
                    <div className="da-metric-label">{label}</div>
                    <div className="da-metric-val" style={{ color: bad ? '#EF4444' : highlight && value > 0 ? '#F59E0B' : '#E5E7EB' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="da-actions">
                <button className="da-btn details" onClick={() => setDetailsAgentId(agent._id)}>
                  📍 Live Tracking & Details
                </button>
                <div className="da-btn-row">
                  <button className="da-btn edit" onClick={() => setModalAgent(agent)}>✏️ Edit</button>
                  <button className="da-btn toggle" onClick={() => handleToggle(agent._id)}>{agent.isActive ? '🔴 Block' : '🟢 Admit'}</button>
                  <button className="da-btn delete" onClick={() => handleDelete(agent._id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.da-wrapper { flex: 1; padding: 10px; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
.da-header { background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.06); padding: 24px 32px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.2); }
.da-input { padding: 12px 18px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: #E5E7EB; font-size: 14px; outline: none; width: 260px; transition: all 0.2s; }
.da-input:focus { border-color: #F97316; background: rgba(0,0,0,0.4); box-shadow: 0 0 0 2px rgba(249,115,22,0.15); }
.da-btn-add { padding: 12px 24px; background: linear-gradient(135deg, #F97316, #EA580C); border: none; border-radius: 12px; color: #fff; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 6px 16px rgba(234,88,12,0.3); }
.da-btn-add:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(234,88,12,0.4); }

.da-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
.da-stat { background: #11141A; border: 1px solid rgba(255,255,255,0.04); border-radius: 20px; padding: 24px; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.15); transition: transform 0.2s; }
.da-stat:hover { transform: translateY(-3px); }
.da-stat-label { font-size: 12px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.da-stat-val { font-size: 36px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
.da-stat-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; opacity: 0.9; }

.da-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
.da-card { background: #11141A; border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.da-card:hover { transform: translateY(-6px); border-color: rgba(255,255,255,0.1); box-shadow: 0 16px 40px rgba(0,0,0,0.3); }
.da-card-inactive { opacity: 0.6; filter: grayscale(0.5); }
.da-card-header { padding: 20px 24px; display: flex; gap: 16px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.015); }
.da-avatar { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.da-name { font-weight: 800; font-size: 18px; color: #F3F4F6; margin-bottom: 4px; letter-spacing: -0.01em; }
.da-email { font-size: 13px; color: #9CA3AF; font-weight: 500; }

.da-metrics { padding: 20px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: rgba(0,0,0,0.15); }
.da-metric-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); border-radius: 14px; padding: 12px 14px; }
.da-metric-label { font-size: 10px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.da-metric-val { font-size: 14px; font-weight: 800; }

.da-actions { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.01); }
.da-btn-row { display: flex; gap: 10px; }
.da-btn { flex: 1; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
.da-btn.details { background: rgba(20,184,166,0.12); border: 1px solid rgba(20,184,166,0.3); color: #14B8A6; flex: 100%; box-shadow: 0 4px 12px rgba(20,184,166,0.1); }
.da-btn.details:hover { background: rgba(20,184,166,0.22); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(20,184,166,0.15); }
.da-btn.edit { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.25); color: #60A5FA; }
.da-btn.edit:hover { background: rgba(59,130,246,0.18); transform: translateY(-1px); }
.da-btn.toggle { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); color: #FBBF24; }
.da-btn.toggle:hover { background: rgba(245,158,11,0.18); transform: translateY(-1px); }
.da-btn.delete { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #F87171; flex: 0; padding: 10px 16px; }
.da-btn.delete:hover { background: rgba(239,68,68,0.18); transform: translateY(-1px); }
@media (max-width: 768px) { .da-header { flex-direction: column; align-items: stretch; gap: 16px; } .da-header > div:last-child { justify-content: space-between; } .da-input { width: 100%; } }
`;
