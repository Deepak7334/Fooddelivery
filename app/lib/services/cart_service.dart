import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product_model.dart';

class CartItem {
  final String id;
  final String name;
  final num price;
  final String image;
  int quantity;
  final String restaurantId;
  final String restaurantName;

  CartItem({
    required this.id,
    required this.name,
    required this.price,
    this.image = '',
    this.quantity = 1,
    required this.restaurantId,
    required this.restaurantName,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'price': price,
    'image': image,
    'quantity': quantity,
    'restaurantId': restaurantId,
    'restaurantName': restaurantName,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    price: json['price'] ?? 0,
    image: json['image'] ?? '',
    quantity: json['quantity'] ?? 1,
    restaurantId: json['restaurantId'] ?? '',
    restaurantName: json['restaurantName'] ?? '',
  );
}

class CartService extends ChangeNotifier {
  CartService._();
  static final CartService instance = CartService._();

  final List<CartItem> _items = [];
  String? _currentRestaurantId;
  String? _currentRestaurantName;

  List<CartItem> get items => List.unmodifiable(_items);
  int get totalItems => _items.fold(0, (sum, i) => sum + i.quantity);
  num get totalPrice => _items.fold(0, (sum, i) => sum + (i.price * i.quantity));
  String? get restaurantId => _currentRestaurantId;
  String? get restaurantName => _currentRestaurantName;

  Future<void> loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getString('foodhub_cart');
      if (data != null) {
        final list = jsonDecode(data) as List;
        _items.clear();
        _items.addAll(list.map((i) => CartItem.fromJson(i)));
        _currentRestaurantId = prefs.getString('foodhub_cart_restaurant');
        _currentRestaurantName = prefs.getString('foodhub_cart_restaurant_name');
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _saveCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('foodhub_cart', jsonEncode(_items.map((i) => i.toJson()).toList()));
      if (_currentRestaurantId != null) {
        await prefs.setString('foodhub_cart_restaurant', _currentRestaurantId!);
      }
      if (_currentRestaurantName != null) {
        await prefs.setString('foodhub_cart_restaurant_name', _currentRestaurantName!);
      }
    } catch (_) {}
  }

  void addItem(FoodItemModel food, {required String restaurantId, required String restaurantName}) {
    if (_items.isNotEmpty && _currentRestaurantId != null && _currentRestaurantId != restaurantId) {
      _items.clear();
    }

    _currentRestaurantId = restaurantId;
    _currentRestaurantName = restaurantName;

    final existingIndex = _items.indexWhere((i) => i.id == food.id);
    if (existingIndex >= 0) {
      _items[existingIndex].quantity++;
    } else {
      _items.add(CartItem(
        id: food.id,
        name: food.name,
        price: food.discountedPrice ?? food.price,
        image: food.image,
        quantity: 1,
        restaurantId: restaurantId,
        restaurantName: restaurantName,
      ));
    }
    _saveCart();
    notifyListeners();
  }

  void updateQuantity(String id, int quantity) {
    final index = _items.indexWhere((i) => i.id == id);
    if (index >= 0) {
      if (quantity <= 0) {
        _items.removeAt(index);
      } else {
        _items[index].quantity = quantity;
      }
      if (_items.isEmpty) {
        _currentRestaurantId = null;
        _currentRestaurantName = null;
      }
      _saveCart();
      notifyListeners();
    }
  }

  void clearCart() {
    _items.clear();
    _currentRestaurantId = null;
    _currentRestaurantName = null;
    _saveCart();
    notifyListeners();
  }
}
