import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiShoppingBag, 
  FiTruck, 
  FiHeart, 
  FiMapPin, 
  FiShield, 
  FiSmile, 
  FiPhoneCall, 
  FiAward,
  FiArrowRight
} from 'react-icons/fi';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: <FiTruck size={24} color="#FF5722" />,
      title: 'Fast Doorstep Delivery',
      desc: 'Delivering hot meals from top restaurants and fresh groceries from local stores straight to your home, even in rural and semi-urban localities.'
    },
    {
      icon: <FiHeart size={24} color="#E91E63" />,
      title: 'Empowering Local Vendors',
      desc: 'We partner closely with neighborhood kiranas, grocery shops, and local restaurants, helping them thrive digitally without unfair commissions.'
    },
    {
      icon: <FiShield size={24} color="#4CAF50" />,
      title: 'COD & Secure UPI',
      desc: 'Pay your way with complete confidence. We support instant QR/UPI digital payments as well as reliable Cash on Delivery.'
    },
    {
      icon: <FiMapPin size={24} color="#00BCD4" />,
      title: 'Hyperlocal Village Reach',
      desc: 'Built specifically to bridge the convenience gap for village communities and suburban areas often overlooked by big city delivery platforms.'
    },
    {
      icon: <FiSmile size={24} color="#FF9800" />,
      title: 'Customer Satisfaction',
      desc: 'Friendly, responsive local support available via WhatsApp and phone to resolve questions and ensure every order brings a smile.'
    },
    {
      icon: <FiAward size={24} color="#9C27B0" />,
      title: 'Fresh & Hygienic',
      desc: 'Carefully vetted restaurant partners and hygienic food handling standards to guarantee high quality in every single delivery.'
    }
  ];

  return (
    <div style={{ minHeight: '80vh', padding: 'clamp(24px, 4vw, 40px) 0 60px' }}>
      <div className="container">
        
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          maxWidth: 800,
          margin: '0 auto clamp(30px, 5vw, 50px)',
          padding: 'clamp(28px, 5vw, 44px) clamp(16px, 4vw, 24px)',
          background: 'linear-gradient(180deg, var(--glass) 0%, transparent 100%)',
          borderRadius: 'clamp(16px, 3vw, 24px)',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: 'rgba(255, 87, 34, 0.12)',
            border: '1px solid rgba(255, 87, 34, 0.25)',
            borderRadius: 100,
            color: 'var(--primary)',
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <FiHeart size={14} /> Our Mission & Story
          </div>
          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.25,
            marginBottom: 16,
            color: 'var(--text-primary)'
          }}>
            Delivering Convenience to Every Doorstep with <span style={{ color: 'var(--primary)' }}>JD</span><span>kart</span>
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2.5vw, 17px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            margin: '0 auto',
            maxWidth: 680
          }}>
            We believe that no matter where you live—in a busy town or a peaceful village—you deserve fast, reliable access to delicious food, fresh daily essentials, and hassle-free dining.
          </p>
        </div>

        {/* The Story / Vision Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 'clamp(24px, 4vw, 36px) clamp(16px, 4vw, 32px)',
          marginBottom: clampMargin(32, 48),
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(20px, 4vw, 32px)', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Why We Started
              </span>
              <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 24px)', fontWeight: 800, margin: '10px 0 16px', color: 'var(--text-primary)' }}>
                Bridging the City & Village Gap
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8, marginBottom: 14 }}>
                For years, modern delivery apps ignored smaller towns, semi-urban localities, and villages. JDkart was born out of a simple determination: <strong>make everyday life easier for local residents.</strong>
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8 }}>
                Whether it's a family craving hot biryani or sweets in the evening, parents running out of milk and daily groceries, or friends planning to reserve a dining table, JDkart brings neighborhood merchants and village customers together on one intuitive platform.
              </p>
            </div>
            <div style={{
              background: 'var(--bg-card2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 'clamp(20px, 4vw, 28px)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🏡❤️🛵</div>
              <blockquote style={{
                fontStyle: 'italic',
                fontSize: 'clamp(14px, 2.8vw, 16px)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                margin: '0 0 14px'
              }}>
                "Made with ❤️ for Villagers to order Anything Easily."
              </blockquote>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                — The JDkart Promise
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 26px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              What Makes JDkart Special
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              Built with care for our local community and regional partners
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: 20
          }}>
            {features.map((item, index) => (
              <div 
                key={index} 
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 'clamp(18px, 3.5vw, 24px)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--bg-card2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)'
                }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* What Can You Do On JDkart */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 'clamp(24px, 4vw, 36px) clamp(16px, 4vw, 30px)',
          marginBottom: 48
        }}>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 24px)', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 28 }}>
            Explore Our Services
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 20 }}>
            <div style={{ padding: 'clamp(16px, 3.5vw, 20px)', borderRadius: 14, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🍛</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Food Delivery</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                Order your favorite dishes, biryani, pizzas, snacks, and sweet treats from the most popular eateries in town.
              </p>
              <Link to="/restaurants" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
                Browse Food <FiArrowRight size={14} />
              </Link>
            </div>

            <div style={{ padding: 'clamp(16px, 3.5vw, 20px)', borderRadius: 14, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Grocery & Stores</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                Stock up on kitchen staples, packaged foods, beverages, and personal care items from verified local stores.
              </p>
              <Link to="/stores" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
                Explore Stores <FiArrowRight size={14} />
              </Link>
            </div>

            <div style={{ padding: 'clamp(16px, 3.5vw, 20px)', borderRadius: 14, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Table Reservations</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                Planning a dinner outing with family or friends? Book comfortable tables in advance with zero waiting time.
              </p>
              <Link to="/restaurants" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>
                Reserve Table <FiArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Contact & Support Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 87, 34, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
          border: '1px solid rgba(255, 87, 34, 0.25)',
          borderRadius: 20,
          padding: 'clamp(24px, 4vw, 36px) clamp(16px, 4vw, 28px)',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 24px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
            Have Questions or Want to Partner With Us?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 580, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Whether you are a customer needing assistance, a restaurant wanting to join our fleet, or an aspiring delivery partner, we're always ready to help!
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a 
              href="https://wa.me/917762971182" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn" 
              style={{ background: '#25D366', color: '#fff', fontWeight: 700, padding: '12px 22px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: '1 1 200px', maxWidth: 260 }}
            >
              <FaWhatsapp size={18} /> WhatsApp
            </a>

            <a 
              href="mailto:supportjdkart@gmail.com" 
              className="btn" 
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontWeight: 700, padding: '12px 22px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: '1 1 200px', maxWidth: 260 }}
            >
              <FiPhoneCall size={18} /> Email Support
            </a>

            <a 
              href="https://instagram.com/jd__kart" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn" 
              style={{ background: '#E1306C', color: '#fff', fontWeight: 700, padding: '12px 22px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: '1 1 200px', maxWidth: 260 }}
            >
              <FaInstagram size={18} /> Instagram
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function clampMargin(min, max) {
  return `clamp(${min}px, 4vw, ${max}px)`;
}
