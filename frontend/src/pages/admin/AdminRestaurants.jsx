import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const emptyForm = { name: '', description: '', cuisine: '', address: '', addrHouse: '', addrArea: '', addrLandmark: '', addrPincode: '', city: '', image: '', deliveryTime: '30-40 mins', deliveryFee: 30, minOrder: 100, phone: '', ownerEmail: '', ownerPassword: '', ownerName: '' };

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

  // Table Management State
  const [tablesModal, setTablesModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [tableForm, setTableForm] = useState({ number: '', maxGuests: '', description: '' });
  const [editingTable, setEditingTable] = useState(null);

  const fetchRestaurants = () => {
    api.get('/admin/restaurants').then(res => setRestaurants(res.data.restaurants || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (r) => {
    setForm({ ...r, cuisine: r.cuisine?.join(', ') || '', addrHouse: r.address || '', addrArea: '', addrLandmark: '', addrPincode: '' });
    setEditing(r._id); setShowModal(true);
  };

  const handleSave = async () => {
    const fullAddress = [form.addrHouse, form.addrArea, form.addrLandmark ? `Near ${form.addrLandmark}` : '', form.addrPincode].filter(Boolean).join(', ') || form.address;
    if (!form.name || !fullAddress) { toast.error('Name and address are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, address: fullAddress, cuisine: form.cuisine.split(',').map(s => s.trim()).filter(Boolean) };
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

  const openTables = async (r) => {
    setSelectedRestaurant(r);
    setTablesModal(true);
    setTableForm({ number: '', maxGuests: '', description: '' });
    setEditingTable(null);
    try {
      const res = await api.get(`/admin/restaurants/${r._id}/tables`);
      setTables(res.data.tables || []);
    } catch { toast.error('Error loading tables'); }
  };

  const handleSaveTable = async () => {
    if (!tableForm.number || !tableForm.maxGuests) return toast.error('Number and max guests required');
    try {
      if (editingTable) {
        await api.put(`/admin/restaurants/${selectedRestaurant._id}/tables/${editingTable}`, tableForm);
        toast.success('Table updated');
      } else {
        await api.post(`/admin/restaurants/${selectedRestaurant._id}/tables`, tableForm);
        toast.success('Table added');
      }
      setTableForm({ number: '', maxGuests: '', description: '' });
      setEditingTable(null);
      const res = await api.get(`/admin/restaurants/${selectedRestaurant._id}/tables`);
      setTables(res.data.tables || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving table'); }
  };

  const handleDeleteTable = async (id) => {
    if (!confirm('Delete this table?')) return;
    try {
      await api.delete(`/admin/restaurants/${selectedRestaurant._id}/tables/${id}`);
      setTables(tables.filter(t => t._id !== id));
      toast.success('Table deleted');
    } catch { toast.error('Error deleting table'); }
  };

  const editTable = (t) => {
    setTableForm({ number: t.number, maxGuests: t.maxGuests, description: t.description || '' });
    setEditingTable(t._id);
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
                        <button onClick={() => openTables(r)} className="btn btn-primary btn-sm" title="Manage Tables">🪑</button>
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
          <div className="modal-box responsive-modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="modal-title">{editing ? ' Edit Restaurant' : ' Add New Restaurant'}</h2>
            <p className="modal-subtitle">{editing ? 'Update restaurant details below.' : 'Fill in details and owner credentials. Owner can login with these.'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0 16px' }}>
              <F label="Restaurant Name *" field="name" placeholder="e.g. Pizza Palace" {...fProps} />
              <F label="City" field="city" placeholder="Mumbai" {...fProps} />
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." style={{ resize: 'none' }} />
              </div>
              <F label="Cuisine (comma separated)" field="cuisine" placeholder="Pizza, Pasta, Italian" {...fProps} />
              <F label="Phone" field="phone" placeholder="9876543210" {...fProps} />
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ marginBottom: 12 }}>Restaurant Address *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <input className="form-input" value={form.addrHouse || ''} onChange={e => setForm({ ...form, addrHouse: e.target.value })} placeholder="Shop / Building No." />
                  <input className="form-input" value={form.addrArea || ''} onChange={e => setForm({ ...form, addrArea: e.target.value })} placeholder="Area / Locality / Street" />
                  <input className="form-input" value={form.addrLandmark || ''} onChange={e => setForm({ ...form, addrLandmark: e.target.value })} placeholder="Nearby Landmark" />
                  <input className="form-input" value={form.addrPincode || ''} onChange={e => setForm({ ...form, addrPincode: e.target.value })} placeholder="Pincode" />
                </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0 16px' }}>
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

      {/* Tables Management Modal */}
      {tablesModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setTablesModal(false)}>
          <div className="modal-box responsive-modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="modal-title">🪑 Manage Tables</h2>
            <p className="modal-subtitle">For {selectedRestaurant?.name}</p>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 24, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>{editingTable ? 'Edit Table' : 'Add New Table'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Table Number</label>
                  <input type="number" className="form-input" value={tableForm.number} onChange={e => setTableForm({ ...tableForm, number: e.target.value })} placeholder="e.g. 1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Guests</label>
                  <input type="number" min="1" max="100" className="form-input" value={tableForm.maxGuests} onChange={e => setTableForm({ ...tableForm, maxGuests: e.target.value })} placeholder="e.g. 4" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Description (optional)</label>
                  <input type="text" className="form-input" value={tableForm.description} onChange={e => setTableForm({ ...tableForm, description: e.target.value })} placeholder="e.g. Window seat" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                {editingTable && <button onClick={() => { setEditingTable(null); setTableForm({ number: '', maxGuests: '', description: '' }); }} className="btn btn-secondary btn-sm">Cancel Edit</button>}
                <button onClick={handleSaveTable} className="btn btn-primary btn-sm">{editingTable ? 'Update Table' : 'Add Table'}</button>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead><tr><th>No.</th><th>Guests</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>
                  {tables.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No tables added yet.</td></tr> :
                    tables.map(t => (
                      <tr key={t._id}>
                        <td style={{ fontWeight: 700 }}>{t.number}</td>
                        <td>{t.maxGuests}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => editTable(t)} className="btn btn-secondary btn-sm"><FiEdit2 size={12}/></button>
                            <button onClick={() => handleDeleteTable(t._id)} className="btn btn-danger btn-sm"><FiTrash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setTablesModal(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}