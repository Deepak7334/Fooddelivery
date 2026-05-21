import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    if (user.role === 'admin') navigate('/admin', { replace: true });
    else if (user.role === 'restaurant') navigate('/restaurant', { replace: true });
    else if (user.role === 'delivery') navigate('/delivery', { replace: true });
    else navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await login(form.email, form.password);
      } else {
        if (!form.name || !form.email || !form.password) {
          toast.error('Please fill all fields'); setLoading(false); return;
        }
        res = await register(form);
      }
      if (res.success) {
        toast.success(mode === 'login' ? 'Welcome back! ' : 'Account created! ');
        const role = res.user.role;
        if (role === 'admin') navigate('/admin');
        else if (role === 'restaurant') navigate('/restaurant');
        else if (role === 'delivery') navigate('/delivery');
        else navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: 24, position: 'relative' }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,87,34,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,193,7,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ display: 'inline-block', fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>
            FoodHub
          </Link>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
          </div>
        </div>

        <div className="card" style={{ padding: 36 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderRadius: 10, background: 'rgba(255,255,255,0.04)', padding: 4, marginBottom: 28 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'var(--transition)',
              }}>
                {m === 'login' ? ' Sign In' : ' Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Processing...</> : mode === 'login' ? ' Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,87,34,0.08)', borderRadius: 10, border: '1px solid rgba(255,87,34,0.2)', fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}></div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 2 }}>
              <div> Don't have an account? Switch to Register to create one.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
