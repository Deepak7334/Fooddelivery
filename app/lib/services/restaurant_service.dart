import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/category_model.dart';
import '../models/restaurant_model.dart';
import '../models/product_model.dart';

class RestaurantService {
  RestaurantService._();
  static final RestaurantService instance = RestaurantService._();

  /// Fetch all active categories from backend. Throws [ApiException] on failure.
  Future<List<CategoryModel>> getCategories() async {
    final data = await ApiClient.instance.get(ApiConstants.categories);
    if (data is Map && data['categories'] is List) {
      return (data['categories'] as List)
          .map((c) => CategoryModel.fromJson(Map<String, dynamic>.from(c)))
          .toList();
    }
    return [];
  }

  /// Fetch nearby or all restaurants from backend. Throws on failure.
  Future<List<RestaurantModel>> getRestaurants({double? lat, double? lng}) async {
    String url = ApiConstants.restaurants;
    if (lat != null && lng != null) {
      url += '?lat=$lat&lng=$lng';
    }

    final data = await ApiClient.instance.get(url);
    if (data is Map && data['restaurants'] is List) {
      return (data['restaurants'] as List)
          .map((r) => RestaurantModel.fromJson(Map<String, dynamic>.from(r)))
          .toList();
    }
    return [];
  }

  /// Fetch popular food items from backend. Throws on failure.
  Future<List<FoodItemModel>> getFoods({double? lat, double? lng}) async {
    String url = ApiConstants.foods;
    if (lat != null && lng != null) {
      url += '?lat=$lat&lng=$lng';
    }

    final data = await ApiClient.instance.get(url);
    if (data is Map && data['foods'] is List) {
      return (data['foods'] as List)
          .map((f) => FoodItemModel.fromJson(Map<String, dynamic>.from(f)))
          .toList();
    }
    return [];
  }

  /// Fetch restaurant details and full menu grouped. Throws on failure.
  Future<({RestaurantModel? restaurant, List<FoodItemModel> menu})> getRestaurantDetails(String id) async {
    final data = await ApiClient.instance
        .get('${ApiConstants.baseUrl}/customer/restaurants/$id');

    RestaurantModel? restaurant;
    List<FoodItemModel> menu = [];
    if (data is Map) {
      if (data['restaurant'] != null) {
        restaurant = RestaurantModel.fromJson(Map<String, dynamic>.from(data['restaurant']));
      }
      if (data['menu'] is List) {
        menu = (data['menu'] as List)
            .map((f) => FoodItemModel.fromJson(Map<String, dynamic>.from(f)))
            .toList();
      }
    }
    return (restaurant: restaurant, menu: menu);
  }
}
