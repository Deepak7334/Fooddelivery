class FoodItemModel {
  final String id;
  final String name;
  final String description;
  final num price;
  final num? discountedPrice;
  final String image;
  final String category;
  final bool isVeg;
  final bool isAvailable;
  final bool isBestseller;
  final bool isFeatured;
  final String restaurantId;
  final String restaurantName;
  final double rating;

  FoodItemModel({
    required this.id,
    required this.name,
    this.description = '',
    required this.price,
    this.discountedPrice,
    this.image = '',
    this.category = '',
    this.isVeg = true,
    this.isAvailable = true,
    this.isBestseller = false,
    this.isFeatured = false,
    this.restaurantId = '',
    this.restaurantName = '',
    this.rating = 4.0,
  });

  factory FoodItemModel.fromJson(Map<String, dynamic> json) {
    String restId = '';
    String restName = '';
    if (json['restaurantId'] is Map) {
      restId = json['restaurantId']['_id'] ?? '';
      restName = json['restaurantId']['name'] ?? '';
    } else if (json['restaurantId'] is String) {
      restId = json['restaurantId'];
    }

    return FoodItemModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: json['price'] ?? 0,
      discountedPrice: json['discountedPrice'],
      image: json['image'] ?? '',
      category: json['category'] ?? '',
      isVeg: json['isVeg'] ?? true,
      isAvailable: json['isAvailable'] ?? true,
      isBestseller: json['isBestseller'] ?? false,
      isFeatured: json['isFeatured'] ?? false,
      restaurantId: restId,
      restaurantName: restName,
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 4.0,
    );
  }
}
