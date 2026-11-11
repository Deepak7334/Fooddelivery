class OrderModel {
  final String id;
  final String orderNumber;
  final String status;
  final num totalAmount;
  final num deliveryFee;
  final String paymentMethod;
  final String paymentStatus;
  final String restaurantName;
  final String deliveryAddress;
  final DateTime createdAt;
  final List<OrderItemModel> items;
  final String deliveryOTP;
  final String deliveryAgentName;
  final String deliveryAgentPhone;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
    this.deliveryFee = 0,
    this.paymentMethod = 'COD',
    this.paymentStatus = 'Pending',
    this.restaurantName = '',
    this.deliveryAddress = '',
    required this.createdAt,
    this.items = const [],
    this.deliveryOTP = '',
    this.deliveryAgentName = '',
    this.deliveryAgentPhone = '',
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    List<OrderItemModel> itemsList = [];
    if (json['items'] is List) {
      itemsList = (json['items'] as List).map((i) => OrderItemModel.fromJson(i)).toList();
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
    if (json['deliveryAgentId'] is Map) {
      agentName = json['deliveryAgentId']['name'] ?? '';
      agentPhone = json['deliveryAgentId']['phone'] ?? '';
    } else if (json['deliveryAgentName'] is String) {
      agentName = json['deliveryAgentName'];
    }

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
      totalAmount: json['totalAmount'] ?? json['finalAmount'] ?? json['totalPrice'] ?? 0,
      deliveryFee: json['deliveryFee'] ?? 0,
      paymentMethod: json['paymentMethod'] ?? 'COD',
      paymentStatus: json['paymentStatus'] ?? 'pending',
      restaurantName: restName.isNotEmpty ? restName : 'JDKart Partner',
      deliveryAddress: addrStr,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) ?? DateTime.now() : DateTime.now(),
      items: itemsList,
      deliveryOTP: json['deliveryOTP']?.toString() ?? '',
      deliveryAgentName: agentName,
      deliveryAgentPhone: agentPhone,
    );
  }
}

class OrderItemModel {
  final String name;
  final int quantity;
  final num price;

  OrderItemModel({required this.name, required this.quantity, required this.price});

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      name: json['name'] ?? json['foodName'] ?? 'Food Item',
      quantity: json['quantity'] ?? 1,
      price: json['price'] ?? 0,
    );
  }
}
