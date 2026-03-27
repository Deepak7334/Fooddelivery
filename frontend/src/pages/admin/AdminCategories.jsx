import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '🍽️' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = () => { api.get('/admin/categories').then(res => setCategories(res.data.categories || [])).finally(() => setLoading(false)); };
  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => { setForm({ name: '', icon: '🍽️' }); setEditing(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ name: c.name, icon: c.icon }); setEditing(c._id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing) { await api.put(`/admin/categories/${editing}`, form); toast.success('Updated!'); }
      else { await api.post('/admin/categories', form); toast.success('Category added!'); }
      setShowModal(false); fetchCategories();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete category?')) return;
    try { await api.delete(`/admin/categories/${id}`); toast.success('Deleted'); fetchCategories(); }
    catch { toast.error('Error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>🏷️ <span style={{ color: 'var(--primary)' }}>Categories</span></h1>
        <button onClick={openAdd} className="btn btn-primary"><FiPlus /> Add Category</button>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {categories.map(c => (
            <div key={c._id} className="card" style={{ padding: 20, textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>{c.name}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm"><FiEdit2 size={12} /></button>
                <button onClick={() => handleDelete(c._id)} className="btn btn-danger btn-sm"><FiTrash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <h2 className="modal-title">{editing ? '✏️ Edit Category' : '➕ Add Category'}</h2>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pizza" />
            </div>
            <div className="form-group">
              <label className="form-label">Icon (emoji)</label>
              <input className="form-input" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🍕" />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
