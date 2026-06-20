import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiToggleLeft, FiToggleRight, FiEye, FiTrash2, FiX } from 'react-icons/fi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewUser, setViewUser] = useState(null);

  useEffect(() => {
    api.get('/admin/users').then(res => setUsers(res.data.users || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: res.data.user.isActive } : u));
      toast.success('User status updated');
    } catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      toast.success('User deleted');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to delete user'); 
    }
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>👥 User <span style={{ color: 'var(--primary)' }}>Management</span></h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'customer', 'restaurant', 'store_owner'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>{filtered.length} users</div>
      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No users</td></tr>
                : filtered.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'restaurant' ? 'badge-accepted' : u.role === 'store_owner' ? 'badge-preparing' : 'badge-paid'}`}>{u.role.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button onClick={() => handleToggle(u._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, color: u.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                        {u.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setViewUser(u)} className="btn btn-secondary btn-sm" title="View Details"><FiEye size={14} /></button>
                        <button onClick={() => handleDelete(u._id)} className="btn btn-sm" style={{ background: 'rgba(244,67,54,0.1)', color: 'var(--danger)', border: '1px solid rgba(244,67,54,0.2)', padding: '6px 10px' }} title="Delete"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {viewUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>User Details</h2>
              <button onClick={() => setViewUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 14 }}>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Name:</div>
                <div style={{ fontWeight: 700 }}>{viewUser.name}</div>

                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Email:</div>
                <div>{viewUser.email}</div>

                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Phone:</div>
                <div>{viewUser.phone || '—'}</div>

                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Role:</div>
                <div><span className={`badge ${viewUser.role === 'restaurant' ? 'badge-accepted' : viewUser.role === 'store_owner' ? 'badge-preparing' : 'badge-paid'}`}>{viewUser.role.replace('_', ' ')}</span></div>

                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Address:</div>
                <div>{viewUser.address || '—'}</div>

                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Joined:</div>
                <div>{new Date(viewUser.createdAt).toLocaleString()}</div>

                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</div>
                <div style={{ color: viewUser.isActive ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{viewUser.isActive ? 'Active' : 'Inactive'}</div>
              </div>
            </div>

            <button onClick={() => setViewUser(null)} className="btn btn-secondary" style={{ width: '100%', marginTop: 24 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
