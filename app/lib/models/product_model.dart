class ItemVariant {
  /// Food items use `name` ("Half", "Full"), grocery products use `weight` ("500g", "1kg").
  final String label;
  final num price;
  final num? discountedPrice;
  final int stock;
  final bool isAvailable;

  const ItemVariant({
    required this.label,
    required this.price,
    this.discountedPrice,
    this.stock = -1,
    this.isAvailable = true,
  });

  bool get inStock => isAvailable && stock != 0;

  num get effectivePrice =>
      (discountedPrice != null &&
              discountedPrice! > 0 &&
              (price <= 0 || discountedPrice! < price))
          ? discountedPrice!
          : price;

  bool get hasDiscount => price > 0 && effectivePrice < price;

  factory ItemVariant.fromJson(Map<String, dynamic> json) {
    final label = (json['name'] ?? json['weight'] ?? '').toString().trim();
    return ItemVariant(
      label: label,
      price: json['price'] is num ? json['price'] as num : 0,
      discountedPrice:
          json['discountedPrice'] is num ? json['discountedPrice'] as num : null,
      stock: json['stock'] is num ? (json['stock'] as num).toInt() : -1,
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}

class ItemAddOn {
  final String name;
  final num price;
  final bool isAvailable;

  const ItemAddOn({
    required this.name,
    required this.price,
    this.isAvailable = true,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'price': price,
      };

  factory ItemAddOn.fromJson(Map<String, dynamic> json) {
    return ItemAddOn(
      name: (json['name'] ?? '').toString(),
      price: json['price'] is num ? json['price'] as num : 0,
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}

class FoodItemModel {
  final String id;
  final String name;
  final String description;
  final num price;
  final num? discountedPrice;
  final String offer;
  final String image;
  final List<String> images;
  final String category;
  final bool isVeg;
  final bool isAvailable;
  final bool isBestseller;
  final bool isFeatured;
  final String restaurantId;
  final String restaurantName;
  final double rating;
  final int totalRatings;
  final bool isProduct;
  final bool freeDelivery;
  final String brand;
  final String unit;
  final int stock;
  final DateTime? mfgDate;
  final DateTime? expiryDate;
  final String ingredients;
  final String nutritionalInfo;
  final String storageInstructions;
  final String preparationTime;
  final num? vendorDeliveryFee;
  final String vendorDeliveryTime;
  final List<ItemVariant> variants;
  final List<ItemAddOn> addOns;
  final List<String> spiceLevels;

  FoodItemModel({
    required this.id,
    required this.name,
    this.description = '',
    required this.price,
    this.discountedPrice,
    this.offer = '',
    this.image = '',
    this.images = const [],
    this.category = '',
    this.isVeg = true,
    this.isAvailable = true,
    this.isBestseller = false,
    this.isFeatured = false,
    this.restaurantId = '',
    this.restaurantName = '',
    this.rating = 4.0,
    this.totalRatings = 0,
    this.isProduct = false,
    this.freeDelivery = false,
    this.brand = '',
    this.unit = '',
    this.stock = -1,
    this.mfgDate,
    this.expiryDate,
    this.ingredients = '',
    this.nutritionalInfo = '',
    this.storageInstructions = '',
    this.preparationTime = '',
    this.vendorDeliveryFee,
    this.vendorDeliveryTime = '',
    this.variants = const [],
    this.addOns = const [],
    this.spiceLevels = const [],
  });

  ItemVariant? get defaultVariant {
    if (variants.isEmpty) return null;
    for (final v in variants) {
      if (v.inStock) return v;
    }
    return variants.first;
  }

  num get effectiveBasePrice {
    if (discountedPrice != null &&
        discountedPrice! > 0 &&
        (price <= 0 || discountedPrice! < price)) {
      return discountedPrice!;
    }
    return price;
  }

  num get displayOriginalPrice => defaultVariant?.price ?? price;

  num get displayPrice => defaultVariant?.effectivePrice ?? effectiveBasePrice;

  bool get hasDiscount =>
      displayOriginalPrice > 0 && displayPrice < displayOriginalPrice;

  int get discountPercent => hasDiscount
      ? (((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)
          .round()
      : 0;

  bool get isOutOfStock =>
      !isAvailable ||
      stock == 0 ||
      (variants.isNotEmpty && variants.every((v) => !v.inStock));

  bool get requiresConfiguration =>
      variants.isNotEmpty ||
      addOns.any((a) => a.isAvailable) ||
      spiceLevels.isNotEmpty;

  List<String> get galleryImages {
    final seen = <String>{};
    final out = <String>[];
    for (final img in [image, ...images]) {
      final clean = img.trim();
      if (clean.isNotEmpty && seen.add(clean)) out.add(clean);
    }
    return out;
  }

  static DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    return DateTime.tryParse(v.toString())?.toLocal();
  }

  factory FoodItemModel.fromJson(Map<String, dynamic> json) {
    final isProd = json['isProduct'] == true || json['storeId'] != null;
    String restId = '';
    String restName = '';
    num? vendorFee;
    String vendorTime = '';

    final vendorRef = isProd ? (json['storeId'] ?? json['restaurantId']) : json['restaurantId'];
    if (vendorRef is Map) {
      restId = (vendorRef['_id'] ?? vendorRef['id'] ?? '').toString();
      restName = (vendorRef['name'] ?? '').toString();
      if (vendorRef['deliveryFee'] is num) {
        vendorFee = vendorRef['deliveryFee'] as num;
      }
      vendorTime = (vendorRef['deliveryTime'] ?? '').toString();
    } else if (vendorRef is String) {
      restId = vendorRef;
    }

    final variantsList = (json['variants'] is List)
        ? (json['variants'] as List)
            .whereType<Map>()
            .map((v) => ItemVariant.fromJson(Map<String, dynamic>.from(v)))
            .where((v) => v.label.isNotEmpty)
            .toList()
        : const <ItemVariant>[];

    final addOnsList = (json['addOns'] is List)
        ? (json['addOns'] as List)
            .whereType<Map>()
            .map((a) => ItemAddOn.fromJson(Map<String, dynamic>.from(a)))
            .where((a) => a.name.isNotEmpty)
            .toList()
        : const <ItemAddOn>[];

    final spiceList = (json['spiceLevels'] is List)
        ? (json['spiceLevels'] as List)
            .map((s) => s.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList()
        : const <String>[];

    final imagesList = (json['images'] is List)
        ? (json['images'] as List)
            .map((s) => s.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList()
        : const <String>[];

    final unit = (json['unit'] ?? '').toString();
    final rawDesc = (json['description'] ?? '').toString();
    final desc = rawDesc.isNotEmpty
        ? rawDesc
        : (isProd && unit.isNotEmpty ? 'Pack: $unit' : '');

    return FoodItemModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: desc,
      price: json['price'] is num ? json['price'] as num : 0,
      discountedPrice:
          json['discountedPrice'] is num ? json['discountedPrice'] as num : null,
      offer: (json['offer'] ?? '').toString(),
      image: (json['image'] ?? (imagesList.isNotEmpty ? imagesList.first : '')).toString(),
      images: imagesList,
      category: (json['category'] ?? (isProd ? 'Grocery' : '')).toString(),
      isVeg: json['isVeg'] ?? true,
      isAvailable: json['isAvailable'] ?? true,
      isBestseller: json['isBestseller'] ?? false,
      isFeatured: json['isFeatured'] ?? false,
      restaurantId: restId,
      restaurantName: restName.isNotEmpty
          ? restName
          : (isProd ? 'JDKart Supermarket' : ''),
      rating: (json['rating'] is num)
          ? (json['rating'] as num).toDouble()
          : (isProd ? 4.5 : 4.0),
      totalRatings:
          json['totalRatings'] is num ? (json['totalRatings'] as num).toInt() : 0,
      isProduct: isProd,
      freeDelivery: json['freeDelivery'] == true,
      brand: (json['brand'] ?? '').toString(),
      unit: unit,
      stock: json['stock'] is num ? (json['stock'] as num).toInt() : -1,
      mfgDate: _parseDate(json['mfgDate']),
      expiryDate: _parseDate(json['expiryDate']),
      ingredients: (json['ingredients'] ?? '').toString(),
      nutritionalInfo: (json['nutritionalInfo'] ?? '').toString(),
      storageInstructions: (json['storageInstructions'] ?? '').toString(),
      preparationTime: (json['preparationTime'] ?? '').toString(),
      vendorDeliveryFee: vendorFee,
      vendorDeliveryTime: vendorTime,
      variants: variantsList,
      addOns: addOnsList,
      spiceLevels: spiceList,
    );
  }
}
