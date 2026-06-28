import { Link } from 'react-router-dom';

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
            {[['Home', '/'], ['Restaurants', '/restaurants'], ['My Orders', '/orders'], ['Book a Table', '/restaurants']].map(([label, path]) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <Link to={path} style={{ fontSize: 14, color: 'var(--text-secondary)', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  {label}
                </Link>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Contact</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>📧 support@jdkart.com</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>📞 1800-JDkart</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>⏰ 24/7 Support</p>
          </div>
        </div>
        <div className="divider" />
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          © 2026 JDkart. Made with ❤️ for food lovers.
        </div>
      </div>
    </footer>
  );
}
