import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import ImageCropperModal from '../../components/ImageCropperModal';

const STORE_TYPES = ['grocery', 'pharmacy', 'electronics', 'beauty', 'pets', 'bakery', 'supermarket', 'stationery', 'sports', 'other'];
const TYPE_ICONS = { grocery: '🛒', pharmacy: '💊', electronics: '📱', beauty: '🧴', pets: '🐾', bakery: '🥐', supermarket: '🏪', stationery: '📚', sports: '⚽', other: '🏬' };

const EMPTY = {
  name: '', description: '', storeType: 'grocery', address: '', addrHouse: '', addrArea: '', addrLandmark: '', addrPincode: '', city: '',
  image: '', coverImage: '', phone: '', deliveryTime: '30-45 mins', deliveryFee: '30',
  minOrder: '100', isActive: true, isOpen: true, offers: '',
  ownerEmail: '', ownerName: '', ownerPassword: '',
};

export default function AdminStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropConfig, setCropConfig] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (typeFilter !== 'all') params.type = typeFilter;
    if (search) params.search = search;
    api.get('/admin/stores', { params })
      .then(res => setStores(res.data.stores || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [typeFilter, search]);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (s) => {
    setForm({ ...EMPTY, ...s, deliveryFee: String(s.deliveryFee), minOrder: String(s.minOrder), offers: (s.offers || []).join(', '), ownerEmail: '', ownerName: '', ownerPassword: '', addrHouse: s.address || '' });
    setModal('edit');
  };

  const handleImageUpload = (e, fieldKey) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Read file for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setCropConfig({
        imageSrc: reader.result.toString(),
        fieldKey,
        aspect: fieldKey === 'coverImage' ? 16 / 9 : 4 / 3
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleCropDone = async (croppedFile) => {
    if (!cropConfig || !croppedFile) return;
    const { fieldKey } = cropConfig;
    setCropConfig(null);
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', croppedFile);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({ ...prev, [fieldKey]: res.data.imageUrl }));
      toast.success('Image cropped and uploaded!');
    } catch (err) {
      toast.error('Failed to upload image');
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fullAddress = [form.addrHouse, form.addrArea, form.addrLandmark ? `Near ${form.addrLandmark}` : '', form.addrPincode].filter(Boolean).join(', ') || form.address;
      if (!fullAddress) return toast.error('Address is required');
      const payload = {
        ...form,
        address: fullAddress,
        deliveryFee: Number(form.deliveryFee),
        minOrder: Number(form.minOrder),
        offers: form.offers ? form.offers.split(',').map(o => o.trim()).filter(Boolean) : [],
      };
      if (modal === 'add') {
        const res = await api.post('/admin/stores', payload);
        setStores(prev => [res.data.store, ...prev]);
        toast.success('Store created!');
      } else {
        // eslint-disable-next-line no-unused-vars
        const { ownerEmail, ownerName, ownerPassword, ...updatePayload } = payload;
        const res = await api.put(`/admin/stores/${form._id}`, updatePayload);
        setStores(prev => prev.map(s => s._id === form._id ? res.data.store : s));
        toast.success('Store updated!');
      }
      setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this store and all its products?')) return;
    try {
      await api.delete(`/admin/stores/${id}`);
      setStores(prev => prev.filter(s => s._id !== id));
      toast.success('Store deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleStatus = async (store) => {
    try {
      const res = await api.put(`/admin/stores/${store._id}`, { isActive: !store.isActive });
      setStores(prev => prev.map(s => s._id === store._id ? res.data.store : s));
    } catch { toast.error('Update failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}> Stores Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Manage grocery, pharmacy, electronics & more</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Store</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" type="text" placeholder="🔍 Search stores…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select className="form-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Types</option>
          {STORE_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : stores.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}></div><h3>No stores yet</h3><button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 12 }}><FiPlus /> Add First Store</button></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Store</th><th>Type</th><th>City</th><th>Owner</th><th>Delivery</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {stores.map(store => (
                <tr key={store._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {store.image ? <img src={store.image} alt={store.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{TYPE_ICONS[store.storeType]}</div>}
                      <div>
                        <div style={{ fontWeight: 700 }}>{store.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{store.address?.slice(0, 40)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ background: 'rgba(255,87,34,0.1)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{TYPE_ICONS[store.storeType]} {store.storeType}</span></td>
                  <td style={{ fontSize: 13 }}>{store.city || '—'}</td>
                  <td style={{ fontSize: 13 }}>{store.ownerId?.name || store.ownerEmail || '—'}</td>
                  <td style={{ fontSize: 13 }}>₹{store.deliveryFee} · {store.deliveryTime}</td>
                  <td>
                    <button onClick={() => toggleStatus(store)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: store.isActive ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                      {store.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                      {store.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(store)} className="btn btn-secondary btn-sm"><FiEdit2 size={13} /></button>
                      <button onClick={() => handleDelete(store._id)} className="btn btn-sm" style={{ background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}><FiTrash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20 }}>{modal === 'add' ? '➕ Add Store' : '✏️ Edit Store'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={22} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Store Name *', key: 'name', col: 2, required: true },
                  { label: 'Store Type *', key: 'storeType', type: 'select', col: 1, required: true },
                  { label: 'City', key: 'city', col: 1 },
                  { label: 'House / Building No. *', key: 'addrHouse', col: 1, required: true },
                  { label: 'Area / Street', key: 'addrArea', col: 1 },
                  { label: 'Nearby Landmark', key: 'addrLandmark', col: 1 },
                  { label: 'Pincode', key: 'addrPincode', col: 1 },
                  { label: 'Phone', key: 'phone', col: 1 },
                  { label: 'Delivery Time', key: 'deliveryTime', col: 1, placeholder: '30-45 mins' },
                  { label: 'Delivery Fee (₹)', key: 'deliveryFee', type: 'number', col: 1 },
                  { label: 'Min Order (₹)', key: 'minOrder', type: 'number', col: 1 },
                  { label: 'Image URL', key: 'image', col: 2 },
                  { label: 'Cover Image URL', key: 'coverImage', col: 2 },
                  { label: 'Offers (comma separated)', key: 'offers', col: 2 },
                  { label: 'Description', key: 'description', col: 2 },
                ].map(f => (
                  <div key={f.key} className="form-group" style={{ gridColumn: `span ${f.col || 1}` }}>
                    <label className="form-label">{f.label}</label>
                    {f.type === 'select' ? (
                      <select className="form-input" value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}>
                        {STORE_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    ) : f.key === 'image' || f.key === 'coverImage' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="form-input" type="text" placeholder={`Paste ${f.label} or upload`} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} style={{ flex: 1 }} />
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
                          Upload
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, f.key)} disabled={uploadingImage} />
                        </label>
                      </div>
                    ) : (
                      <input className="form-input" type={f.type || 'text'} required={f.required} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>

              {modal === 'add' && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(33,150,243,0.08)', borderRadius: 12, border: '1px solid rgba(33,150,243,0.2)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#2196F3' }}>👤 Store Owner Account (optional)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Owner Email', key: 'ownerEmail', col: 2 },
                      { label: 'Owner Name', key: 'ownerName', col: 1 },
                      { label: 'Password', key: 'ownerPassword', type: 'password', col: 1 },
                    ].map(f => (
                      <div key={f.key} className="form-group" style={{ gridColumn: `span ${f.col || 1}` }}>
                        <label className="form-label">{f.label}</label>
                        <input className="form-input" type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(x => ({ ...x, isActive: e.target.checked }))} /> Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={form.isOpen} onChange={e => setForm(x => ({ ...x, isOpen: e.target.checked }))} /> Open
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : `${modal === 'add' ? 'Create' : 'Update'} Store`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropConfig && (
        <ImageCropperModal
          imageSrc={cropConfig.imageSrc}
          aspect={cropConfig.aspect}
          onCancel={() => setCropConfig(null)}
          onCropDone={handleCropDone}
        />
      )}
    </div>
  );
}
