import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';
import '../models/category_model.dart';

class StoreService {
  StoreService._();
  static final StoreService instance = StoreService._();

  final Map<String, bool> _openById = {};

  bool isStoreOpen(String storeId) => _openById[storeId] ?? true;

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
      final list = (data['stores'] as List).map((s) {
        final map = Map<String, dynamic>.from(s as Map);
        if (map['storeType'] == null || map['storeType'].toString().isEmpty) {
          map['storeType'] = 'Grocery';
        }
        return RestaurantModel.fromJson(map);
      }).toList();
      for (final s in list) {
        if (s.id.isNotEmpty) _openById[s.id] = s.isOpen;
      }
      return list;
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
        map['isProduct'] = true;
        return FoodItemModel.fromJson(map);
      }).toList();
    }
    return [];
  }
}
