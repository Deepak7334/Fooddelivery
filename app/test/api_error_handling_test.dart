import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:foodhub/core/network/api_client.dart';
import 'package:foodhub/core/network/api_exception.dart';
import 'package:foodhub/models/order_model.dart';
import 'package:foodhub/services/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  // flutter_test swaps dart:io's HttpClient for a mock that replies to every
  // request with an empty 400, so the stub-server tests below need real sockets.
  // Must happen before ApiClient builds its pooled client.
  HttpOverrides.global = null;

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

    test('401 on a login call keeps the server reason', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      server.listen((req) async {
        await req.drain();
        req.response
          ..statusCode = HttpStatus.unauthorized
          ..headers.contentType = ContentType.json
          ..write(jsonEncode({
            'success': false,
            'message': 'Google did not verify this sign-in. Please try again.',
          }));
        await req.response.close();
      });
      addTearDown(() => server.close(force: true));

      await expectLater(
        ApiClient.instance
            .post('http://127.0.0.1:${server.port}/api/auth/firebase-login', {
          'idToken': 'not-a-real-token',
          'name': 'Dev',
        }),
        throwsA(isA<ApiException>()
            .having((e) => e.message, 'message', contains('Google did not verify'))
            .having((e) => e.statusCode, 'statusCode', 401)),
      );
    });

    test('401 on an authenticated call reports an expired session', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      server.listen((req) async {
        await req.drain();
        req.response
          ..statusCode = HttpStatus.unauthorized
          ..headers.contentType = ContentType.json
          ..write(jsonEncode({
            'success': false,
            'message': 'Token invalid or expired',
          }));
        await req.response.close();
      });
      addTearDown(() => server.close(force: true));

      await expectLater(
        ApiClient.instance.get('http://127.0.0.1:${server.port}/api/customer/orders',
            auth: true),
        throwsA(isA<ApiException>().having(
            (e) => e.message, 'message', 'Session expired. Please log in again.')),
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
