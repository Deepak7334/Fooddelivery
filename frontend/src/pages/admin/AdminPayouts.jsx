import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function AdminPayouts() {
  const [activeTab, setActiveTab] = useState('pending');
  const [payouts, setPayouts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        api.get('/admin/payouts'),
        api.get('/admin/payout-history')
      ]);
      if (pendingRes.data.success) {
        setPayouts(pendingRes.data.payouts);
      }
      if (historyRes.data.success) {
        setHistory(historyRes.data.payouts);
      }
    } catch (error) {
      toast.error('Failed to fetch payouts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (vendorId, vendorType, vendorName) => {
    if (!window.confirm(`Are you sure you want to mark all pending payments for ${vendorName} as Paid? This cannot be undone.`)) {
      return;
    }

    setSettling(vendorId);
    try {
      const { data } = await api.post('/admin/payouts/settle', { vendorId, vendorType, vendorName });
      if (data.success) {
        toast.success(data.message);
        // Refresh everything to reflect new history
        fetchPayouts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to settle payouts');
      console.error(error);
    } finally {
      setSettling(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Vendor <span style={{ color: 'var(--primary)' }}>Payouts</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Track and settle pending payments to restaurants and stores.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-secondary)', padding: 4, borderRadius: 8 }}>
          <button 
            onClick={() => setActiveTab('pending')}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: activeTab === 'pending' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'pending' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
            Pending
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: activeTab === 'history' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'history' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
            History
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {activeTab === 'pending' ? (
          payouts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>All caught up!</h3>
            <p style={{ fontSize: 14 }}>There are no pending payouts at this time.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <tr>
                  <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Vendor Name</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Pending Orders</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Total Owed</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.vendorId} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{p.vendorName}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        fontSize: 12, 
                        fontWeight: 600, 
                        background: p.vendorType === 'restaurant' ? 'rgba(255,152,0,0.1)' : 'rgba(33,150,243,0.1)',
                        color: p.vendorType === 'restaurant' ? '#FF9800' : '#2196F3',
                        textTransform: 'capitalize'
                      }}>
                        {p.vendorType}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {p.pendingOrdersCount} {p.pendingOrdersCount === 1 ? 'Order' : 'Orders'}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--primary)', fontSize: 16 }}>
                      ₹{(p.totalOwed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleSettle(p.vendorId, p.vendorType, p.vendorName)}
                        disabled={settling === p.vendorId}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: 13 }}
                      >
                        {settling === p.vendorId ? 'Processing...' : 'Mark as Paid'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        ) : (
          history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>No payout history</h3>
              <p style={{ fontSize: 14 }}>You haven't settled any payouts yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Vendor Name</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Orders Settled</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: 14 }}>
                        {new Date(h.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>{h.vendorName}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 6, 
                          fontSize: 12, 
                          fontWeight: 600, 
                          background: h.vendorType === 'restaurant' ? 'rgba(255,152,0,0.1)' : 'rgba(33,150,243,0.1)',
                          color: h.vendorType === 'restaurant' ? '#FF9800' : '#2196F3',
                          textTransform: 'capitalize'
                        }}>
                          {h.vendorType}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                        {h.orderCount}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--primary)', fontSize: 16, textAlign: 'right' }}>
                        ₹{(h.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
