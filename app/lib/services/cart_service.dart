import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/product_model.dart';
import 'auth_service.dart';

class CartItem {
  final String id;
  final String cartItemKey;
  final String name;
  final num price;
  final num? basePrice;
  final String image;
  int quantity;
  final String restaurantId;
  final String restaurantName;

  /// 'food' for restaurant dishes, 'product' for supermarket items.
  final String type;
  final String unit;
  final String variantName;
  final List<Map<String, dynamic>> addOns;
  final String spiceLevel;
  final bool freeDelivery;
  final String specialInstructions;

  CartItem({
    required this.id,
    String? cartItemKey,
    required this.name,
    required this.price,
    this.basePrice,
    this.image = '',
    this.quantity = 1,
    required this.restaurantId,
    required this.restaurantName,
    this.type = 'food',
    this.unit = '',
    this.variantName = '',
    this.addOns = const [],
    this.spiceLevel = '',
    this.freeDelivery = false,
    this.specialInstructions = '',
  }) : cartItemKey = cartItemKey ??
            buildCartItemKey(
              id,
              type: type,
              variantName: variantName,
              addOns: addOns,
              spiceLevel: spiceLevel,
            );

  static String buildCartItemKey(
    String id, {
    String type = 'food',
    String variantName = '',
    List<Map<String, dynamic>> addOns = const [],
    String spiceLevel = '',
  }) {
    final buf = StringBuffer('$type|$id');
    if (variantName.isNotEmpty) buf.write('|v:$variantName');
    if (addOns.isNotEmpty) {
      final names = addOns
          .map((a) => (a['name'] ?? '').toString())
          .where((n) => n.isNotEmpty)
          .toList()
        ..sort();
      if (names.isNotEmpty) buf.write('|a:${names.join(",")}');
    }
    if (spiceLevel.isNotEmpty) buf.write('|s:$spiceLevel');
    return buf.toString();
  }

  bool get isProduct => type == 'product';

  String get customizationSummary {
    final parts = <String>[];
    if (variantName.isNotEmpty) {
      parts.add(variantName);
    } else if (unit.isNotEmpty) {
      parts.add(unit);
    }
    if (spiceLevel.isNotEmpty) parts.add('Spice: $spiceLevel');
    if (addOns.isNotEmpty) {
      final names = addOns
          .map((a) => (a['name'] ?? '').toString())
          .where((n) => n.isNotEmpty)
          .join(', ');
      if (names.isNotEmpty) parts.add('+ $names');
    }
    return parts.join(' • ');
  }

  Map<String, dynamic> toBackendPayload() => {
        if (isProduct) 'productId': id else 'foodId': id,
        'type': type,
        if (isProduct) 'storeId': restaurantId else 'restaurantId': restaurantId,
        'name': name,
        'price': price,
        'basePrice': basePrice ?? price,
        'quantity': quantity,
        'image': image,
        if (unit.isNotEmpty) 'unit': unit,
        if (variantName.isNotEmpty) 'variantName': variantName,
        if (addOns.isNotEmpty) 'addOns': addOns,
        if (spiceLevel.isNotEmpty) 'spiceLevel': spiceLevel,
        if (freeDelivery) 'freeDelivery': true,
        if (specialInstructions.isNotEmpty)
          'specialInstructions': specialInstructions,
      };

  Map<String, dynamic> toJson() => {
        'id': id,
        'cartItemKey': cartItemKey,
        'name': name,
        'price': price,
        if (basePrice != null) 'basePrice': basePrice,
        'image': image,
        'quantity': quantity,
        'restaurantId': restaurantId,
        'restaurantName': restaurantName,
        'type': type,
        if (unit.isNotEmpty) 'unit': unit,
        if (variantName.isNotEmpty) 'variantName': variantName,
        if (addOns.isNotEmpty) 'addOns': addOns,
        if (spiceLevel.isNotEmpty) 'spiceLevel': spiceLevel,
        if (freeDelivery) 'freeDelivery': freeDelivery,
        if (specialInstructions.isNotEmpty)
          'specialInstructions': specialInstructions,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) {
    final parsedAddOns = (json['addOns'] is List)
        ? (json['addOns'] as List)
            .whereType<Map>()
            .map((a) => Map<String, dynamic>.from(a))
            .toList()
        : const <Map<String, dynamic>>[];
    return CartItem(
      id: (json['id'] ?? '').toString(),
      cartItemKey: json['cartItemKey']?.toString(),
      name: (json['name'] ?? '').toString(),
      price: json['price'] is num ? json['price'] as num : 0,
      basePrice: json['basePrice'] is num ? json['basePrice'] as num : null,
      image: (json['image'] ?? '').toString(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      restaurantId: (json['restaurantId'] ?? '').toString(),
      restaurantName: (json['restaurantName'] ?? '').toString(),
      type: (json['type'] ?? 'food').toString(),
      unit: (json['unit'] ?? '').toString(),
      variantName: (json['variantName'] ?? '').toString(),
      addOns: parsedAddOns,
      spiceLevel: (json['spiceLevel'] ?? '').toString(),
      freeDelivery: json['freeDelivery'] == true,
      specialInstructions: (json['specialInstructions'] ?? '').toString(),
    );
  }
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
        final decoded = jsonDecode(data);
        if (decoded is! List) {
          // Corrupt/older schema — clear rather than crash.
          await prefs.remove('foodhub_cart');
          return;
        }
        _items.clear();
        _items.addAll(decoded.map((i) => CartItem.fromJson(i)));
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

    final payloadItems = _items.map((i) => i.toBackendPayload()).toList();

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

  int quantityFor(String itemId, {String type = 'food'}) => _items
      .where((i) => i.id == itemId && i.type == type)
      .fold(0, (sum, i) => sum + i.quantity);

  bool addItem(
    FoodItemModel food, {
    required String restaurantId,
    required String restaurantName,
    String type = 'food',
    int quantity = 1,
    String variantName = '',
    List<ItemAddOn> addOns = const [],
    String spiceLevel = '',
    num? computedPrice,
    num? basePrice,
    String specialInstructions = '',
  }) {
    if (!food.isAvailable || food.isOutOfStock || restaurantId.isEmpty) {
      return false;
    }

    if (_items.isNotEmpty && _currentRestaurantId != null && _currentRestaurantId != restaurantId) {
      _items.clear();
    }

    _currentRestaurantId = restaurantId;
    _currentRestaurantName = restaurantName;

    final addOnMaps = addOns.map((a) => a.toJson()).toList();
    final key = CartItem.buildCartItemKey(
      food.id,
      type: type,
      variantName: variantName,
      addOns: addOnMaps,
      spiceLevel: spiceLevel,
    );
    final effectiveBase = basePrice ?? food.displayPrice;
    final unitPrice = computedPrice ??
        (effectiveBase + addOns.fold<num>(0, (sum, a) => sum + a.price));

    final existingIndex = _items.indexWhere((i) => i.cartItemKey == key);
    if (existingIndex >= 0) {
      _items[existingIndex].quantity += quantity;
    } else {
      _items.add(CartItem(
        id: food.id,
        cartItemKey: key,
        name: food.name,
        price: unitPrice,
        basePrice: effectiveBase,
        image: food.image,
        quantity: quantity,
        restaurantId: restaurantId,
        restaurantName: restaurantName,
        type: type,
        unit: food.unit,
        variantName: variantName.isNotEmpty ? variantName : (food.isProduct ? food.unit : ''),
        addOns: addOnMaps,
        spiceLevel: spiceLevel,
        freeDelivery: food.freeDelivery,
        specialInstructions: specialInstructions,
      ));
    }
    _saveCart();
    notifyListeners();
    refreshCharges();
    return true;
  }

  void updateQuantity(String idOrKey, int quantity, {String type = 'food'}) {
    var index = _items.indexWhere((i) => i.cartItemKey == idOrKey);
    if (index < 0) {
      index = _items.lastIndexWhere((i) => i.id == idOrKey && i.type == type);
    }
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
