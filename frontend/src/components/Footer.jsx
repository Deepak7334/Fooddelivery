import { Link } from 'react-router-dom';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="customer-footer">
      <div className="container customer-footer-inner">
        <div className="customer-footer-brand">
          JD<span>kart</span>
        </div>
        <div className="customer-footer-links">
          <Link to="/" onClick={() => window.scrollTo(0, 0)}>Home</Link>
          <Link to="/restaurants" onClick={() => window.scrollTo(0, 0)}>Restaurants</Link>
          <Link to="/stores" onClick={() => window.scrollTo(0, 0)}>Stores</Link>
          <Link to="/offers" onClick={() => window.scrollTo(0, 0)}>Offers</Link>
          <Link to="/about" onClick={() => window.scrollTo(0, 0)}>About</Link>
          <Link to="/terms" onClick={() => window.scrollTo(0, 0)}>Terms</Link>
          <Link to="/privacy" onClick={() => window.scrollTo(0, 0)}>Privacy</Link>
          <a href="https://instagram.com/jd__kart" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FaInstagram size={14} /> Instagram</a>
          <a href="https://wa.me/917762971182" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FaWhatsapp size={14} /> WhatsApp</a>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          © 2026 JDkart · supportjdkart@gmail.com · Made with ❤️ for Villagers
        </div>
      </div>
    </footer>
  );
}
