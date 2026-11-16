import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiTag } from 'react-icons/fi';
import './CustomerTransactions.css';

export default function OffersPage() {
  const navigate = useNavigate();
  const { addToCart, addProductToCart } = useCart();
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/customer/offers')
      .then(res => {
        if (res.data.success) {
          setFoods(res.data.foods || []);
          setProducts(res.data.products || []);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

    const handleAdd = (item, type) => {
    if (type === 'food') {
      if (item.variants && item.variants.length > 0) {
        navigate(`/food/${item._id}`);
        return;
      }
      addToCart(
        { foodId: item._id, name: item.name, price: item.discountedPrice || item.price, image: item.image, discountedPrice: item.discountedPrice },
        item.restaurantId?._id || item.restaurantId,
        item.restaurantId?.name || 'Restaurant'
      );
    } else {
      if (item.variants && item.variants.length > 0) {
        navigate(`/product/${item._id}`);
        return;
      }
      addProductToCart(
        { productId: item._id, foodId: item._id, name: item.name, price: item.discountedPrice || item.price, image: item.image, discountedPrice: item.discountedPrice },
        item.storeId?._id || item.storeId,
        item.storeId?.name || 'Store'
      );
    }
    toast.success('Added to cart!');
  };

  const handleBuy = (item, type) => {
    handleAdd(item, type);
    navigate('/cart');
  };

  const handleCartClick = (item, type) => {
    handleAdd(item, type);
    navigate('/cart');
  };

  if (loading) return <div className="customer-transactions tx-loading"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div className="page-wrapper customer-transactions tx-offers tx-with-nav">
      <header className="tx-page-header">
        <div className="container tx-header-inner"><h1>Offers & Deals</h1></div>
      </header>
      <div className="container">
        <div className="tx-offer-banner">
          <span className="tx-icon-tile"><FiTag size={24} /></span>
          <div>
            <h2>A little more to love, for less</h2>
            <p>Great deals on your favourite meals and groceries.</p>
          </div>
        </div>

        {foods.length === 0 && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No offers available at the moment. Check back soon!</div>
        ) : (
          <div className="tx-offer-grid">
            {foods.map(item => (
              <div key={item._id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--bg-secondary)' }}>
                  <img src={item.image || 'https://via.placeholder.com/300'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="tx-offer-badge">
                    Save ₹{item.price - item.discountedPrice}
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>₹{item.discountedPrice}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{item.price}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, flex: 1 }}>{item.restaurantId?.name}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleCartClick(item, 'food')} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Cart</button>
                    <button onClick={() => handleBuy(item, 'food')} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Order</button>
                  </div>
                </div>
              </div>
            ))}
            {products.map(item => (
              <div key={item._id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--bg-secondary)' }}>
                  <img src={item.image || 'https://via.placeholder.com/300'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="tx-offer-badge">
                    Save ₹{item.price - item.discountedPrice}
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>₹{item.discountedPrice}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{item.price}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, flex: 1 }}>{item.storeId?.name}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleCartClick(item, 'product')} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,87,34,0.1)', border: '1px solid rgba(255,87,34,0.3)', borderRadius: 8, color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Cart</button>
                    <button onClick={() => handleBuy(item, 'product')} style={{ flex: 1, padding: '9px 0', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Order</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
