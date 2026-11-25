class OrderModel {
  final String id;
  final String orderNumber;
  final String status;
  final num totalAmount;
  final num deliveryFee;
  final num finalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String restaurantName;
  final String deliveryAddress;
  final DateTime createdAt;
  final List<OrderItemModel> items;
  final String deliveryOTP;
  final String deliveryAgentName;
  final String deliveryAgentPhone;
  final String deliveryAgentVehicleNumber;
  final String estimatedDeliveryTime;
  final String alternatePhone;
  final String vendorId;
  final bool isStoreOrder;
  final bool isReviewed;

  bool get canCancel => status == 'pending' || status == 'accepted';
  bool get canRate => status == 'delivered' && !isReviewed;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
    this.deliveryFee = 0,
    num? finalAmount,
    this.paymentMethod = 'COD',
    this.paymentStatus = 'Pending',
    this.restaurantName = '',
    this.deliveryAddress = '',
    required this.createdAt,
    this.items = const [],
    this.deliveryOTP = '',
    this.deliveryAgentName = '',
    this.deliveryAgentPhone = '',
    this.deliveryAgentVehicleNumber = '',
    this.estimatedDeliveryTime = '30-45 mins',
    this.alternatePhone = '',
    this.vendorId = '',
    this.isStoreOrder = false,
    this.isReviewed = false,
  }) : finalAmount = finalAmount ?? (totalAmount + deliveryFee);

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    List<OrderItemModel> itemsList = [];
    if (json['items'] is List) {
      itemsList = (json['items'] as List)
          .whereType<Map>()
          .map((i) => OrderItemModel.fromJson(Map<String, dynamic>.from(i)))
          .toList();
    }

    String restName = '';
    if (json['restaurantId'] is Map) {
      restName = json['restaurantId']['name'] ?? '';
    } else if (json['storeId'] is Map) {
      restName = json['storeId']['name'] ?? '';
    } else if (json['restaurantName'] is String && (json['restaurantName'] as String).isNotEmpty) {
      restName = json['restaurantName'];
    } else if (json['storeName'] is String && (json['storeName'] as String).isNotEmpty) {
      restName = json['storeName'];
    }

    String addrStr = '';
    if (json['deliveryAddress'] is Map) {
      final a = json['deliveryAddress'];
      final parts = [
        a['addressLine1'],
        a['addressLine2'],
        a['landmark'],
        a['area'],
        a['city'],
        a['state'],
        a['pincode'],
      ].where((p) => p != null && p.toString().trim().isNotEmpty).toList();
      addrStr = parts.join(', ');
    } else if (json['deliveryAddress'] is String) {
      addrStr = json['deliveryAddress'];
    } else if (json['address'] is String) {
      addrStr = json['address'];
    }

    String agentName = '';
    String agentPhone = '';
    String agentVehicle = '';
    if (json['deliveryAgentId'] is Map) {
      agentName = (json['deliveryAgentId']['name'] ?? '').toString();
      agentPhone = (json['deliveryAgentId']['phone'] ?? '').toString();
      agentVehicle = (json['deliveryAgentId']['vehicleNumber'] ?? '').toString();
    } else if (json['deliveryAgentName'] is String) {
      agentName = json['deliveryAgentName'];
    }

    final restRef = OrderItemModel._refId(json['restaurantId']);
    final storeRef = OrderItemModel._refId(json['storeId']);

    final rawId = (json['_id'] ?? json['id'] ?? '').toString();
    final fallbackNumber = rawId.isEmpty
        ? '—'
        : '#${rawId.substring(0, rawId.length < 8 ? rawId.length : 8).toUpperCase()}';

    return OrderModel(
      id: rawId,
      orderNumber: (json['orderNumber']?.toString().isNotEmpty ?? false)
          ? json['orderNumber'].toString()
          : fallbackNumber,
      status: json['status'] ?? 'pending',
      totalAmount: json['totalAmount'] ?? json['totalPrice'] ?? 0,
      deliveryFee: json['deliveryFee'] ?? 0,
      finalAmount: json['finalAmount'],
      paymentMethod: json['paymentMethod'] ?? 'COD',
      paymentStatus: json['paymentStatus'] ?? 'pending',
      restaurantName: restName.isNotEmpty ? restName : 'JDKart Partner',
      deliveryAddress: addrStr,
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'])?.toLocal() ?? DateTime.now())
          : DateTime.now(),
      items: itemsList,
      deliveryOTP: json['deliveryOTP']?.toString() ?? '',
      deliveryAgentName: agentName,
      deliveryAgentPhone: agentPhone,
      deliveryAgentVehicleNumber: agentVehicle,
      estimatedDeliveryTime:
          (json['estimatedDeliveryTime']?.toString().isNotEmpty ?? false)
              ? json['estimatedDeliveryTime'].toString()
              : '30-45 mins',
      alternatePhone: (json['alternatePhone'] ?? '').toString(),
      vendorId: storeRef.isNotEmpty ? storeRef : restRef,
      isStoreOrder: storeRef.isNotEmpty || json['orderType'] == 'product',
      isReviewed: json['isReviewed'] == true,
    );
  }
}

class OrderAddOn {
  final String name;
  final num price;

  const OrderAddOn({required this.name, this.price = 0});

  factory OrderAddOn.fromJson(Map<String, dynamic> json) => OrderAddOn(
        name: (json['name'] ?? '').toString(),
        price: json['price'] is num ? json['price'] as num : 0,
      );

  Map<String, dynamic> toJson() => {'name': name, 'price': price};
}

class OrderItemModel {
  final String itemId;
  final String type;
  final String name;
  final int quantity;
  final num price;
  final String image;
  final String unit;
  final num? basePrice;
  final String variantName;
  final List<OrderAddOn> addOns;
  final String spiceLevel;
  final String specialInstructions;

  OrderItemModel({
    this.itemId = '',
    this.type = 'food',
    required this.name,
    required this.quantity,
    required this.price,
    this.image = '',
    this.unit = '',
    this.basePrice,
    this.variantName = '',
    this.addOns = const [],
    this.spiceLevel = '',
    this.specialInstructions = '',
  });

  bool get isProduct => type == 'product';

  String get customizationSummary {
    final parts = <String>[];
    if (variantName.isNotEmpty) {
      parts.add(variantName);
    } else if (unit.isNotEmpty) {
      parts.add(unit);
    }
    if (spiceLevel.isNotEmpty) parts.add(spiceLevel);
    if (addOns.isNotEmpty) {
      parts.add('+ ${addOns.map((a) => a.name).join(', ')}');
    }
    return parts.join(' • ');
  }

  static String _refId(dynamic v) {
    if (v == null) return '';
    if (v is Map) return (v['_id'] ?? v['id'] ?? '').toString();
    return v.toString();
  }

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    final productId = _refId(json['productId']);
    final foodId = _refId(json['foodId'] ?? json['menuItemId']);
    final isProduct = productId.isNotEmpty || json['type'] == 'product';
    final addOnsList = (json['addOns'] is List)
        ? (json['addOns'] as List)
            .whereType<Map>()
            .map((a) => OrderAddOn.fromJson(Map<String, dynamic>.from(a)))
            .where((a) => a.name.isNotEmpty)
            .toList()
        : const <OrderAddOn>[];
    return OrderItemModel(
      itemId: isProduct ? productId : foodId,
      type: isProduct ? 'product' : 'food',
      name: json['name'] ?? json['foodName'] ?? 'Food Item',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      price: json['price'] ?? 0,
      image: json['image']?.toString() ?? '',
      unit: (json['unit'] ?? '').toString(),
      basePrice: json['basePrice'] is num ? json['basePrice'] as num : null,
      variantName: (json['variantName'] ?? '').toString(),
      addOns: addOnsList,
      spiceLevel: (json['spiceLevel'] ?? '').toString(),
      specialInstructions: (json['specialInstructions'] ?? '').toString(),
    );
  }
}
