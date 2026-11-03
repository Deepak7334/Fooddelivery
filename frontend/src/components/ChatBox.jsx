import { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';
import api from '../lib/api';

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I am the JDkart AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/chat', {
        messages: [...messages, userMessage],
      });

      const botReply = res.data?.reply || 'Sorry, I could not understand that. How can I assist you?';
      setMessages(prev => [...prev, { role: 'assistant', text: botReply }]);
    } catch (error) {
      const errText = error.response?.data?.message || 'Unable to connect to assistant. Please try again later.';
      setMessages(prev => [...prev, { role: 'assistant', text: errText }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9999 }}>
      {isOpen ? (
        <div style={{ width: 340, height: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          <div style={{ padding: '16px', background: 'var(--primary)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <FiMessageSquare /> JDkart Assistant
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <FiX size={22} />
            </button>
          </div>
          
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-card2)', color: msg.role === 'user' ? '#fff' : 'var(--text-primary)', padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: msg.role === 'user' ? 2 : 12, borderBottomLeftRadius: msg.role === 'assistant' ? 2 : 12, maxWidth: '85%', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card2)', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: 12, borderBottomLeftRadius: 2, fontSize: 14 }}>
                Typing...
              </div>
            )}
            
            {/* Suggestion Chips */}
            {messages.length === 1 && !isLoading && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
                {['Where is my order?', 'How to cancel?', 'What are the delivery charges?', 'Payment options?'].map(suggestion => (
                  <button 
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      setTimeout(() => {
                        const sendBtn = document.getElementById('chat-send-btn');
                        if (sendBtn) sendBtn.click();
                      }, 50);
                    }}
                    style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..." 
              style={{ flex: 1, padding: '10px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button id="chat-send-btn" onClick={handleSend} disabled={isLoading} style={{ background: 'var(--primary)', color: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <FiSend />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(255,87,34,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}>
          <FiMessageSquare size={28} />
        </button>
      )}
    </div>
  );
}
