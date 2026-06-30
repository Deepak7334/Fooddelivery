import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ── Edit Drawer (slide-over panel, Zomato-style) ────────────────────────────────
function EditDrawer({ item, onClose, onSave, saving }) {
  const [price, setPrice]             = useState(item.price);
  const [discountedPrice, setDisc]    = useState(item.discountedPrice || '');
  const [offer, setOffer]             = useState(item.offer || '');
  const [description, setDescription] = useState(item.description || '');
  const [available, setAvailable]     = useState(item.isAvailable !== false);

  return (
    <div className="ai-drawer-backdrop" onClick={onClose}>
      <div className="ai-drawer" onClick={e => e.stopPropagation()}>
        <div className="ai-drawer-header">
          <div>
            <div className="ai-drawer-eyebrow">Editing item</div>
            <div className="ai-drawer-title">{item.name}</div>
          </div>
          <button className="ai-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="ai-drawer-body">
          <div className="ai-drawer-image-row">
            <img src={item.image || 'https://via.placeholder.com/120'} alt={item.name} className="ai-drawer-img" />
            <div>
              <div className="ai-drawer-vendor">By <strong>{item.vendorName}</strong></div>
              <span className="ai-type-pill">{item.itemType}</span>
            </div>
          </div>

          <label className="ai-field-label">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="ai-textarea"
            placeholder="Item description"
            rows={3}
          />

          <div className="ai-field-row">
            <div>
              <label className="ai-field-label">Price (₹)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="ai-input" placeholder="0" />
            </div>
            <div>
              <label className="ai-field-label">Discounted Price (₹)</label>
              <input type="number" value={discountedPrice} onChange={e => setDisc(e.target.value)} className="ai-input" placeholder="Optional" />
            </div>
          </div>

          <label className="ai-field-label">Offer Tag</label>
          <input type="text" value={offer} onChange={e => setOffer(e.target.value)} className="ai-input" placeholder="e.g. 20% OFF" />

          <label className="ai-toggle-row">
            <span>Item is available</span>
            <span
              className={`ai-toggle ${available ? 'on' : ''}`}
              onClick={() => setAvailable(v => !v)}
            >
              <span className="ai-toggle-knob" />
            </span>
          </label>
        </div>

        <div className="ai-drawer-footer">
          <button className="ai-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="ai-btn-save"
            disabled={saving}
            onClick={() => onSave(item._id, item.itemType, { price, discountedPrice, offer, description, isAvailable: available })}
          >
            {saving ? 'Saving…' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminItems() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [view, setView]         = useState('grid'); // grid | table

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/manage-items');
      setItems(res.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id, itemType, payload) => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/manage-items/${id}`, { itemType, ...payload });
      setItems(prev => prev.map(it => it._id === id ? { ...it, ...res.data.item } : it));
      setEditingItem(null);
      toast.success('Item updated successfully!');
    } catch (err) {
      console.error('Update error:', err);
      if (err.response) {
         toast.error(`Backend error: ${err.response.status} - ${err.response.data.message || JSON.stringify(err.response.data)}`);
      } else {
         toast.error(`Network error: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const itemTypes = useMemo(() => {
    const set = new Set(items.map(i => i.itemType).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesType = typeFilter === 'all' || item.itemType === typeFilter;
      const matchesSearch = !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.vendorName?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, search, typeFilter]);

  const stats = useMemo(() => {
    const onOffer = items.filter(i => i.offer).length;
    const avgPrice = items.length ? Math.round(items.reduce((s, i) => s + Number(i.price || 0), 0) / items.length) : 0;
    const vendors = new Set(items.map(i => i.vendorName)).size;
    return { total: items.length, onOffer, avgPrice, vendors };
  }, [items]);

  if (loading) return (
    <div className="ai-loading">
      <div className="ai-spinner" />
      <span>Loading items…</span>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      {editingItem && (
        <EditDrawer
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <div className="ai-root">

        {/* ── Header ── */}
        <div className="ai-page-header">
          <div>
            <h1 className="ai-title">All <span className="ai-title-accent">Items</span></h1>
            <p className="ai-subtitle">Manage food &amp; products across the platform</p>
          </div>
          <div className="ai-view-toggle">
            <button className={`ai-view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>▦ Grid</button>
            <button className={`ai-view-btn${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>☰ Table</button>
          </div>
        </div>

        {/* ── Stats Strip ── */}
        <div className="ai-stats-grid">
          <div className="ai-stat-card">
            <div className="ai-stat-label">Total Items</div>
            <div className="ai-stat-value" style={{ color: '#3B82F6' }}>{stats.total}</div>
          </div>
          <div className="ai-stat-card">
            <div className="ai-stat-label">On Offer</div>
            <div className="ai-stat-value" style={{ color: '#F97316' }}>{stats.onOffer}</div>
          </div>
          <div className="ai-stat-card">
            <div className="ai-stat-label">Avg. Price</div>
            <div className="ai-stat-value" style={{ color: '#22C55E' }}>{formatINR(stats.avgPrice)}</div>
          </div>
          <div className="ai-stat-card">
            <div className="ai-stat-label">Vendors</div>
            <div className="ai-stat-value" style={{ color: '#A78BFA' }}>{stats.vendors}</div>
          </div>
        </div>

        {/* ── Search + Filters ── */}
        <div className="ai-toolbar">
          <div className="ai-search-box">
            <span className="ai-search-icon">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items or vendors…"
              className="ai-search-input"
            />
            {search && <span className="ai-search-clear" onClick={() => setSearch('')}>✕</span>}
          </div>
          <div className="ai-type-filters">
            {itemTypes.map(t => (
              <button
                key={t}
                className={`ai-type-filter${typeFilter === t ? ' active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 ? (
          <div className="ai-empty">
            <div className="ai-empty-icon">🍽️</div>
            <div className="ai-empty-title">No items found</div>
            <div className="ai-empty-sub">Try adjusting your search or filter</div>
          </div>
        ) : view === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="ai-grid">
            {filtered.map(item => (
              <div key={item._id} className="ai-card">
                <div className="ai-card-img-wrap">
                  <img src={item.image || 'https://via.placeholder.com/400'} alt={item.name} className="ai-card-img" />
                  <span className="ai-type-badge">{item.itemType}</span>
                  {item.offer && <span className="ai-offer-badge">{item.offer}</span>}
                  {item.isAvailable === false && (
                    <div className="ai-unavailable-overlay">Unavailable</div>
                  )}
                </div>
                <div className="ai-card-body">
                  <div className="ai-card-top-row">
                    <div className="ai-card-name">{item.name}</div>
                    <div className="ai-card-price">
                      {item.discountedPrice ? (
                        <>
                          <span className="ai-price-now">{formatINR(item.discountedPrice)}</span>
                          <span className="ai-price-was">{formatINR(item.price)}</span>
                        </>
                      ) : (
                        <span className="ai-price-now">{formatINR(item.price)}</span>
                      )}
                    </div>
                  </div>
                  <div className="ai-card-desc">{item.description || 'No description available'}</div>
                  <div className="ai-card-footer">
                    <div className="ai-card-vendor">By <strong>{item.vendorName}</strong></div>
                    <button className="ai-edit-btn" onClick={() => setEditingItem(item)}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Vendor</th>
                  <th>Price</th>
                  <th>Offer</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id}>
                    <td>
                      <div className="ai-table-item">
                        <img src={item.image || 'https://via.placeholder.com/60'} alt={item.name} className="ai-table-img" />
                        <div>
                          <div className="ai-table-item-name">{item.name}</div>
                          <div className="ai-table-item-desc">{item.description?.slice(0, 50) || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="ai-type-pill">{item.itemType}</span></td>
                    <td className="ai-table-vendor">{item.vendorName}</td>
                    <td>
                      {item.discountedPrice ? (
                        <>
                          <span className="ai-price-now">{formatINR(item.discountedPrice)}</span>{' '}
                          <span className="ai-price-was">{formatINR(item.price)}</span>
                        </>
                      ) : formatINR(item.price)}
                    </td>
                    <td>{item.offer ? <span className="ai-offer-pill">{item.offer}</span> : <span className="ai-muted">—</span>}</td>
                    <td>
                      {item.isAvailable === false
                        ? <span className="ai-status-pill off">Unavailable</span>
                        : <span className="ai-status-pill on">Available</span>}
                    </td>
                    <td><button className="ai-edit-btn" onClick={() => setEditingItem(item)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.ai-root { font-family: 'Inter', sans-serif; color: #E5E7EB; }

/* ── Loading ── */
.ai-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 80px 20px; color: #6B7280; font-size: 13px; font-family: 'Inter', sans-serif; }
.ai-spinner { width: 32px; height: 32px; border: 3px solid rgba(249,115,22,0.2); border-top-color: #F97316; border-radius: 50%; animation: ai-spin 0.75s linear infinite; }
@keyframes ai-spin { to { transform: rotate(360deg); } }

/* ── Header ── */
.ai-page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 22px; }
.ai-title { font-size: 28px; font-weight: 900; color: #F1F5F9; }
.ai-title-accent { color: #F97316; }
.ai-subtitle { font-size: 14px; color: #6B7280; margin-top: 4px; }

.ai-view-toggle { display: flex; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 3px; }
.ai-view-btn { padding: 7px 14px; background: transparent; border: none; border-radius: 8px; color: #6B7280; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
.ai-view-btn.active { background: rgba(249,115,22,0.15); color: #F97316; }

/* ── Stats Grid ── */
.ai-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.ai-stat-card { background: #111827; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px 16px; }
.ai-stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4B5563; margin-bottom: 6px; }
.ai-stat-value { font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; }

/* ── Toolbar ── */
.ai-toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
.ai-search-box { position: relative; flex: 1; min-width: 220px; display: flex; align-items: center; }
.ai-search-icon { position: absolute; left: 13px; font-size: 13px; opacity: 0.5; pointer-events: none; }
.ai-search-input { width: 100%; padding: 10px 36px 10px 36px; background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; color: #E5E7EB; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.15s; }
.ai-search-input:focus { border-color: rgba(249,115,22,0.4); }
.ai-search-clear { position: absolute; right: 12px; font-size: 12px; color: #6B7280; cursor: pointer; }

.ai-type-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.ai-type-filter { padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #9CA3AF; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: capitalize; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; }
.ai-type-filter:hover { background: rgba(255,255,255,0.08); }
.ai-type-filter.active { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.4); color: #F97316; }

/* ── Empty ── */
.ai-empty { text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 18px; }
.ai-empty-icon { font-size: 48px; margin-bottom: 12px; }
.ai-empty-title { font-size: 16px; font-weight: 700; color: #9CA3AF; }
.ai-empty-sub { font-size: 13px; color: #4B5563; margin-top: 5px; }

/* ── Grid View ── */
.ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 16px; }
.ai-card { background: #111827; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s; }
.ai-card:hover { border-color: rgba(249,115,22,0.25); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }

.ai-card-img-wrap { height: 140px; width: 100%; position: relative; background: #1c222b; flex-shrink: 0; }
.ai-card-img { width: 100%; height: 100%; object-fit: cover; }
.ai-type-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; color: #fff; text-transform: capitalize; }
.ai-offer-badge { position: absolute; bottom: 10px; left: 10px; background: #F97316; color: #fff; padding: 4px 9px; border-radius: 7px; font-size: 11px; font-weight: 800; }
.ai-unavailable-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: #EF4444; font-weight: 800; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; }

.ai-card-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.ai-card-top-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.ai-card-name { font-weight: 700; font-size: 15px; color: #F1F5F9; line-height: 1.3; }
.ai-card-price { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; }
.ai-price-now { font-weight: 800; color: #22C55E; font-family: 'JetBrains Mono', monospace; font-size: 14px; }
.ai-price-was { text-decoration: line-through; color: #4B5563; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.ai-card-desc { font-size: 12px; color: #9CA3AF; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }

.ai-card-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.ai-card-vendor { font-size: 11px; color: #6B7280; }
.ai-card-vendor strong { color: #D1D5DB; }

.ai-edit-btn { padding: 6px 14px; border-radius: 100px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.3); color: #F97316; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s; white-space: nowrap; }
.ai-edit-btn:hover { background: rgba(249,115,22,0.2); }

/* ── Table View ── */
.ai-table-wrap { background: #111827; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow-x: auto; }
.ai-table { width: 100%; border-collapse: collapse; min-width: 720px; }
.ai-table th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #4B5563; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; }
.ai-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; vertical-align: middle; }
.ai-table tr:last-child td { border-bottom: none; }
.ai-table tr:hover td { background: rgba(255,255,255,0.015); }

.ai-table-item { display: flex; align-items: center; gap: 10px; }
.ai-table-img { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #1c222b; }
.ai-table-item-name { font-weight: 700; color: #F1F5F9; font-size: 13px; }
.ai-table-item-desc { font-size: 11px; color: #6B7280; margin-top: 2px; }
.ai-table-vendor { color: #9CA3AF; }
.ai-muted { color: #4B5563; }

.ai-type-pill { padding: 3px 10px; border-radius: 20px; background: rgba(255,255,255,0.06); color: #9CA3AF; font-size: 11px; font-weight: 700; text-transform: capitalize; white-space: nowrap; }
.ai-offer-pill { padding: 3px 10px; border-radius: 6px; background: rgba(249,115,22,0.12); color: #F97316; font-size: 11px; font-weight: 700; white-space: nowrap; }
.ai-status-pill { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.ai-status-pill.on  { background: rgba(34,197,94,0.12); color: #22C55E; }
.ai-status-pill.off { background: rgba(239,68,68,0.12); color: #EF4444; }

/* ── Edit Drawer ── */
.ai-drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display: flex; justify-content: flex-end; }
.ai-drawer { width: 100%; max-width: 420px; height: 100%; background: #111827; border-left: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; animation: ai-slidein 0.25s ease; }
@keyframes ai-slidein { from { transform: translateX(100%); } to { transform: translateX(0); } }

.ai-drawer-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.ai-drawer-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; margin-bottom: 4px; }
.ai-drawer-title { font-size: 18px; font-weight: 800; color: #F1F5F9; }
.ai-drawer-close { width: 30px; height: 30px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #9CA3AF; cursor: pointer; font-size: 13px; flex-shrink: 0; }
.ai-drawer-close:hover { background: rgba(255,255,255,0.1); }

.ai-drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.ai-drawer-image-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ai-drawer-img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; background: #1c222b; flex-shrink: 0; }
.ai-drawer-vendor { font-size: 12px; color: #9CA3AF; margin-bottom: 6px; }
.ai-drawer-vendor strong { color: #D1D5DB; }

.ai-field-label { font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; margin: 10px 0 6px; display: block; }
.ai-textarea, .ai-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: #0B0F19; color: #E5E7EB; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.15s; }
.ai-textarea { resize: vertical; }
.ai-textarea:focus, .ai-input:focus { border-color: rgba(249,115,22,0.4); }
.ai-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.ai-toggle-row { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 13px; color: #D1D5DB; font-weight: 600; cursor: pointer; }
.ai-toggle { width: 42px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 20px; position: relative; transition: background 0.2s; flex-shrink: 0; }
.ai-toggle.on { background: #22C55E; }
.ai-toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.ai-toggle.on .ai-toggle-knob { transform: translateX(18px); }

.ai-drawer-footer { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.06); }
.ai-btn-ghost { flex: 1; padding: 11px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #9CA3AF; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; }
.ai-btn-ghost:hover { background: rgba(255,255,255,0.1); }
.ai-btn-save { flex: 2; padding: 11px; background: #F97316; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s; }
.ai-btn-save:hover:not(:disabled) { background: #EA6C0C; }
.ai-btn-save:disabled, .ai-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .ai-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .ai-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  .ai-page-header { flex-direction: column; align-items: stretch; }
}

@media (max-width: 480px) {
  .ai-title { font-size: 22px; }
  .ai-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .ai-stat-card { padding: 11px 12px; }
  .ai-stat-value { font-size: 17px; }
  .ai-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .ai-card-img-wrap { height: 110px; }
  .ai-card-body { padding: 10px; gap: 6px; }
  .ai-card-name { font-size: 13px; }
  .ai-toolbar { flex-direction: column; align-items: stretch; }
  .ai-drawer { max-width: 100%; }
}
`;
