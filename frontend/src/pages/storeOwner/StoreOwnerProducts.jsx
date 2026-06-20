import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', discountedPrice: '', category: '',
  image: '', brand: '', unit: '', stock: '-1', isAvailable: true, isFeatured: false, tags: '',
};

export default function StoreOwnerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/store-owner/products')
      .then(res => setProducts(res.data.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_PRODUCT); setModal('add'); };
  const openEdit = (p) => {
    setForm({ ...p, price: String(p.price), discountedPrice: p.discountedPrice != null ? String(p.discountedPrice) : '', stock: String(p.stock ?? -1), tags: (p.tags || []).join(', ') });
    setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : null, stock: Number(form.stock), tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] };
      if (modal === 'add') {
        const res = await api.post('/store-owner/products', payload);
        setProducts(p => [res.data.product, ...p]);
        toast.success('Product added!');
      } else {
        const res = await api.put(`/store-owner/products/${form._id}`, payload);
        setProducts(p => p.map(x => x._id === form._id ? res.data.product : x));
        toast.success('Product updated!');
      }
      setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/store-owner/products/${id}`);
      setProducts(p => p.filter(x => x._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Products</h1>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Product</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
        <input className="form-input" type="text" placeholder="🔍 Search products…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} items</span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 200, borderRadius: 14 }} className="shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>📦</div>
          <h3>{search ? 'No products match' : 'No products yet'}</h3>
          {!search && <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 12 }}><FiPlus /> Add First Product</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16 }}>
          {filtered.map(p => (
            <div key={p._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 120, background: 'var(--bg-dark)', overflow: 'hidden' }}>
                {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{p.category}{p.unit && ` · ${p.unit}`}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 800 }}>₹{p.discountedPrice || p.price}</span>
                  {p.discountedPrice && <span style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--text-muted)' }}>₹{p.price}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(p)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><FiEdit2 size={12} /> Edit</button>
                  <button onClick={() => handleDelete(p._id)} className="btn btn-sm" style={{ background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}><FiTrash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20 }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={22} /></button>
            </div>
            <form onSubmit={handleSave}>
              {[
                { label: 'Product Name *', key: 'name', type: 'text', required: true },
                { label: 'Category *', key: 'category', type: 'text', required: true, placeholder: 'e.g. Dairy, Fruits, Snacks' },
                { label: 'Price (₹) *', key: 'price', type: 'number', required: true },
                { label: 'Discounted Price (₹)', key: 'discountedPrice', type: 'number' },
                { label: 'Brand', key: 'brand', type: 'text' },
                { label: 'Unit', key: 'unit', type: 'text', placeholder: 'e.g. 500g, 1L, Pack of 6' },
                { label: 'Stock (-1 = unlimited)', key: 'stock', type: 'number' },
                { label: 'Image URL', key: 'image', type: 'text' },
                { label: 'Description', key: 'description', type: 'text' },
                { label: 'Tags (comma separated)', key: 'tags', type: 'text' },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" type={f.type} required={f.required} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(x => ({ ...x, isAvailable: e.target.checked }))} />
                  Available
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(x => ({ ...x, isFeatured: e.target.checked }))} />
                  Featured
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
