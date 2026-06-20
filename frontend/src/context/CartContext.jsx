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
  // store support
  const [storeId, setStoreId] = useState(() => localStorage.getItem('foodhub_cart_store') || null);
  const [storeName, setStoreName] = useState(() => localStorage.getItem('foodhub_cart_store_name') || '');
  const [cartType, setCartType] = useState(() => localStorage.getItem('foodhub_cart_type') || 'food'); // 'food' | 'product'

  useEffect(() => {
    localStorage.setItem('foodhub_cart', JSON.stringify(cartItems));
    if (restaurantId) localStorage.setItem('foodhub_cart_restaurant', restaurantId);
    if (restaurantName) localStorage.setItem('foodhub_cart_restaurant_name', restaurantName);
    if (storeId) localStorage.setItem('foodhub_cart_store', storeId);
    if (storeName) localStorage.setItem('foodhub_cart_store_name', storeName);
    localStorage.setItem('foodhub_cart_type', cartType);
  }, [cartItems, restaurantId, restaurantName, storeId, storeName, cartType]);

  // Add food item (existing restaurants)
  const addToCart = (item, restId, restName) => {
    setCartItems(prev => {
      const key = item._id || item.foodId;
      const exists = prev.find(i => (i._id === key || i.foodId === key) && i.type === 'food');
      if (exists) return prev.map(i => ((i._id === key || i.foodId === key) && i.type === 'food') ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, foodId: key, type: 'food', restaurantId: restId, restaurantName: restName, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart!`);
  };

  // Add product item (stores)
  const addProductToCart = (item, sId, sName) => {
    setCartItems(prev => {
      const key = item._id || item.productId;
      const exists = prev.find(i => (i._id === key || i.productId === key) && i.type === 'product');
      if (exists) return prev.map(i => ((i._id === key || i.productId === key) && i.type === 'product') ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, productId: key, type: 'product', storeId: sId, storeName: sName, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(i => (i.foodId !== id && i.productId !== id && i._id !== id)));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) { removeFromCart(id); return; }
    setCartItems(prev => prev.map(i => (i.foodId === id || i.productId === id || i._id === id) ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurantId(null);
    setRestaurantName('');
    setStoreId(null);
    setStoreName('');
    setCartType('food');
    localStorage.removeItem('foodhub_cart');
    localStorage.removeItem('foodhub_cart_restaurant');
    localStorage.removeItem('foodhub_cart_restaurant_name');
    localStorage.removeItem('foodhub_cart_store');
    localStorage.removeItem('foodhub_cart_store_name');
    localStorage.removeItem('foodhub_cart_type');
  };

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, restaurantId, restaurantName, storeId, storeName, cartType,
      addToCart, addProductToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
