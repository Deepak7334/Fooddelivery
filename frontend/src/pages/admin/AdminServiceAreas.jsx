import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminServiceAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', code: '', city: '', state: '', pincodes: '',
    deliveryFee: 30, minimumOrderValue: 100, estimatedDeliveryTime: '30-45 mins', status: 'ACTIVE',
    lat: '', lng: ''
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
      const payload = { 
        ...formData, 
        pincodes: formData.pincodes.split(',').map(p => p.trim()),
        location: {
          type: 'Point',
          coordinates: [parseFloat(formData.lng) || 0, parseFloat(formData.lat) || 0]
        }
      };
      
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

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{margin: '0 auto'}}/></div>;

  return (
    <div className="admin-page" style={{ padding: 24 }}>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Manage <span style={{ color: 'var(--primary)' }}>Service Areas</span> (Zones)</h2>
        <button className="btn btn-primary" onClick={() => { setFormData({ name: '', code: '', city: '', state: '', pincodes: '', deliveryFee: 30, minimumOrderValue: 100, estimatedDeliveryTime: '30-45 mins', status: 'ACTIVE', lat: '', lng: '' }); setShowModal(true); }}>+ Add Zone</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>GPS Center</th>
              <th>Pincodes</th>
              <th>Fee</th>
              <th>Min Order</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No service areas found. Create one to enable deliveries!</td></tr>
            ) : areas.map(area => {
              const lat = area.location?.coordinates?.[1] || 'Not Set';
              const lng = area.location?.coordinates?.[0] || 'Not Set';
              return (
              <tr key={area._id}>
                <td style={{ fontWeight: 600 }}>{area.name} <br/><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{area.code}</span></td>
                <td>{area.city}</td>
                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  <span style={{ color: lat === 'Not Set' ? 'var(--danger)' : 'var(--success)' }}>
                    {lat !== 'Not Set' ? `${lat}, ${lng}` : 'Missing GPS!'}
                  </span>
                </td>
                <td style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{area.pincodes?.join(', ')}</td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{area.deliveryFee}</td>
                <td>₹{area.minimumOrderValue}</td>
                <td>
                  <span className={`badge ${area.status === 'ACTIVE' ? 'badge-paid' : 'badge-danger'}`}>{area.status}</span>
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { 
                    setFormData({ 
                      ...area, 
                      pincodes: area.pincodes.join(', '),
                      lat: area.location?.coordinates?.[1] || '',
                      lng: area.location?.coordinates?.[0] || ''
                    }); 
                    setShowModal(true); 
                  }}>Edit</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggleStatus(area._id, area.status)}>Toggle</button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>{formData._id ? 'Edit Zone Coordinates' : 'Create New Zone'}</h3>
            
            <div style={{ background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.2)', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>📍 Pro Tip:</strong> Open Google Maps, drop a pin at the center of this city, and copy the Latitude and Longitude here! This will create a 5-10km circle around it automatically.
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Zone Name</label>
                  <input type="text" placeholder="e.g. Central Zone" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Short Code</label>
                  <input type="text" placeholder="e.g. CEN" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Latitude (Center)</label>
                  <input type="number" step="any" placeholder="e.g. 24.9545" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Longitude (Center)</label>
                  <input type="number" step="any" placeholder="e.g. 83.9930" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>City</label>
                  <input type="text" placeholder="e.g. Akbarpur" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>State</label>
                  <input type="text" placeholder="e.g. Bihar" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Covered Pincodes (comma separated)</label>
                <input type="text" placeholder="821306, 821307" value={formData.pincodes} onChange={e => setFormData({...formData, pincodes: e.target.value})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Base Delivery Fee (₹)</label>
                  <input type="number" value={formData.deliveryFee} onChange={e => setFormData({...formData, deliveryFee: Number(e.target.value)})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Min Order Value (₹)</label>
                  <input type="number" value={formData.minimumOrderValue} onChange={e => setFormData({...formData, minimumOrderValue: Number(e.target.value)})} required className="form-input" style={{ width: '100%', padding: '10px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 12 }}>{formData._id ? 'Update Zone' : 'Create Zone'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
