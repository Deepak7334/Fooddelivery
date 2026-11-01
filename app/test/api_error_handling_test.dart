import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:foodhub/core/network/api_client.dart';
import 'package:foodhub/core/network/api_exception.dart';
import 'package:foodhub/models/order_model.dart';
import 'package:foodhub/services/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Google login session contract', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('null idToken fails without creating a fake session', () async {
      final result = await AuthService.instance
          .completeGoogleSignIn(email: 'dev@google.com', name: 'Dev');
      expect(result['success'], isFalse);
      expect(result['message'], contains('dev@google.com'));
      expect(AuthService.instance.isAuthenticated, isFalse);
      expect(AuthService.instance.token, isNull);
    });

    test('empty idToken fails without creating a fake session', () async {
      final result = await AuthService.instance.completeGoogleSignIn(
          email: 'dev@google.com', name: 'Dev', idToken: '');
      expect(result['success'], isFalse);
      expect(AuthService.instance.isAuthenticated, isFalse);
    });
  });

  group('ApiException', () {
    test('401 and 403 are auth errors', () {
      expect(const ApiException('x', statusCode: 401).isAuthError, isTrue);
      expect(const ApiException('x', statusCode: 403).isAuthError, isTrue);
      expect(const ApiException('x', statusCode: 500).isAuthError, isFalse);
    });

    test('failed request throws ApiException with presentable message', () async {
      await expectLater(
        ApiClient.instance.get('http://127.0.0.1:9/api/nothing'),
        throwsA(isA<ApiException>()
            .having((e) => e.message, 'message', isNotEmpty)),
      );
    });
  });

  group('OrderModel.fromJson', () {
    test('parses nested restaurant, address and items', () {
      final order = OrderModel.fromJson({
        '_id': 'abcdef1234567890',
        'status': 'out_for_delivery',
        'totalAmount': 249,
        'deliveryOTP': '4821',
        'restaurantId': {'name': 'Tandoori Nights'},
        'deliveryAddress': {
          'addressLine1': 'Main Road',
          'city': 'Rohtas',
          'pincode': '821311',
        },
        'createdAt': '2026-11-01T10:00:00.000Z',
        'items': [
          {'name': 'Paneer Tikka', 'quantity': 2, 'price': 180},
          {'foodName': 'Veg Biryani', 'price': 69},
        ],
      });

      expect(order.id, 'abcdef1234567890');
      expect(order.status, 'out_for_delivery');
      expect(order.restaurantName, 'Tandoori Nights');
      expect(order.deliveryAddress, 'Main Road, Rohtas, 821311');
      expect(order.deliveryOTP, '4821');
      expect(order.items.length, 2);
      expect(order.items[1].quantity, 1);
    });

    test('tolerates missing fields', () {
      final order = OrderModel.fromJson({});
      expect(order.id, '');
      expect(order.status, 'pending');
      expect(order.items, isEmpty);
    });
  });
}
