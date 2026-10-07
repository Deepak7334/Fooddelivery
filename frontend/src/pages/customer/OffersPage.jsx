import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

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
    if (!user) { navigate('/login'); return; }
    handleAdd(item, type);
    navigate('/checkout');
  };

  const handleCartClick = (item, type) => {
    handleAdd(item, type);
    navigate('/cart');
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ background: 'linear-gradient(135deg, rgba(255,87,34,0.1), rgba(255,193,7,0.1))', padding: '40px 20px', borderRadius: 24, textAlign: 'center', marginBottom: 40, border: '1px solid rgba(255,87,34,0.2)' }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, marginBottom: 12, color: 'var(--text-primary)' }}>
             Festive <span style={{ color: 'var(--primary)' }}>Mega Offers!</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Grab the best deals on your favorite meals and groceries before they're gone.</p>
        </div>

        {foods.length === 0 && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No offers available at the moment. Check back soon!</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {foods.map(item => (
              <div key={item._id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--bg-secondary)' }}>
                  <img src={item.image || 'https://via.placeholder.com/300'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 800, boxShadow: '0 4px 10px rgba(255,87,34,0.4)' }}>
                    Save {item.price - item.discountedPrice}
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>?{item.discountedPrice}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>?{item.price}</span>
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
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 800, boxShadow: '0 4px 10px rgba(255,87,34,0.4)' }}>
                    Save {item.price - item.discountedPrice}
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>?{item.discountedPrice}</span>
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
