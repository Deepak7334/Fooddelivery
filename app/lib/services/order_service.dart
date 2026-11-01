import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/order_model.dart';
import 'auth_service.dart';

class OrderService {
  OrderService._();
  static final OrderService instance = OrderService._();

  /// Fetch logged in customer's orders. Throws [ApiException] on failure.
  Future<List<OrderModel>> getMyOrders() async {
    if (!AuthService.instance.isAuthenticated) return [];

    final data = await ApiClient.instance
        .get(ApiConstants.orders, auth: true);
    if (data is Map && data['orders'] is List) {
      return (data['orders'] as List)
          .map((o) => OrderModel.fromJson(Map<String, dynamic>.from(o)))
          .toList();
    }
    return [];
  }

  /// Fetch single order details by id (for tracking). Throws on failure.
  Future<OrderModel?> getOrderById(String orderId) async {
    if (!AuthService.instance.isAuthenticated) return null;

    final data = await ApiClient.instance
        .get('${ApiConstants.orders}/$orderId', auth: true);
    if (data is Map && data['order'] != null) {
      return OrderModel.fromJson(Map<String, dynamic>.from(data['order']));
    }
    return null;
  }

  /// Create and place order on backend
  Future<Map<String, dynamic>> placeOrder({
    required String restaurantId,
    required List<Map<String, dynamic>> items,
    required num totalAmount,
    required dynamic deliveryAddress,
    Map<String, dynamic>? deliveryCoords,
    String? specialInstructions,
    String? serviceAreaId,
    String paymentMethod = 'COD',
  }) async {
    final payload = {
      'restaurantId': restaurantId,
      'items': items,
      'totalAmount': totalAmount,
      'deliveryAddress': deliveryAddress,
      if (deliveryCoords != null) 'deliveryCoords': deliveryCoords,
      if (specialInstructions != null && specialInstructions.isNotEmpty)
        'specialInstructions': specialInstructions,
      if (serviceAreaId != null && serviceAreaId.isNotEmpty)
        'serviceAreaId': serviceAreaId,
      'paymentMethod': paymentMethod,
    };

    try {
      final data = await ApiClient.instance
          .post(ApiConstants.orders, payload, auth: true);

      OrderModel? orderObj;
      if (data is Map) {
        if (data['order'] != null) {
          orderObj = OrderModel.fromJson(Map<String, dynamic>.from(data['order']));
        } else if (data['orders'] is List && (data['orders'] as List).isNotEmpty) {
          orderObj = OrderModel.fromJson(Map<String, dynamic>.from(data['orders'][0]));
        }
      }

      final ok = data is Map && data['success'] == true;
      if (!ok && orderObj == null) {
        return {
          'success': false,
          'order': null,
          'message': data is Map && data['message'] != null
              ? data['message'].toString()
              : 'Failed to place order',
        };
      }
      return {
        'success': true,
        'order': orderObj,
        'message': data is Map && data['message'] != null
            ? data['message'].toString()
            : 'Order placed successfully',
      };
    } on ApiException catch (e) {
      return {'success': false, 'order': null, 'message': e.message};
    }
  }

  /// Cancel order. Throws [ApiException] on failure.
  Future<void> cancelOrder(String orderId) async {
    await ApiClient.instance
        .patch('${ApiConstants.orders}/$orderId/cancel', auth: true);
  }
}
