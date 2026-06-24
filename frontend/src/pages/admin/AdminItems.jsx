import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/admin/manage-items');
      setItems(res.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>All <span style={{ color: 'var(--primary)' }}>Items</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>View all foods and products across the platform.</p>
        </div>
      </div>

      <div className="card table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Item Name</th>
              <th>Type</th>
              <th>Vendor</th>
              <th>Base Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No items found</td></tr>
            ) : items.map(item => (
              <tr key={item._id}>
                <td>
                  <img src={item.image || 'https://via.placeholder.com/40'} alt={item.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                </td>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>
                  <span style={{ fontSize: 11, background: item.itemType === 'food' ? 'rgba(255,152,0,0.1)' : 'rgba(33,150,243,0.1)', color: item.itemType === 'food' ? '#FF9800' : '#2196F3', padding: '2px 8px', borderRadius: 100, textTransform: 'capitalize', fontWeight: 700 }}>
                    {item.itemType}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.vendorName}</td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
