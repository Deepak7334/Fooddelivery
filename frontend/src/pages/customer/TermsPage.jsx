import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiShield, FiAlertCircle, FiCheckCircle, FiMail, FiArrowRight } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: (
        <>
          <p>
            Welcome to <strong>JDkart</strong>. By downloading, accessing, browsing, or utilizing the JDkart website or mobile web application ("Platform"), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms & Conditions ("Terms").
          </p>
          <p>
            If you do not agree with any part of these Terms, you must refrain from accessing or utilizing our services. We reserve the right to periodically modify or update these Terms, and your continued usage constitutes acceptance of any revised terms.
          </p>
        </>
      )
    },
    {
      id: 'eligibility',
      title: '2. User Eligibility & Account Registration',
      content: (
        <>
          <p>
            To register an account or place an order on JDkart, you must be at least 18 years of age or possess the guidance and consent of a parent or legal guardian.
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>You agree to provide accurate, true, and complete information, including your full name, active mobile phone number, delivery address, and email address.</li>
            <li>You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that take place under your account.</li>
            <li>JDkart reserves the right to suspend or terminate accounts that provide fraudulent information or engage in abusive activities.</li>
          </ul>
        </>
      )
    },
    {
      id: 'orders-pricing',
      title: '3. Orders, Pricing & Taxes',
      content: (
        <>
          <p>
            JDkart operates as a technology facilitator connecting customers with independent local restaurants, grocery stores, and freelance delivery partners.
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Menu & Product Prices:</strong> All prices listed on the platform are determined directly by the respective restaurant or merchant partners. While we strive for accuracy, prices and item availability may change dynamically without prior notice.</li>
            <li><strong>Delivery Fees & Charges:</strong> Applicable delivery fees, packaging costs, and government taxes (such as GST where mandated) are explicitly calculated and transparently displayed on the Checkout page before you place an order.</li>
            <li><strong>Order Confirmation:</strong> An order is deemed accepted once the respective merchant confirms availability. In rare scenarios where an item becomes out of stock, you will be notified promptly.</li>
          </ul>
        </>
      )
    },
    {
      id: 'payments',
      title: '4. Payment Terms (COD & UPI)',
      content: (
        <>
          <p>
            We strive to provide flexible, convenient payment options for all our customers:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Cash on Delivery (COD):</strong> Customers electing COD must provide the exact or reasonable cash amount to the delivery partner upon arrival at the specified delivery address.</li>
            <li><strong>Digital & UPI Payments:</strong> You can pay digitally via UPI apps (Google Pay, PhonePe, Paytm, BHIM, etc.). Online transactions are encrypted and processed through verified payment channels. JDkart never stores your UPI PIN or banking passwords.</li>
          </ul>
        </>
      )
    },
    {
      id: 'cancellation-refunds',
      title: '5. Order Cancellation & Refund Policy',
      content: (
        <>
          <p>
            We value your flexibility while respecting the time and resources of local food preparers:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Customer Cancellation:</strong> You may cancel an order directly from your <em>Order Tracking</em> or <em>Order History</em> page as long as the order is in <code>Pending</code> or <code>Accepted</code> status before the restaurant/store initiates food preparation or dispatch.</li>
            <li><strong>Non-Cancellable Orders:</strong> Once food preparation has commenced or the delivery partner has been dispatched, orders cannot be cancelled to avoid food wastage and merchant loss.</li>
            <li><strong>Refunds:</strong> In the event an online-paid order is legitimately cancelled prior to preparation, or if a merchant is unable to fulfill an order, a 100% refund will be initiated to your original payment method within 3 to 7 business days.</li>
            <li><strong>Incorrect or Damaged Items:</strong> If you receive an incomplete, damaged, or incorrect order, please contact our support team via WhatsApp or email within 1 hour of delivery with photo proof for prompt review and resolution.</li>
          </ul>
        </>
      )
    },
    {
      id: 'delivery',
      title: '6. Deliveries & Customer Obligations',
      content: (
        <>
          <p>
            Our delivery partners strive to reach your doorstep as swiftly as possible:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Estimated delivery times are indicative and may vary depending on local traffic, severe weather conditions, distance, or peak kitchen hours.</li>
            <li>Customers must ensure that their registered phone number is reachable and that an authorized person is available at the delivery location.</li>
            <li>If delivery requires OTP verification, the customer must inspect that the package is sealed and share the delivery OTP with the partner to complete delivery.</li>
          </ul>
        </>
      )
    },
    {
      id: 'merchant-disclaimer',
      title: '7. Food Quality & Merchant Responsibility',
      content: (
        <>
          <p>
            JDkart is a delivery and technology platform and does not cook, package, or manufacture the food or goods sold by third-party restaurants and stores.
          </p>
          <p>
            The respective merchant partner is solely responsible for food hygiene, freshness, ingredients, packaging integrity, and adherence to relevant FSSAI food safety regulations. Any health complaints or allergic reactions resulting from merchant preparation must be directed toward the merchant, though JDkart will assist in mediating reasonable resolutions.
          </p>
        </>
      )
    },
    {
      id: 'conduct',
      title: '8. Prohibited Conduct',
      content: (
        <>
          <p>Users agree NOT to:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Place fraudulent or fake orders, or repeatedly refuse delivery of Cash on Delivery orders without valid cause.</li>
            <li>Engage in abusive, disrespectful, or threatening language/behavior toward delivery partners, merchants, or customer support staff.</li>
            <li>Attempt to decompile, reverse engineer, or exploit vulnerabilities on the JDkart application or backend infrastructure.</li>
          </ul>
        </>
      )
    },
    {
      id: 'liability',
      title: '9. Limitation of Liability & Governing Law',
      content: (
        <>
          <p>
            To the maximum extent permitted under applicable law, JDkart shall not be liable for indirect, incidental, or consequential damages arising out of the use or inability to use the platform.
          </p>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India, including the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in India.
          </p>
        </>
      )
    },
    {
      id: 'contact',
      title: '10. Contact & Grievance Redressal',
      content: (
        <>
          <p>
            If you have questions, feedback, or grievance regarding these Terms, please reach out to our dedicated support team:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Email:</strong> <a href="mailto:supportjdkart@gmail.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>supportjdkart@gmail.com</a></li>
            <li><strong>WhatsApp Support:</strong> <a href="https://wa.me/917762971182" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>+91 7762971182</a></li>
            <li><strong>Instagram:</strong> <a href="https://instagram.com/jd__kart" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>@jd__kart</a></li>
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
            <span style={{
              padding: '8px clamp(12px, 3.5vw, 20px)',
              borderRadius: 8,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 'clamp(12px, 3.2vw, 14px)',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}>
              Terms & Conditions
            </span>
            <Link to="/privacy" style={{
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
              Privacy Policy
            </Link>
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
            background: 'rgba(255, 87, 34, 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <FiFileText size={26} />
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4.5vw, 36px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            Terms & Conditions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(12px, 2.5vw, 14px)', margin: 0 }}>
            Last Updated: October 2026 • Please read carefully before using JDkart services
          </p>
        </div>

        {/* Notice alert */}
        <div style={{
          background: 'rgba(255, 87, 34, 0.08)',
          border: '1px solid rgba(255, 87, 34, 0.25)',
          borderRadius: 14,
          padding: 'clamp(12px, 3vw, 16px) clamp(14px, 3.5vw, 20px)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: 30
        }}>
          <FiAlertCircle size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Important Notice:</strong> By placing an order via JDkart, you confirm that you understand and agree to the payment, delivery, and cancellation rules outlined below.
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
                gap: 8
              }}>
                {sec.title}
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

        {/* Quick Link Card to Privacy */}
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
              Looking for our Privacy Policy?
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Learn how we safeguard your personal details, location, and data.
            </div>
          </div>
          <Link 
            to="/privacy" 
            className="btn btn-primary"
            style={{ fontWeight: 700, padding: '10px 20px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            View Privacy Policy <FiArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
}
