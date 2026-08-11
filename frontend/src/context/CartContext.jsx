/* eslint-disable react-refresh/only-export-components */
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

  const generateCartItemId = (baseId, config = {}) => {
    let key = baseId;
    if (config.variantName) key += `|v:${config.variantName}`;
    if (config.addOns && config.addOns.length > 0) {
      key += `|a:${config.addOns.map(a => a.name).sort().join(',')}`;
    }
    if (config.spiceLevel) key += `|s:${config.spiceLevel}`;
    return key;
  };

  // Add food item (existing restaurants)
  const addToCart = (item, restId, restName, config = {}) => {
    let currentCartItems = cartItems;
    
    if (cartItems.length > 0 && (cartType !== 'food' || (restaurantId && restaurantId !== restId))) {
      if (!window.confirm("Your cart contains items from another vendor. Do you want to clear your cart and add this item?")) {
        return;
      }
      setRestaurantId(restId);
      setRestaurantName(restName);
      setStoreId(null);
      setStoreName('');
      setCartType('food');
      currentCartItems = [];
    } else if (cartItems.length === 0) {
      setRestaurantId(restId);
      setRestaurantName(restName);
      setCartType('food');
    }

    setCartItems(prev => {
      const actualPrev = currentCartItems.length === 0 ? [] : prev;
      const baseId = item._id || item.foodId;
      const cartItemId = generateCartItemId(baseId, config);
      const exists = actualPrev.find(i => (i.cartItemId === cartItemId || (!i.cartItemId && i.foodId === baseId)) && i.type === 'food');
      
      const itemPrice = config.computedPrice || item.discountedPrice || item.price;
      
      if (exists) return actualPrev.map(i => (i === exists) ? { ...i, quantity: i.quantity + 1 } : i);
      
      return [...actualPrev, { 
        ...item, 
        foodId: baseId, 
        cartItemId,
        type: 'food', 
        restaurantId: restId, 
        restaurantName: restName, 
        quantity: 1,
        price: itemPrice,
        basePrice: item.discountedPrice || item.price,
        variantName: config.variantName,
        addOns: config.addOns || [],
        spiceLevel: config.spiceLevel,
        specialInstructions: config.specialInstructions
      }];
    });
    toast.success(`${item.name} added to cart!`);
  };

  // Add product item (stores)
  const addProductToCart = (item, sId, sName, config = {}) => {
    let currentCartItems = cartItems;

    if (cartItems.length > 0 && (cartType !== 'product' || (storeId && storeId !== sId))) {
      if (!window.confirm("Your cart contains items from another vendor. Do you want to clear your cart and add this item?")) {
        return;
      }
      setStoreId(sId);
      setStoreName(sName);
      setRestaurantId(null);
      setRestaurantName('');
      setCartType('product');
      currentCartItems = [];
    } else if (cartItems.length === 0) {
      setStoreId(sId);
      setStoreName(sName);
      setCartType('product');
    }

    setCartItems(prev => {
      const actualPrev = currentCartItems.length === 0 ? [] : prev;
      const baseId = item._id || item.productId;
      const cartItemId = generateCartItemId(baseId, config);
      const exists = actualPrev.find(i => (i.cartItemId === cartItemId || (!i.cartItemId && i.productId === baseId)) && i.type === 'product');
      
      const itemPrice = config.computedPrice || item.discountedPrice || item.price;

      if (exists) return actualPrev.map(i => (i === exists) ? { ...i, quantity: i.quantity + 1 } : i);
      
      return [...actualPrev, { 
        ...item, 
        productId: baseId, 
        cartItemId,
        type: 'product', 
        storeId: sId, 
        storeName: sName, 
        quantity: 1,
        price: itemPrice,
        basePrice: item.discountedPrice || item.price,
        variantName: config.variantName
      }];
    });
    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (id) => {
    // id could be cartItemId, foodId, productId, or _id
    setCartItems(prev => prev.filter(i => i.cartItemId !== id && i.foodId !== id && i.productId !== id && i._id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) { removeFromCart(id); return; }
    setCartItems(prev => prev.map(i => (i.cartItemId === id || i.foodId === id || i.productId === id || i._id === id) ? { ...i, quantity } : i));
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
