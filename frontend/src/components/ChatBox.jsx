import { FaWhatsapp } from 'react-icons/fa';

export default function ChatBox() {
  const whatsappNumber = '917762971182';
  const message = encodeURIComponent('Hi JDkart Support, I need help.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <div className="customer-chat-widget" style={{ position: 'fixed', zIndex: 9999 }}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="customer-whatsapp-btn"
        aria-label="Chat on WhatsApp"
        title="Chat with us on WhatsApp"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#25D366',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(37, 211, 102, 0.45)',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <FaWhatsapp size={32} />
      </a>
    </div>
  );
}
