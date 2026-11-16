import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';
import '../models/category_model.dart';

class StoreService {
  StoreService._();
  static final StoreService instance = StoreService._();

  /// Fetch store categories / types from /api/store/types.
  /// Throws [ApiException] on failure so the UI can show a retry state.
  Future<List<CategoryModel>> getStoreTypes() async {
    final data = await ApiClient.instance.get(ApiConstants.storeTypes, cache: true);
    if (data is Map && data['types'] is List) {
      return (data['types'] as List).map((t) {
        final map = Map<String, dynamic>.from(t as Map);
        return CategoryModel(
          id: map['key'] ?? '',
          name: map['label'] ?? '',
          icon: map['icon'] ?? '🛒',
        );
      }).toList();
    }
    return [];
  }

  /// Fetch active stores/supermarkets from /api/store/stores.
  /// Throws [ApiException] on failure.
  Future<List<RestaurantModel>> getStores({double? lat, double? lng}) async {
    String url = ApiConstants.stores;
    if (lat != null && lng != null) {
      url += '?lat=$lat&lng=$lng';
    }
    final data = await ApiClient.instance.get(url, cache: true);
    if (data is Map && data['stores'] is List) {
      return (data['stores'] as List).map((s) {
        final map = Map<String, dynamic>.from(s as Map);
        return RestaurantModel(
          id: map['_id'] ?? map['id'] ?? '',
          name: map['name'] ?? '',
          description: map['description'] ?? '',
          address: map['address'] ?? '',
          city: map['city'] ?? '',
          image: map['image'] ?? '',
          rating: (map['rating'] is num) ? (map['rating'] as num).toDouble() : 4.5,
          deliveryTime: map['deliveryTime'] ?? '20-30 min',
          deliveryFee: (map['deliveryFee'] is num) ? map['deliveryFee'] : 15,
          minOrder: (map['minOrder'] is num) ? map['minOrder'] : 99,
          isOpen: map['isOpen'] ?? true,
          isActive: map['isActive'] ?? true,
          cuisine: [(map['storeType'] ?? 'Grocery').toString().toUpperCase()],
        );
      }).toList();
    }
    return [];
  }

  /// Fetch grocery products from /api/store/products.
  /// Throws [ApiException] on failure.
  Future<List<FoodItemModel>> getProducts({String? storeId, String? category}) async {
    String url = ApiConstants.storeProducts;
    final params = <String>[];
    if (storeId != null && storeId.isNotEmpty) params.add('storeId=$storeId');
    if (category != null && category.isNotEmpty) params.add('category=$category');
    if (params.isNotEmpty) url += '?${params.join('&')}';

    final data = await ApiClient.instance.get(url, cache: true);
    if (data is Map && data['products'] is List) {
      return (data['products'] as List).map((p) {
        final map = Map<String, dynamic>.from(p as Map);
        String sId = '';
        String sName = 'JDKart Supermarket';
        if (map['storeId'] is Map) {
          sId = map['storeId']['_id'] ?? '';
          sName = map['storeId']['name'] ?? 'JDKart Supermarket';
        } else if (map['storeId'] is String) {
          sId = map['storeId'];
        }
        return FoodItemModel(
          id: map['_id'] ?? map['id'] ?? '',
          name: map['name'] ?? '',
          description: map['description'] ?? (map['unit'] != null ? 'Pack: ${map['unit']}' : ''),
          price: map['price'] ?? 0,
          discountedPrice: map['discountedPrice'],
          image: map['image'] ?? '',
          category: map['category'] ?? 'Grocery',
          isVeg: true,
          isAvailable: map['isAvailable'] ?? true,
          restaurantId: sId,
          restaurantName: sName,
          rating: (map['rating'] is num) ? (map['rating'] as num).toDouble() : 4.5,
          isProduct: true,
        );
      }).toList();
    }
    return [];
  }
}
