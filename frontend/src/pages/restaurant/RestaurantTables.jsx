import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const emptyForm = { number: '', maxGuests: '', description: '' };

export default function RestaurantTables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTables = () => { 
    api.get('/api/booking/restaurant/tables')
      .then(res => setTables(res.data || []))
      .catch(err => toast.error('Failed to load tables'))
      .finally(() => setLoading(false)); 
  };
  
  useEffect(() => {
    fetchTables();
  }, []);

  const openAdd = () => { setForm(emptyForm); setShowModal(true); };

  const handleSave = async () => {
    if (!form.number || !form.maxGuests) { toast.error('Table Number and Max Guests are required'); return; }
    setSaving(true);
    try {
      await api.post('/api/booking/restaurant/tables', form);
      toast.success('Table added successfully!');
      setShowModal(false); 
      fetchTables();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Error adding table'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    try { 
      await api.delete(`/api/booking/restaurant/tables/${id}`); 
      toast.success('Table deleted'); 
      fetchTables(); 
    }
    catch { toast.error('Error deleting table'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>🪑 Table <span style={{ color: 'var(--primary)' }}>Management</span></h1>
        <button onClick={openAdd} className="btn btn-primary"><FiPlus /> Add Table</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : tables.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🪑</div>
          <h3>No tables yet!</h3>
          <p>Add your first table to allow seat booking.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Table No.</th>
                <th>Capacity (Guests)</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700, fontSize: 16 }}>{t.number}</td>
                  <td>{t.maxGuests} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>people</span></td>
                  <td>{t.description || '-'}</td>
                  <td>
                    <button onClick={() => handleDelete(t._id)} className="btn btn-danger btn-sm"><FiTrash2 size={14} /> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target.className === 'modal-overlay') setShowModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <h2 className="modal-title">➕ Add Table</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Table Number *</label>
                <input type="number" className="form-input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="e.g. 1" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Max Guests Capacity *</label>
                <input type="number" min="1" max="20" className="form-input" value={form.maxGuests} onChange={e => setForm({ ...form, maxGuests: e.target.value })} placeholder="e.g. 4" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description (Optional)</label>
                <input type="text" className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Window side" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Add Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
