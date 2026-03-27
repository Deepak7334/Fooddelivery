import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const emptyForm = { name: '', description: '', cuisine: '', address: '', city: '', image: '', deliveryTime: '30-40 mins', deliveryFee: 30, minOrder: 100, phone: '', ownerEmail: '', ownerPassword: '', ownerName: '' };

// ✅ Moved OUTSIDE the parent component
const F = ({ label, field, type = 'text', placeholder, form, setForm }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      className="form-input"
      type={type}
      placeholder={placeholder}
      value={form[field] || ''}
      onChange={e => setForm({ ...form, [field]: e.target.value })}
    />
  </div>
);

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRestaurants = () => {
    api.get('/admin/restaurants').then(res => setRestaurants(res.data.restaurants || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (r) => {
    setForm({ ...r, cuisine: r.cuisine?.join(', ') || '' });
    setEditing(r._id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address) { toast.error('Name and address are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, cuisine: form.cuisine.split(',').map(s => s.trim()).filter(Boolean) };
      if (editing) {
        await api.put(`/admin/restaurants/${editing}`, payload);
        toast.success('Restaurant updated!');
      } else {
        if (!form.ownerEmail || !form.ownerPassword) { toast.error('Owner email and password required'); setSaving(false); return; }
        await api.post('/admin/restaurants', payload);
        toast.success('Restaurant created with owner credentials!');
      }
      setShowModal(false); fetchRestaurants();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this restaurant? This will also delete all its menu items.')) return;
    try { await api.delete(`/admin/restaurants/${id}`); toast.success('Deleted'); fetchRestaurants(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleToggle = async (id) => {
    try { const res = await api.patch(`/admin/restaurants/${id}/toggle`); setRestaurants(prev => prev.map(r => r._id === id ? res.data.restaurant : r)); }
    catch { toast.error('Error'); }
  };

  // ✅ Shorthand props passer for cleaner JSX
  const fProps = { form, setForm };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}> Restaurant <span style={{ color: 'var(--primary)' }}>Management</span></h1>
        <button onClick={openAdd} className="btn btn-primary"><FiPlus /> Add Restaurant</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Restaurant</th><th>Owner Email</th><th>Cuisine</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {restaurants.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No restaurants yet. Add one!</td></tr>
                : restaurants.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.city} · {r.deliveryTime}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.ownerEmail || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.cuisine?.join(', ')}</td>
                    <td><span style={{ color: '#FFD700' }}>⭐</span> {r.rating?.toFixed(1)}</td>
                    <td>
                      <button onClick={() => handleToggle(r._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: r.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                        {r.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(r)} className="btn btn-secondary btn-sm"><FiEdit2 /></button>
                        <button onClick={() => handleDelete(r._id)} className="btn btn-danger btn-sm"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="modal-title">{editing ? ' Edit Restaurant' : ' Add New Restaurant'}</h2>
            <p className="modal-subtitle">{editing ? 'Update restaurant details below.' : 'Fill in details and owner credentials. Owner can login with these.'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <F label="Restaurant Name *" field="name" placeholder="e.g. Pizza Palace" {...fProps} />
              <F label="City" field="city" placeholder="Mumbai" {...fProps} />
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." style={{ resize: 'none' }} />
              </div>
              <F label="Cuisine (comma separated)" field="cuisine" placeholder="Pizza, Pasta, Italian" {...fProps} />
              <F label="Phone" field="phone" placeholder="9876543210" {...fProps} />
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address *</label>
                <input className="form-input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full restaurant address" />
              </div>
              <F label="Image URL" field="image" placeholder="https://..." {...fProps} />
              <F label="Delivery Time" field="deliveryTime" placeholder="30-40 mins" {...fProps} />
              <F label="Delivery Fee (₹)" field="deliveryFee" type="number" {...fProps} />
              <F label="Minimum Order (₹)" field="minOrder" type="number" {...fProps} />
            </div>
            {!editing && (
              <>
                <div className="divider" />
                <div style={{ padding: '12px 16px', background: 'rgba(255,87,34,0.08)', borderRadius: 10, border: '1px solid rgba(255,87,34,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  🔐 <strong>Owner Credentials</strong> — The restaurant owner will use these to login.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <F label="Owner Name" field="ownerName" placeholder="John Doe" {...fProps} />
                  <F label="Owner Email *" field="ownerEmail" type="email" placeholder="owner@restaurant.com" {...fProps} />
                  <F label="Owner Password *" field="ownerPassword" type="password" placeholder="Min 6 characters" {...fProps} />
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : editing ? 'Update' : 'Create Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}