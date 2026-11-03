const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Rate limiting: prevent bot spamming the AI assistant
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { success: false, message: 'Too many messages. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const SYSTEM_PROMPT = `You are the official Customer Support Assistant for JDkart, a premium food and grocery delivery app. 
You must act highly professional, warm, and welcoming. 

CRITICAL RULES FOR YOUR RESPONSES:
1. NEVER use markdown symbols like ** or *. Do not bold or italicize anything.
2. Structure your answers clearly using short paragraphs.
3. Use a friendly tone and include emojis strategically (e.g., 🛒, 🍕, 🚀, 😊) to make the chat engaging.
4. Keep answers concise but complete.
              
JDkart Knowledge Base:
- Services: We deliver hot food from local restaurants and fresh groceries from local stores.
- Delivery Time: Our average delivery time is lightning fast at 30-45 minutes.
- Delivery Fee: Delivery fee is usually ₹5 to ₹10 depending on order value.
- Order Tracking: Customers can track active orders in real-time in the 'Orders' section of their profile.
- Payment Options: We accept UPI, Credit/Debit cards, and Cash on Delivery (COD).
- Cancellations: Orders can only be cancelled before they are accepted by the restaurant or store.
- Refunds: Refunds for cancelled or problematic orders are processed within 3-5 business days.
- Support: For urgent issues or order problems, ask the customer to email support@jdkart.com.`;

router.post('/', chatLimiter, async (req, res) => {
  try {
    const { messages, message } = req.body;
    const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'JDkart Assistant is temporarily unavailable. Please email support@jdkart.com.',
      });
    }

    // Build conversation history
    let conversation = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (Array.isArray(messages) && messages.length > 0) {
      // Keep last 10 messages to limit token usage
      const recent = messages.slice(-10);
      for (const m of recent) {
        if (m.role && (m.content || m.text)) {
          conversation.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || m.text).slice(0, 500),
          });
        }
      }
    } else if (message) {
      conversation.push({ role: 'user', content: String(message).slice(0, 500) });
    } else {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Call Groq API securely from backend
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: conversation,
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();

    if (data.error) {
      console.error('Groq API Error:', data.error);
      return res.status(502).json({
        success: false,
        message: 'Failed to process AI response. Please try again.',
      });
    }

    const reply = data.choices?.[0]?.message?.content || 'How can I assist you with your JDkart order? 😊';
    res.json({ success: true, reply });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ success: false, message: 'Server error processing chat' });
  }
});

module.exports = router;
