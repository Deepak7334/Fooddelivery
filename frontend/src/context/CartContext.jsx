import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('foodhub_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [restaurantId, setRestaurantId] = useState(() => {
    return localStorage.getItem('foodhub_cart_restaurant') || null;
  });
  const [restaurantName, setRestaurantName] = useState(() => {
    return localStorage.getItem('foodhub_cart_restaurant_name') || '';
  });

  useEffect(() => {
    localStorage.setItem('foodhub_cart', JSON.stringify(cartItems));
    if (restaurantId) localStorage.setItem('foodhub_cart_restaurant', restaurantId);
    if (restaurantName) localStorage.setItem('foodhub_cart_restaurant_name', restaurantName);
  }, [cartItems, restaurantId, restaurantName]);

  const addToCart = (item, restId, restName) => {
    if (restaurantId && restaurantId !== restId) {
      const confirm = window.confirm(
        'Your cart has items from another restaurant. Clear cart and add this item?'
      );
      if (!confirm) return;
      setCartItems([]);
    }
    setRestaurantId(restId);
    setRestaurantName(restName);
    setCartItems(prev => {
      const exists = prev.find(i => i.foodId === item.foodId);
      if (exists) {
        return prev.map(i => i.foodId === item.foodId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (foodId) => {
    setCartItems(prev => {
      const updated = prev.filter(i => i.foodId !== foodId);
      if (updated.length === 0) clearCart();
      return updated;
    });
  };

  const updateQuantity = (foodId, quantity) => {
    if (quantity <= 0) { removeFromCart(foodId); return; }
    setCartItems(prev => prev.map(i => i.foodId === foodId ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurantId(null);
    setRestaurantName('');
    localStorage.removeItem('foodhub_cart');
    localStorage.removeItem('foodhub_cart_restaurant');
    localStorage.removeItem('foodhub_cart_restaurant_name');
  };

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, restaurantId, restaurantName,
      addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
