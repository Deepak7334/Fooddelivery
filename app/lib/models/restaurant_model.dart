class RestaurantModel {
  final String id;
  final String name;
  final String description;
  final String address;
  final String city;
  final String image;
  final String coverImage;
  final String phone;
  final double rating;
  final int totalRatings;
  final String deliveryTime;
  final num deliveryFee;
  final num minOrder;
  final bool isOpen;
  final bool isActive;
  final bool bookingEnabled;
  final List<String> cuisine;
  final double? lat;
  final double? lng;

  RestaurantModel({
    required this.id,
    required this.name,
    this.description = '',
    this.address = '',
    this.city = '',
    this.image = '',
    this.coverImage = '',
    this.phone = '',
    this.rating = 4.0,
    this.totalRatings = 0,
    this.deliveryTime = '20-30 min',
    this.deliveryFee = 15,
    this.minOrder = 100,
    this.isOpen = true,
    this.isActive = true,
    this.bookingEnabled = true,
    this.cuisine = const [],
    this.lat,
    this.lng,
  });

  factory RestaurantModel.fromJson(Map<String, dynamic> json) {
    double? lat;
    double? lng;
    if (json['location'] != null && json['location']['coordinates'] is List) {
      final coords = json['location']['coordinates'] as List;
      if (coords.length >= 2) {
        lng = (coords[0] as num).toDouble();
        lat = (coords[1] as num).toDouble();
      }
    }

    List<String> cuisineList = [];
    if (json['cuisine'] is List) {
      cuisineList = (json['cuisine'] as List).map((e) => e.toString()).toList();
    }

    return RestaurantModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      image: json['image'] ?? '',
      coverImage: json['coverImage'] ?? '',
      phone: json['phone'] ?? '',
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 4.0,
      totalRatings: (json['totalRatings'] is num) ? (json['totalRatings'] as num).toInt() : 0,
      deliveryTime: json['deliveryTime'] ?? '20-30 min',
      deliveryFee: (json['deliveryFee'] is num) ? json['deliveryFee'] : 15,
      minOrder: (json['minOrder'] is num) ? json['minOrder'] : 100,
      isOpen: json['isOpen'] ?? true,
      isActive: json['isActive'] ?? true,
      bookingEnabled: json['bookingEnabled'] ?? true,
      cuisine: cuisineList,
      lat: lat,
      lng: lng,
    );
  }
}
