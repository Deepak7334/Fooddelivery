import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = { available: '#22C55E', busy: '#F59E0B', offline: '#6B7280' };
const STATUS_BG =    { available: 'rgba(34,197,94,0.12)', busy: 'rgba(245,158,11,0.12)', offline: 'rgba(107,114,128,0.12)' };

function AgentBadge({ status }) {
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: STATUS_COLOR[status] || '#9CA3AF', background: STATUS_BG[status] || 'rgba(156,163,175,0.12)', border: `1px solid ${STATUS_COLOR[status] || '#9CA3AF'}30`, textTransform: 'uppercase' }}>{status}</span>;
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

export default function AdminDeliveryAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalAgent, setModalAgent] = useState(null); // null = closed, {} = new, agent = edit

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
    <div>
      <style>{CSS}</style>
      {modalAgent !== null && <AgentModal agent={modalAgent === 'new' ? null : modalAgent} onClose={() => setModalAgent(null)} onSave={handleSave} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🚴 Delivery <span style={{ color: 'var(--primary)' }}>Agents</span></h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="da-input" placeholder="🔍 Search agents…" value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={() => setModalAgent('new')} style={{ padding: '10px 18px', background: '#F97316', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>+ Add Agent</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Agents', value: stats.total, color: '#8B5CF6' },
          { label: 'Available', value: stats.available, color: '#22C55E' },
          { label: 'On Delivery', value: stats.busy, color: '#F59E0B' },
          { label: 'Offline', value: stats.offline, color: '#6B7280' },
        ].map(c => (
          <div key={c.label} className="da-stat">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.color, fontFamily: 'monospace' }}>{c.value}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: c.color, opacity: 0.5, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      {/* Agent Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚴</div>
          <h3>No delivery agents yet</h3>
          <p>Add your first delivery agent to start assigning orders.</p>
          <button className="btn btn-primary" onClick={() => setModalAgent('new')}>+ Add Agent</button>
        </div>
      ) : (
        <div className="da-grid">
          {filtered.map(agent => (
            <div key={agent._id} className={`da-card ${!agent.isActive ? 'da-card-inactive' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${STATUS_COLOR[agent.deliveryStatus] || '#6B7280'}, ${STATUS_COLOR[agent.deliveryStatus] || '#6B7280'}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚴</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: agent.isActive ? '#E5E7EB' : '#6B7280', marginBottom: 2 }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{agent.email}</div>
                  </div>
                </div>
                <AgentBadge status={agent.deliveryStatus} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Phone', value: agent.phone || '—' },
                  { label: 'Vehicle', value: agent.vehicleNumber || '—' },
                  { label: 'Active Orders', value: agent.activeOrders || 0, highlight: true },
                  { label: 'Account', value: agent.isActive ? 'Active' : 'Inactive', bad: !agent.isActive },
                ].map(({ label, value, highlight, bad }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: bad ? '#EF4444' : highlight && value > 0 ? '#F59E0B' : '#E5E7EB' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="da-btn edit" onClick={() => setModalAgent(agent)}>✏️ Edit</button>
                <button className="da-btn toggle" onClick={() => handleToggle(agent._id)}>{agent.isActive ? '🔴 Deactivate' : '🟢 Activate'}</button>
                <button className="da-btn delete" onClick={() => handleDelete(agent._id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.da-input { padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#E5E7EB;font-size:13px;outline:none;width:200px; }
.da-stat { background:#161B22;border:1px solid rgba(255,255,255,0.07);border-radius:13px;padding:16px;position:relative;overflow:hidden; }
.da-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px; }
.da-card { background:#161B22;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;transition:transform 0.2s,box-shadow 0.2s; }
.da-card:hover { transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.35); }
.da-card-inactive { opacity:0.6; }
.da-btn { flex:1;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap; }
.da-btn.edit { background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);color:#3B82F6; }
.da-btn.edit:hover { background:rgba(59,130,246,0.22); }
.da-btn.toggle { background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#F59E0B; }
.da-btn.toggle:hover { background:rgba(245,158,11,0.22); }
.da-btn.delete { background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#EF4444;flex:0;padding:8px 12px; }
.da-btn.delete:hover { background:rgba(239,68,68,0.2); }
`;
