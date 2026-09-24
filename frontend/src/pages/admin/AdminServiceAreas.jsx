import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminServiceAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', code: '', city: '', state: '', pincodes: '',
    deliveryFee: 30, minimumOrderValue: 100, estimatedDeliveryTime: '30-45 mins', status: 'ACTIVE'
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/service-areas');
      setAreas(res.data);
    } catch (err) {
      toast.error('Failed to load service areas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, pincodes: formData.pincodes.split(',').map(p => p.trim()) };
      if (formData._id) {
        await api.patch(`/service-areas/${formData._id}`, payload);
        toast.success('Service area updated');
      } else {
        await api.post('/service-areas', payload);
        toast.success('Service area created');
      }
      setShowModal(false);
      fetchAreas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving area');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/service-areas/${id}/status`, { status: currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      toast.success('Status updated');
      fetchAreas();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Service Areas</h2>
        <button className="btn btn-primary" onClick={() => { setFormData({ name: '', code: '', city: '', state: '', pincodes: '', deliveryFee: 30, minimumOrderValue: 100, estimatedDeliveryTime: '30-45 mins', status: 'ACTIVE' }); setShowModal(true); }}>+ Add Area</button>
      </div>

      <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            <th>Name</th>
            <th>Code</th>
            <th>City</th>
            <th>Pincodes</th>
            <th>Fee</th>
            <th>Min Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {areas.map(area => (
            <tr key={area._id} style={{ borderBottom: '1px solid #ddd' }}>
              <td>{area.name}</td>
              <td>{area.code}</td>
              <td>{area.city}</td>
              <td>{area.pincodes.join(', ')}</td>
              <td>₹{area.deliveryFee}</td>
              <td>₹{area.minimumOrderValue}</td>
              <td>
                <span style={{ color: area.status === 'ACTIVE' ? 'green' : 'red', fontWeight: 'bold' }}>{area.status}</span>
              </td>
              <td>
                <button className="btn btn-secondary btn-sm" onClick={() => { setFormData({ ...area, pincodes: area.pincodes.join(', ') }); setShowModal(true); }}>Edit</button>
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => handleToggleStatus(area._id, area.status)}>Toggle</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: 24, borderRadius: 8, width: 400 }}>
            <h3>{formData._id ? 'Edit' : 'Add'} Service Area</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <input type="text" placeholder="Name (e.g. Area 3)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="input-field" />
              <input type="text" placeholder="Code (e.g. AREA_3)" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required className="input-field" />
              <input type="text" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="input-field" />
              <input type="text" placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required className="input-field" />
              <input type="text" placeholder="Pincodes (comma separated)" value={formData.pincodes} onChange={e => setFormData({...formData, pincodes: e.target.value})} required className="input-field" />
              <input type="number" placeholder="Delivery Fee" value={formData.deliveryFee} onChange={e => setFormData({...formData, deliveryFee: Number(e.target.value)})} required className="input-field" />
              <input type="number" placeholder="Min Order Value" value={formData.minimumOrderValue} onChange={e => setFormData({...formData, minimumOrderValue: Number(e.target.value)})} required className="input-field" />
              <input type="text" placeholder="Estimated Time" value={formData.estimatedDeliveryTime} onChange={e => setFormData({...formData, estimatedDeliveryTime: e.target.value})} required className="input-field" />
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
