import { Link } from 'react-router-dom';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '48px 0 24px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>
              JD<span style={{ color: 'var(--text-primary)' }}>kart</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Delivering happiness to your doorstep. Order from the best restaurants near you or book a table instantly.
            </p>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Quick Links</div>
            {[['Home', '/'], ['Order Food', '/restaurants'], ['Grocery & Stores', '/stores'], ['About Us', '/about'], ['Terms & Privacy', '/terms']].map(([label, path]) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <Link to={path} onClick={() => window.scrollTo(0, 0)} style={{ fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  {label}
                </Link>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Contact</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>📧 supportjdkart@gmail.com</p>
            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              <a 
                href="https://instagram.com/jd__kart" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#E1306C'} 
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <FaInstagram size={18} /> Instagram
              </a>
              <a 
                href="https://wa.me/917762971182" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#25D366'} 
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <FaWhatsapp size={18} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="divider" />
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          © 2026 JDkart. Made with ❤️ for Villagers to order Anything Easily.
        </div>
      </div>
    </footer>
  );
}
