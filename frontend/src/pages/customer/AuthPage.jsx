import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { auth } from '../../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function AuthPage() {
  const [view, setView] = useState('customer'); // 'customer' or 'partner'
  const [step, setStep] = useState(1); // 1: Email+Name, 2: OTP
  
  // Customer State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');

  // Partner State
  const [partnerMode, setPartnerMode] = useState('login');
  const [partnerForm, setPartnerForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const { login, register, firebaseLogin, sendEmailOtp, verifyEmailOtp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'sub_admin') navigate('/admin', { replace: true });
      else if (user.role === 'restaurant') navigate('/restaurant', { replace: true });
      else if (user.role === 'store_owner') navigate('/store-owner', { replace: true });
      else if (user.role === 'delivery') navigate('/delivery', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email address');
    
    setLoading(true);
    try {
      const res = await sendEmailOtp(email);
      if (res.success) {
        setStep(2);
        toast.success('OTP sent to your email!');
      } else {
        toast.error(res.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return toast.error('Enter a valid 6-digit OTP');
    
    setLoading(true);
    try {
      const res = await verifyEmailOtp(email, otp, name);
      if (res.success) {
        toast.success('Welcome to JDkart!');
        navigate('/');
      } else {
        toast.error(res.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const res = await firebaseLogin(idToken, result.user.displayName, 'google');
      if (res.success) {
        toast.success('Welcome to JDkart!');
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (partnerMode === 'login') {
        res = await login(partnerForm.email, partnerForm.password);
      } else {
        if (!partnerForm.name || !partnerForm.email || !partnerForm.password) {
          toast.error('Please fill all fields'); setLoading(false); return;
        }
        res = await register(partnerForm);
      }
      if (res.success) {
        toast.success(partnerMode === 'login' ? 'Welcome back! ' : 'Account created! ');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: 24, position: 'relative' }}>
      
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,87,34,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,193,7,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ display: 'inline-block', fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>JDkart</Link>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            {view === 'customer' ? 'Login or signup to place your order.' : 'Partner Portal'}
          </div>
        </div>

        <div className="card" style={{ padding: 36 }}>
          {view === 'customer' ? (
            <>
              {step === 1 ? (
                <form onSubmit={handleSendOtp}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" type="text" placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Required only for new accounts.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }}>
                    {loading ? 'Sending OTP...' : 'Continue'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
                    OTP sent to {email}. <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button> | <button type="button" onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', marginLeft: 6 }}>Resend OTP</button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Enter 6-digit OTP</label>
                    <input className="form-input" type="text" maxLength="6" placeholder="• • • • • •" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" inputMode="numeric" required style={{ letterSpacing: 8, fontSize: 18, textAlign: 'center' }} />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }}>
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                </form>
              )}

              {step === 1 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--text-muted)' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                    <div style={{ padding: '0 12px', fontSize: 12, fontWeight: 600 }}>OR</div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                  </div>
                  <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn btn-secondary btn-full btn-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#000' }}>
                    <FcGoogle size={22} /> Continue with Google
                  </button>
                </>
              )}
            </>
          ) : (
            // Partner Flow
            <>
              <div style={{ display: 'flex', borderRadius: 10, background: 'rgba(255,255,255,0.04)', padding: 4, marginBottom: 28 }}>
                {['login', 'register'].map(m => (
                  <button key={m} onClick={() => setPartnerMode(m)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 14, background: partnerMode === m ? 'var(--primary)' : 'transparent', color: partnerMode === m ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
                    {m === 'login' ? ' Sign In' : ' Register'}
                  </button>
                ))}
              </div>
              <form onSubmit={handlePartnerSubmit}>
                {partnerMode === 'register' && (
                  <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" value={partnerForm.name} onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })} required /></div>
                )}
                <div className="form-group"><label className="form-label">Email Address</label><input className="form-input" type="email" value={partnerForm.email} onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })} required /></div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" style={{ paddingRight: '40px' }} type={showPassword ? "text" : "password"} value={partnerForm.password} onChange={e => setPartnerForm({ ...partnerForm, password: e.target.value })} required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }}>{loading ? 'Processing...' : partnerMode === 'login' ? 'Sign In' : 'Create Account'}</button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" onClick={() => setView(view === 'customer' ? 'partner' : 'customer')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
            {view === 'customer' ? 'Login as Partner' : 'Login as Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
