import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const emptyForm = { name: '', description: '', category: '', price: '', discountedPrice: '', isVeg: false, isBestseller: false, isAvailable: true, image: '', variants: [], addOns: [], spiceLevels: [] };

export default function RestaurantMenu() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  const fetchMenu = () => { api.get('/restaurant/menu').then(res => setFoods(res.data.foods || [])).finally(() => setLoading(false)); };
  useEffect(() => {
    fetchMenu();
    api.get('/customer/categories').then(res => setCategories(res.data.categories || [])).catch(() => { });
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (f) => { setForm({ ...f }); setEditing(f._id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.price) { toast.error('Name, category, and price are required'); return; }
    setSaving(true);
    try {
      if (editing) { await api.put(`/restaurant/menu/${editing}`, form); toast.success('Food item updated!'); }
      else { await api.post('/restaurant/menu', form); toast.success('Food item added!'); }
      setShowModal(false); fetchMenu();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this food item?')) return;
    try { await api.delete(`/restaurant/menu/${id}`); toast.success('Deleted'); fetchMenu(); }
    catch { toast.error('Error'); }
  };

  const handleToggleAvailable = async (food) => {
    try { const res = await api.put(`/restaurant/menu/${food._id}`, { ...food, isAvailable: !food.isAvailable }); setFoods(prev => prev.map(f => f._id === food._id ? res.data.food : f)); }
    catch { toast.error('Error'); }
  };

  const grouped = {};
  foods.forEach(f => { if (!grouped[f.category]) grouped[f.category] = []; grouped[f.category].push(f); });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Menu <span style={{ color: 'var(--primary)' }}>Management</span></h1>
        <button onClick={openAdd} className="btn btn-primary"><FiPlus /> Add Item</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : foods.length === 0 ? <div className="empty-state"><div className="empty-state-icon"></div><h3>No items yet!</h3><p>Add your first menu item.</p></div>
          : Object.keys(grouped).map(cat => (
            <div key={cat} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {cat} <span style={{ fontSize: 13, background: 'rgba(255,87,34,0.1)', padding: '2px 10px', borderRadius: 100, color: 'var(--primary)' }}>{grouped[cat].length}</span>
              </h2>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Veg</th><th>Available</th><th>Actions</th></tr></thead>
                  <tbody>
                    {grouped[cat].map(f => (
                      <tr key={f._id} style={{ opacity: f.isAvailable ? 1 : 0.5 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {f.image ? <img src={f.image} alt={f.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 42, height: 42, background: 'var(--bg-dark)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>}
                            <div>
                              <div style={{ fontWeight: 700 }}>{f.name}</div>
                              {f.isBestseller && <span style={{ fontSize: 10, color: '#FF8F00' }}>★ Bestseller</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{f.category}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{f.discountedPrice || f.price}</span>
                          {f.discountedPrice && <span style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 4 }}>₹{f.price}</span>}
                        </td>
                        <td><span style={{ fontSize: 16 }}>{f.isVeg ? '🟢' : '🔴'}</span></td>
                        <td>
                          <button onClick={() => handleToggleAvailable(f)} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: f.isAvailable ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)', border: 'none', color: f.isAvailable ? 'var(--success)' : 'var(--danger)', cursor: 'pointer' }}>
                            {f.isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => openEdit(f)} className="btn btn-secondary btn-sm"><FiEdit2 size={12} /></button>
                            <button onClick={() => handleDelete(f._id)} className="btn btn-danger btn-sm"><FiTrash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="modal-title">{editing ? '✏️ Edit Item' : '➕ Add Menu Item'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Item Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Margherita Pizza" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.icon} {c.name}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="199" />
              </div>
              <div className="form-group">
                <label className="form-label">Discounted Price (₹)</label>
                <input className="form-input" type="number" value={form.discountedPrice || ''} onChange={e => setForm({ ...form, discountedPrice: e.target.value || null })} placeholder="149 (optional)" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." style={{ resize: 'none' }} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Image URL</label>
                <input className="form-input" value={form.image || ''} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              {[['isVeg', '🟢 Vegetarian'], ['isBestseller', '★ Bestseller'], ['isAvailable', '✅ Available']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>

            {/* Variants */}
            <div style={{ marginBottom: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Variants (e.g. Half/Full)</h3>
                <button onClick={() => setForm({ ...form, variants: [...(form.variants || []), { name: '', price: '', discountedPrice: '', isAvailable: true }] })} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>+ Add Variant</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(form.variants || []).map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="form-input" placeholder="Name (Half)" value={v.name} onChange={e => { const nv = [...form.variants]; nv[i].name = e.target.value; setForm({ ...form, variants: nv }) }} style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
                    <input className="form-input" type="number" placeholder="Price" value={v.price} onChange={e => { const nv = [...form.variants]; nv[i].price = e.target.value; setForm({ ...form, variants: nv }) }} style={{ width: 80, padding: '6px 10px', fontSize: 13 }} />
                    <input className="form-input" type="number" placeholder="Disc." value={v.discountedPrice || ''} onChange={e => { const nv = [...form.variants]; nv[i].discountedPrice = e.target.value; setForm({ ...form, variants: nv }) }} style={{ width: 80, padding: '6px 10px', fontSize: 13 }} />
                    <button onClick={() => { const nv = [...form.variants]; nv.splice(i, 1); setForm({ ...form, variants: nv }); }} className="btn btn-danger btn-sm" style={{ padding: '6px', minWidth: 'auto' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
                {(!form.variants || form.variants.length === 0) && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No variants added.</div>}
              </div>
            </div>

            {/* Add-ons */}
            <div style={{ marginBottom: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Add-ons (e.g. Extra Cheese)</h3>
                <button onClick={() => setForm({ ...form, addOns: [...(form.addOns || []), { name: '', price: '', isAvailable: true }] })} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>+ Add Add-on</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(form.addOns || []).map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="form-input" placeholder="Add-on Name" value={a.name} onChange={e => { const na = [...form.addOns]; na[i].name = e.target.value; setForm({ ...form, addOns: na }) }} style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
                    <input className="form-input" type="number" placeholder="Price" value={a.price} onChange={e => { const na = [...form.addOns]; na[i].price = e.target.value; setForm({ ...form, addOns: na }) }} style={{ width: 80, padding: '6px 10px', fontSize: 13 }} />
                    <button onClick={() => { const na = [...form.addOns]; na.splice(i, 1); setForm({ ...form, addOns: na }); }} className="btn btn-danger btn-sm" style={{ padding: '6px', minWidth: 'auto' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
                {(!form.addOns || form.addOns.length === 0) && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No add-ons added.</div>}
              </div>
            </div>

            {/* Spice Levels */}
            <div style={{ marginBottom: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Spice Levels (comma separated)</h3>
              <input className="form-input" placeholder="e.g. Mild, Medium, Hot" value={(form.spiceLevels || []).join(', ')} onChange={e => setForm({ ...form, spiceLevels: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={{ fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
