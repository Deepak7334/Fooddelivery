import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function ReviewOrderModal({ order, onClose, onSuccess }) {
  const [vendorRating, setVendorRating] = useState(5);
  const [vendorReview, setVendorReview] = useState('');
  
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [deliveryReview, setDeliveryReview] = useState('');
  
  const [itemRatings, setItemRatings] = useState(
    (order?.items || []).map(i => ({
      itemId: i.foodId || i.productId,
      itemType: i.foodId ? 'food' : 'product',
      name: i.name,
      rating: 5
    }))
  );
  
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const vendorName = order?.restaurantName || order?.storeName || 'the Restaurant/Store';

  const updateItemRating = (index, rating) => {
    const newRatings = [...itemRatings];
    newRatings[index].rating = rating;
    setItemRatings(newRatings);
  };

  const submitReview = async () => {
    setSubmitting(true);
    try {
      const payload = {
        vendorRating,
        vendorReview,
        deliveryRating,
        deliveryReview,
        itemRatings: itemRatings.map(i => ({ itemId: i.itemId, itemType: i.itemType, rating: i.rating }))
      };
      const res = await api.post(`/customer/orders/${order._id}/rate`, payload);
      toast.success(res.data.message || 'Thanks for your feedback!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 28, padding: 0,
            color: star <= value ? '#FF9800' : '#E0E0E0',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal-content" style={{ maxWidth: 500, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, textAlign: 'center' }}>Rate Your Order</h3>
        
        {step === 1 && (
          <div className="animation-fade-in">
            <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}>1. How was the food?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Rate the items you ordered.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {itemRatings.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card2)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <StarRating value={item.rating} onChange={val => updateItemRating(idx, val)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animation-fade-in">
            <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}>2. How was {vendorName}?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Did they prepare your order well and on time?</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <StarRating value={vendorRating} onChange={setVendorRating} />
            </div>

            <textarea
              placeholder={`Leave a review for ${vendorName} (optional)...`}
              value={vendorReview}
              onChange={e => setVendorReview(e.target.value)}
              className="input-field"
              style={{ minHeight: 100, resize: 'vertical', marginBottom: 24, width: '100%' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animation-fade-in">
            <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}>3. How was the delivery?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Rate your experience with the delivery partner.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <StarRating value={deliveryRating} onChange={setDeliveryRating} />
            </div>

            <textarea
              placeholder="Leave a tip or review for the agent (optional)..."
              value={deliveryReview}
              onChange={e => setDeliveryReview(e.target.value)}
              className="input-field"
              style={{ minHeight: 100, resize: 'vertical', marginBottom: 24, width: '100%' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={submitReview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review ✅'}
              </button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
