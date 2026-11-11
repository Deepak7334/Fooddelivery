import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/product_model.dart';
import 'auth_service.dart';

class CartItem {
  final String id;
  final String name;
  final num price;
  final String image;
  int quantity;
  final String restaurantId;
  final String restaurantName;

  /// 'food' for restaurant dishes, 'product' for supermarket items.
  final String type;

  CartItem({
    required this.id,
    required this.name,
    required this.price,
    this.image = '',
    this.quantity = 1,
    required this.restaurantId,
    required this.restaurantName,
    this.type = 'food',
  });

  bool get isProduct => type == 'product';

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'price': price,
    'image': image,
    'quantity': quantity,
    'restaurantId': restaurantId,
    'restaurantName': restaurantName,
    'type': type,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    price: json['price'] ?? 0,
    image: json['image'] ?? '',
    quantity: json['quantity'] ?? 1,
    restaurantId: json['restaurantId'] ?? '',
    restaurantName: json['restaurantName'] ?? '',
    type: json['type'] ?? 'food',
  );
}

class CartService extends ChangeNotifier {
  CartService._();
  static final CartService instance = CartService._();

  final List<CartItem> _items = [];
  String? _currentRestaurantId;
  String? _currentRestaurantName;

  num _deliveryFee = 0;
  num _originalDeliveryFee = 0;
  bool _isFirstOrderFree = false;
  bool _chargesLoaded = false;

  List<CartItem> get items => List.unmodifiable(_items);
  int get totalItems => _items.fold(0, (sum, i) => sum + i.quantity);
  num get totalPrice => _items.fold(0, (sum, i) => sum + (i.price * i.quantity));
  String? get restaurantId => _currentRestaurantId;
  String? get restaurantName => _currentRestaurantName;
  String get itemType => _items.isNotEmpty ? _items.first.type : 'food';

  /// Delivery fee returned by the backend for the current cart.
  num get deliveryFee => _deliveryFee;
  num get originalDeliveryFee => _originalDeliveryFee;
  bool get isFirstOrderFree => _isFirstOrderFree;
  bool get chargesLoaded => _chargesLoaded;
  num get grandTotal => _items.isEmpty ? 0 : totalPrice + _deliveryFee;

  Future<void> loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getString('foodhub_cart');
      if (data != null) {
        final list = jsonDecode(data) as List;
        _items.clear();
        _items.addAll(list.map((i) => CartItem.fromJson(i)));
        if (_items.isEmpty) {
          _currentRestaurantId = null;
          _currentRestaurantName = null;
        } else {
          _currentRestaurantId = prefs.getString('foodhub_cart_restaurant');
          _currentRestaurantName =
              prefs.getString('foodhub_cart_restaurant_name');
        }
        notifyListeners();
        if (_items.isNotEmpty) refreshCharges();
      }
    } catch (_) {}
  }

  /// Ask the backend for the real delivery fee / first-order offer.
  Future<void> refreshCharges() async {
    if (_items.isEmpty) {
      _deliveryFee = 0;
      _originalDeliveryFee = 0;
      _isFirstOrderFree = false;
      _chargesLoaded = true;
      notifyListeners();
      return;
    }

    final payloadItems = _items.map((i) => {
      if (i.isProduct) 'productId': i.id else 'foodId': i.id,
      'type': i.type,
      if (i.isProduct) 'storeId': i.restaurantId else 'restaurantId': i.restaurantId,
      'name': i.name,
      'price': i.price,
      'quantity': i.quantity,
      'image': i.image,
    }).toList();

    final restaurantIds = _items
        .where((i) => !i.isProduct && i.restaurantId.isNotEmpty)
        .map((i) => i.restaurantId)
        .toSet()
        .toList();
    final storeIds = _items
        .where((i) => i.isProduct && i.restaurantId.isNotEmpty)
        .map((i) => i.restaurantId)
        .toSet()
        .toList();

    try {
      final data = await ApiClient.instance.post(
        '${ApiConstants.baseUrl}/customer/checkout-info',
        {
          'items': payloadItems,
          'restaurantIds': restaurantIds,
          'storeIds': storeIds,
          'totalAmount': totalPrice,
        },
        auth: AuthService.instance.isAuthenticated,
      );
      if (data is Map && data['success'] == true) {
        _deliveryFee = (data['deliveryFees'] as num?) ?? 0;
        _originalDeliveryFee = (data['originalDeliveryFee'] as num?) ?? _deliveryFee;
        _isFirstOrderFree = data['isFirstOrder'] == true;
        _chargesLoaded = true;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Could not load checkout charges: $e');
    }
  }

  bool willSwitchVendor(String vendorId) =>
      _items.isNotEmpty && _currentRestaurantId != null && _currentRestaurantId != vendorId;

  Future<void> _saveCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('foodhub_cart', jsonEncode(_items.map((i) => i.toJson()).toList()));
      if (_currentRestaurantId != null && _items.isNotEmpty) {
        await prefs.setString('foodhub_cart_restaurant', _currentRestaurantId!);
      } else {
        await prefs.remove('foodhub_cart_restaurant');
      }
      if (_currentRestaurantName != null && _items.isNotEmpty) {
        await prefs.setString('foodhub_cart_restaurant_name', _currentRestaurantName!);
      } else {
        await prefs.remove('foodhub_cart_restaurant_name');
      }
    } catch (_) {}
  }

  void addItem(
    FoodItemModel food, {
    required String restaurantId,
    required String restaurantName,
    String type = 'food',
  }) {
    if (_items.isNotEmpty && _currentRestaurantId != null && _currentRestaurantId != restaurantId) {
      _items.clear();
    }

    _currentRestaurantId = restaurantId;
    _currentRestaurantName = restaurantName;

    final existingIndex = _items.indexWhere((i) => i.id == food.id && i.type == type);
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
        type: type,
      ));
    }
    _saveCart();
    notifyListeners();
    refreshCharges();
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
      refreshCharges();
    }
  }

  void clearCart() {
    _items.clear();
    _currentRestaurantId = null;
    _currentRestaurantName = null;
    _deliveryFee = 0;
    _originalDeliveryFee = 0;
    _isFirstOrderFree = false;
    _chargesLoaded = false;
    _saveCart();
    notifyListeners();
  }
}
