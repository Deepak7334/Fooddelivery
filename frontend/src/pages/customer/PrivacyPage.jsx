import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiLock, FiShield, FiEye, FiDatabase, FiCheckCircle, FiMail, FiArrowRight } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction & Commitment',
      icon: <FiShield size={20} color="#FF5722" />,
      content: (
        <>
          <p>
            At <strong>JDkart</strong> ("we", "our", or "us"), we are deeply dedicated to protecting the personal privacy and data security of our customers, merchant partners, and delivery personnel.
          </p>
          <p>
            This Privacy Policy outlines how we collect, store, utilize, and protect your personal details when you interact with the JDkart website or mobile platform. By accessing JDkart, you consent to the data collection and practices described in this policy.
          </p>
        </>
      )
    },
    {
      id: 'collection',
      title: '2. Information We Collect',
      icon: <FiDatabase size={20} color="#00BCD4" />,
      content: (
        <>
          <p>We only collect information necessary to provide seamless, accurate delivery services:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Account & Contact Data:</strong> Your name, phone number, email address, and profile preferences when you register or log in.</li>
            <li><strong>Delivery Addresses:</strong> Street address, village/locality name, landmarks, and optional geographical coordinates (latitude and longitude) provided to ensure accurate doorstep delivery.</li>
            <li><strong>Order History & Preferences:</strong> Details of items added to your cart, past orders placed, dining table reservations, and discount/coupon codes utilized.</li>
            <li><strong>Device & Technical Information:</strong> IP address, browser type, operating system, and diagnostic logs collected automatically to safeguard against unauthorized access and system bugs.</li>
          </ul>
        </>
      )
    },
    {
      id: 'usage',
      title: '3. How We Use Your Information',
      icon: <FiEye size={20} color="#4CAF50" />,
      content: (
        <>
          <p>Your data is utilized strictly for legitimate operational purposes:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Order Fulfillment:</strong> Processing your food and grocery orders and coordinating pick-up and delivery between local vendors and delivery agents.</li>
            <li><strong>Live Tracking & Communication:</strong> Sending critical order status updates, delivery partner arrival notices, and OTPs via SMS, WhatsApp, and in-app notifications.</li>
            <li><strong>Customer Care:</strong> Resolving order queries, payment issues, cancellations, and refund requests quickly.</li>
            <li><strong>Platform Optimization:</strong> Improving page loading speeds, user interface responsiveness, and recommending popular regional dishes.</li>
          </ul>
        </>
      )
    },
    {
      id: 'sharing',
      title: '4. Information Sharing & Third Parties',
      icon: <FiLock size={20} color="#E91E63" />,
      content: (
        <>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            We do NOT sell, rent, or trade your personal information to third-party marketing or advertising companies under any circumstances.
          </p>
          <p>Data is shared only on a strict need-to-know basis with:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Assigned Delivery Partners:</strong> Provided with your name, phone number, and delivery address solely to execute the active delivery.</li>
            <li><strong>Merchant Partners:</strong> Restaurants and stores receive your order items, customer notes, and booking requests to prepare items accurately.</li>
            <li><strong>Secure Payment Processors:</strong> Authorized payment gateways and UPI rails to process digital transactions securely.</li>
            <li><strong>Legal & Regulatory Authorities:</strong> Only when strictly mandated by applicable Indian law or court orders to protect against fraud or public safety concerns.</li>
          </ul>
        </>
      )
    },
    {
      id: 'google-user-data',
      title: '5. Google User Data & OAuth Limited Use Disclosure',
      icon: <FiShield size={20} color="#4285F4" />,
      content: (
        <>
          <p>
            When you sign in to <strong>JDkart</strong> using your Google account ("Sign in with Google"), we request access strictly to your basic profile information (name, email address, and profile picture).
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>How We Use Google Data:</strong> Your Google account information is used exclusively to authenticate your identity, create your JDkart profile, autofill your contact details, and send order receipts and delivery updates.</li>
            <li><strong>No Transfer or Sale:</strong> JDkart does NOT share, sell, rent, or transfer your Google user data to third-party data brokers, marketing agencies, or advertising platforms.</li>
            <li><strong>No Artificial Intelligence Training:</strong> Your Google user data is never used to train generalized artificial intelligence (AI) or machine learning (ML) models.</li>
            <li><strong>Google API Limited Use Disclosure:</strong> JDkart's use and transfer to any other app of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Google API Services User Data Policy</a>, including the <em>Limited Use</em> requirements.</li>
            <li><strong>Revoking Access:</strong> You can disconnect or revoke JDkart's access to your Google account at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Google Security Account Permissions</a>.</li>
          </ul>
        </>
      )
    },
    {
      id: 'payment-safety',
      title: '6. Payment & Financial Data Safety',
      icon: <FiShield size={20} color="#FF9800" />,
      content: (
        <>
          <p>
            Your financial security is our highest priority:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Online digital payments are facilitated through secure, RBI-compliant payment gateways.</li>
            <li><strong>Zero Storage of Sensitive Credentials:</strong> JDkart NEVER stores your bank account passwords, UPI PINs, debit/credit card CVV codes, or OTPs on our servers.</li>
            <li>For Cash on Delivery (COD) orders, payment is made directly in person upon receipt of goods.</li>
          </ul>
        </>
      )
    },
    {
      id: 'cookies-storage',
      title: '7. Cookies & Local Storage',
      icon: <FiDatabase size={20} color="#9C27B0" />,
      content: (
        <>
          <p>
            We utilize secure local browser storage and minimal cookies to enhance your browsing experience:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Authentication Tokens:</strong> Securely keep you logged into your account so you don't have to re-enter your password on every page refresh.</li>
            <li><strong>Cart Persistence:</strong> Retain your chosen items in the cart even if you navigate between different menus or close your browser temporarily.</li>
            <li><strong>Theme Preference:</strong> Remember your selected Light Mode or Dark Mode visual preference.</li>
          </ul>
        </>
      )
    },
    {
      id: 'data-security',
      title: '8. Data Security Safeguards',
      icon: <FiLock size={20} color="#4CAF50" />,
      content: (
        <>
          <p>
            We deploy multiple layers of administrative and technological safeguards:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>HTTPS & SSL Encryption:</strong> All data transmitted between your browser and our servers is secured using modern TLS encryption protocols.</li>
            <li><strong>Tokenized Authorization:</strong> Industry-standard JSON Web Tokens (JWT) and encrypted password hashing (bcrypt) protect user accounts from unauthorized breaches.</li>
            <li><strong>Restricted Admin Access:</strong> Access to customer records is strictly limited to authorized support personnel handling active grievances.</li>
          </ul>
        </>
      )
    },
    {
      id: 'user-rights',
      title: '9. Your Rights & Choices',
      icon: <FiCheckCircle size={20} color="#00BCD4" />,
      content: (
        <>
          <p>You maintain complete control over your personal information:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Review & Edit:</strong> You can review and update your name, phone number, and saved delivery addresses anytime by navigating to your <em>Profile</em> page.</li>
            <li><strong>Account Deletion:</strong> If you wish to permanently delete your account and associated personal data, you can submit a request to our support team, and we will process it within 14 business days.</li>
            <li><strong>Notification Controls:</strong> You may toggle notification preferences or request to be unsubscribed from promotional updates.</li>
          </ul>
        </>
      )
    },
    {
      id: 'contact',
      title: '10. Contact Us & Grievance Redressal',
      icon: <FiMail size={20} color="#FF5722" />,
      content: (
        <>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or how your personal information is handled, please contact our Data & Grievance team:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Email:</strong> <a href="mailto:supportjdkart@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>supportjdkart@gmail.com</a></li>
            <li><strong>WhatsApp Assistance:</strong> <a href="https://wa.me/917762971182" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>+91 7762971182</a></li>
            <li><strong>Official Address:</strong> JDkart Operations, India</li>
          </ul>
        </>
      )
    }
  ];

  return (
    <div style={{ minHeight: '80vh', padding: 'clamp(24px, 4vw, 40px) 0 60px' }}>
      <div className="container" style={{ maxWidth: 920 }}>
        
        {/* Navigation switcher pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, padding: '0 8px' }}>
          <div style={{
            display: 'inline-flex',
            maxWidth: '100%',
            padding: 4,
            background: 'var(--bg-card2)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxSizing: 'border-box'
          }}>
            <Link to="/terms" style={{
              padding: '8px clamp(12px, 3.5vw, 20px)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              fontSize: 'clamp(12px, 3.2vw, 14px)',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'var(--transition)'
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Terms & Conditions
            </Link>
            <span style={{
              padding: '8px clamp(12px, 3.5vw, 20px)',
              borderRadius: 8,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 'clamp(12px, 3.2vw, 14px)',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}>
              Privacy Policy
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 30,
          padding: 'clamp(20px, 4vw, 30px) clamp(16px, 4vw, 20px)',
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(0, 188, 212, 0.1)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <FiLock size={26} />
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4.5vw, 36px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(12px, 2.5vw, 14px)', margin: 0 }}>
            Last Updated: October 2026 • How JDkart safeguards and respects your privacy
          </p>
        </div>

        {/* Highlights banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.08) 0%, rgba(76, 175, 80, 0.08) 100%)',
          border: '1px solid rgba(0, 188, 212, 0.25)',
          borderRadius: 16,
          padding: 'clamp(16px, 3vw, 20px) clamp(14px, 3vw, 24px)',
          marginBottom: 30,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 14
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <FiCheckCircle size={20} color="#00BCD4" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>No Selling of Personal Data</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <FiCheckCircle size={20} color="#4CAF50" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Encrypted SSL & Secure JWT</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <FiCheckCircle size={20} color="#FF9800" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Zero UPI PIN or Card Storage</span>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
          {sections.map(sec => (
            <div 
              key={sec.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 'clamp(18px, 4vw, 28px) clamp(16px, 4vw, 26px)',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <h2 style={{
                fontSize: 'clamp(18px, 3.5vw, 20px)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {sec.icon} {sec.title}
              </h2>
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: 15,
                lineHeight: 1.8,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {sec.content}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Link Card to Terms */}
        <div style={{
          background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 'clamp(18px, 3.5vw, 24px) clamp(16px, 3.5vw, 28px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
              Looking for our Terms & Conditions?
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Read our policies on orders, payments, cancellations, and delivery rules.
            </div>
          </div>
          <Link 
            to="/terms" 
            className="btn btn-primary"
            style={{ fontWeight: 700, padding: '10px 20px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            View Terms & Conditions <FiArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
}
