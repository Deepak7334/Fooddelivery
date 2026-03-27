import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <circle cx="24" cy="24" r="24" fill="#fff" />
        <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="sans-serif" fill="#4285F4">G</text>
        <circle cx="34" cy="14" r="5" fill="#EA4335" />
        <circle cx="14" cy="14" r="5" fill="#FBBC05" />
        <circle cx="14" cy="34" r="5" fill="#34A853" />
        <circle cx="34" cy="34" r="5" fill="#4285F4" />
      </svg>
    ),
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: '#5F259F',
    icon: (
      <svg viewBox="0 0 48 48" width="32" height="32">
        <circle cx="24" cy="24" r="24" fill="#5F259F" />
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="sans-serif" fill="#fff">P</text>
      </svg>
    ),
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: '#00BAF2',
    icon: (
      <svg viewBox="0 0 48 48" width="32" height="32">
        <circle cx="24" cy="24" r="24" fill="#00BAF2" />
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="sans-serif" fill="#fff">PAY</text>
      </svg>
    ),
  },
  {
    id: 'bhim',
    name: 'BHIM',
    color: '#00529B',
    icon: (
      <svg viewBox="0 0 48 48" width="32" height="32">
        <circle cx="24" cy="24" r="24" fill="#00529B" />
        <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="sans-serif" fill="#fff">BHIM</text>
      </svg>
    ),
  },
];

// A deterministic QR-like visual grid
function QRDisplay({ value }) {
  const size = 21;
  const hash = [...(value || 'FOODHUB')].reduce((a, c) => a + c.charCodeAt(0), 0);

  // Fixed corner squares (always filled for real QR look)
  const corners = new Set();
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) corners.add(`${r},${c}`);
  for (let r = 0; r < 7; r++) for (let c = size - 7; c < size; c++) corners.add(`${r},${c}`);
  for (let r = size - 7; r < size; r++) for (let c = 0; c < 7; c++) corners.add(`${r},${c}`);

  // Corner inner squares (white)
  const cornerInner = new Set();
  for (let r = 2; r < 5; r++) for (let c = 2; c < 5; c++) cornerInner.add(`${r},${c}`);
  for (let r = 2; r < 5; r++) for (let c = size - 5; c < size - 2; c++) cornerInner.add(`${r},${c}`);
  for (let r = size - 5; r < size - 2; r++) for (let c = 2; c < 5; c++) cornerInner.add(`${r},${c}`);

  // Corner separation (white rim)
  const cornerRim = new Set();
  for (let r = 0; r < 8; r++) { cornerRim.add(`${r},7`); cornerRim.add(`7,${r}`); }
  for (let r = 0; r < 8; r++) { cornerRim.add(`${r},${size - 8}`); cornerRim.add(`7,${size - 8 + r}`); }
  for (let r = size - 8; r <= size; r++) { cornerRim.add(`${r},7`); cornerRim.add(`${size - 8},${r}`); }

  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      let fill = '#fff';
      if (corners.has(key) && !cornerRim.has(key)) {
        fill = cornerInner.has(key) ? '#fff' : '#1a1a2e';
      } else if (!cornerRim.has(key)) {
        // pseudorandom fill from hash
        const v = (hash * (r * size + c + 1)) % 17;
        fill = v < 9 ? '#1a1a2e' : '#fff';
      }
      cells.push(
        <rect key={key} x={c * 5} y={r * 5} width="5" height="5" fill={fill} />
      );
    }
  }

  return (
    <div style={{
      background: '#fff',
      padding: 12,
      borderRadius: 16,
      display: 'inline-block',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    }}>
      <svg width={size * 5} height={size * 5} viewBox={`0 0 ${size * 5} ${size * 5}`}>
        {cells}
        {/* Center logo placeholder */}
        <rect x={size * 5 / 2 - 12} y={size * 5 / 2 - 12} width="24" height="24" rx="4" fill="#fff" />
        <text x={size * 5 / 2} y={size * 5 / 2 + 5} textAnchor="middle" fontSize="11" fontWeight="900" fill="var(--primary, #ff5722)" fontFamily="sans-serif">₹</text>
      </svg>
    </div>
  );
}

export default function UpiPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId, amount } = location.state || {};

  const [tab, setTab] = useState('qr'); // 'qr' | 'upiid' | 'app'
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [paying, setPaying] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);

  // UPI string for QR
  const upiString = `upi://pay?pa=foodhub@upi&pn=FoodHub&am=${amount || 0}&cu=INR&tn=FoodOrder`;

  useEffect(() => {
    if (!orderId || !amount) {
      navigate('/checkout');
    }
  }, [orderId, amount]);

  const validateUpi = (id) => /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(id);

  const simulatePayment = async (method) => {
    setPaying(true);
    // Simulate countdown
    setCountdown(3);
    let c = 3;
    timerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) clearInterval(timerRef.current);
    }, 1000);

    await new Promise(r => setTimeout(r, 3200));

    try {
      await api.post('/payment/verify', {
        orderId,
        razorpayOrderId: 'upi_order_' + Date.now(),
        razorpayPaymentId: `upi_${method}_${Date.now()}`,
        razorpaySignature: 'mock',
      });
      toast.success('Payment successful! 🎉');
      navigate(`/orders/${orderId}/track`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Try again.');
      setPaying(false);
      setCountdown(null);
    }
  };

  const handleUpiPay = () => {
    if (!validateUpi(upiId)) {
      setUpiError('Enter a valid UPI ID (e.g. name@bank)');
      return;
    }
    setUpiError('');
    simulatePayment('upiid');
  };

  const handleAppPay = (app) => {
    setSelectedApp(app.id);
    simulatePayment(app.id);
  };

  if (!orderId) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}></div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
          UPI <span style={{ color: 'var(--primary)' }}>Payment</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
          Complete your payment securely via UPI
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,87,34,0.12)', borderRadius: 999,
          padding: '6px 18px', marginTop: 12,
          border: '1px solid rgba(255,87,34,0.3)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>₹{amount}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>to be paid</span>
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          {[
            { id: 'qr', label: ' QR Code' },
            { id: 'upiid', label: ' UPI ID' },
            { id: 'app', label: ' Pay via App' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '14px 4px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 28 }}>
          {/* --- QR CODE TAB --- */}
          {tab === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative' }}>
                <QRDisplay value={upiString} />
                {paying && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 16,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--primary)' }} />
                    {countdown > 0 && (
                      <span style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{countdown}</span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Scan with any UPI App</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  GPay · PhonePe · Paytm · BHIM · Any UPI App
                </div>
                <div style={{
                  marginTop: 12, padding: '8px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8, fontSize: 11,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  wordBreak: 'break-all',
                }}>
                  <b>UPI ID:</b> foodhub@upi
                </div>
              </div>
              {!paying && (
                <button
                  onClick={() => simulatePayment('qr')}
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 4 }}
                >
                  Proceed
                </button>
              )}
              {paying && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                  Verifying your payment… please wait
                </div>
              )}
            </div>
          )}

          {/* --- UPI ID TAB --- */}
          {tab === 'upiid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Enter UPI ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="yourname@bank (e.g. ram@okicici)"
                    value={upiId}
                    onChange={e => { setUpiId(e.target.value); setUpiError(''); }}
                    style={{ paddingRight: 48 }}
                    disabled={paying}
                  />
                  {upiId && (
                    <span style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 16,
                    }}>
                      {validateUpi(upiId) ? '✅' : '❌'}
                    </span>
                  )}
                </div>
                {upiError && (
                  <div style={{ color: '#ff5252', fontSize: 12, marginTop: 6 }}>{upiError}</div>
                )}
              </div>

              {/* Common bank hints */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                  COMMON UPI HANDLES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['@okicici', '@oksbi', '@okhdfc', '@ybl', '@upi', '@paytm'].map(handle => (
                    <button
                      key={handle}
                      onClick={() => setUpiId(prev => {
                        const base = prev.includes('@') ? prev.split('@')[0] : prev;
                        return base + handle;
                      })}
                      style={{
                        padding: '4px 10px', borderRadius: 999, fontSize: 11,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'rgba(255,193,7,0.06)',
                border: '1px solid rgba(255,193,7,0.2)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  A payment request of <b style={{ color: 'var(--primary)' }}>₹{amount}</b> will be sent to your UPI app. Approve it within 5 minutes.
                </div>
              </div>

              <button
                onClick={handleUpiPay}
                className="btn btn-primary btn-full"
                disabled={paying || !upiId}
              >
                {paying ? (
                  <><span className="spinner" style={{ width: 18, height: 18 }} /> Sending Request…</>
                ) : (
                  `Send Payment Request  ·  ₹${amount}`
                )}
              </button>
            </div>
          )}

          {/* --- APP TAB --- */}
          {tab === 'app' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Select your preferred UPI app to pay <b style={{ color: 'var(--primary)' }}>₹{amount}</b>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {UPI_APPS.map(app => (
                  <button
                    key={app.id}
                    onClick={() => !paying && handleAppPay(app)}
                    disabled={paying}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 10, padding: '20px 12px',
                      borderRadius: 14,
                      background: selectedApp === app.id
                        ? `${app.color}22`
                        : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${selectedApp === app.id ? app.color : 'var(--border)'}`,
                      cursor: paying ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: paying && selectedApp !== app.id ? 0.5 : 1,
                      position: 'relative',
                    }}
                  >
                    {app.icon}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</span>
                    {paying && selectedApp === app.id && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 14,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3, borderTopColor: app.color }} />
                        {countdown > 0 && (
                          <span style={{ color: '#fff', fontWeight: 700 }}>{countdown}s</span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div style={{
                background: 'rgba(34,255,52,0.05)',
                border: '1px solid rgba(34,255,52,0.15)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', gap: 10, alignItems: 'center',
                fontSize: 12, color: 'var(--text-secondary)',
              }}>
                <span>🔒</span>
                Payments are 100% secure and encrypted via NPCI UPI rails.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back link */}
      {!paying && (
        <button
          onClick={() => navigate('/checkout')}
          style={{
            marginTop: 20, background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 13, textDecoration: 'underline',
          }}
        >
          ← Back to Checkout
        </button>
      )}

      {/* UPI logos footer */}
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Secured by</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {['🇮🇳 NPCI UPI', '🔒 256-bit SSL', '✅ RBI Regulated'].map(label => (
            <span key={label} style={{
              fontSize: 10, color: 'var(--text-secondary)',
              padding: '3px 10px', borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.03)',
            }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
