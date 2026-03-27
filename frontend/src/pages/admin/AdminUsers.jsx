import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>👥 User <span style={{ color: 'var(--primary)' }}>Management</span></h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'customer', 'restaurant'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>{filtered.length} users</div>
      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No users</td></tr>
                : filtered.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'restaurant' ? 'badge-accepted' : 'badge-paid'}`}>{u.role}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button onClick={() => handleToggle(u._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, color: u.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                        {u.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
