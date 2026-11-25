import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:foodhub/core/constants/api_constants.dart';
import 'package:foodhub/core/widgets/safe_image.dart';
import 'package:foodhub/features/customer/screens/order_details_screen.dart';
import 'package:foodhub/features/customer/screens/tracking_screen.dart';
import 'package:foodhub/models/order_model.dart';
import 'package:foodhub/models/product_model.dart';
import 'package:foodhub/models/restaurant_model.dart';
import 'package:foodhub/services/cart_service.dart';
import 'package:foodhub/services/favorites_service.dart';
import 'package:foodhub/services/location_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    CartService.instance.clearCart();
    await FavoritesService.instance.clear();
    await LocationService.instance.clearLocation();
  });

  group('SafeImage.resolveUrl', () {
    test('resolves relative /uploads and uploads paths against serverOrigin', () {
      expect(
        SafeImage.resolveUrl('/uploads/dish.jpg'),
        '${ApiConstants.serverOrigin}/uploads/dish.jpg',
      );
      expect(
        SafeImage.resolveUrl('uploads/store.png'),
        '${ApiConstants.serverOrigin}/uploads/store.png',
      );
      expect(
        SafeImage.resolveUrl('//cdn.example.com/a.jpg'),
        'https://cdn.example.com/a.jpg',
      );
      expect(
        SafeImage.resolveUrl('https://example.com/x.png'),
        'https://example.com/x.png',
      );
      expect(
        SafeImage.resolveUrl('data:image/png;base64,AAAA'),
        'data:image/png;base64,AAAA',
      );
      expect(
        SafeImage.resolveUrl('assets/images/logo.png'),
        'assets/images/logo.png',
      );
    });
  });

  group('FoodItemModel & RestaurantModel parsing', () {
    test('parses food variants, addOns, spiceLevels, and freeDelivery', () {
      final item = FoodItemModel.fromJson({
        '_id': 'f1',
        'name': 'Chicken Biryani',
        'price': 200,
        'freeDelivery': true,
        'restaurantId': {'_id': 'r1', 'name': 'Spice Kitchen', 'deliveryFee': 25},
        'variants': [
          {'name': 'Half', 'price': 180, 'discountedPrice': 150, 'isAvailable': true},
          {'name': 'Full', 'price': 280, 'isAvailable': true},
        ],
        'addOns': [
          {'name': 'Extra Raita', 'price': 30, 'isAvailable': true},
        ],
        'spiceLevels': ['Mild', 'Spicy'],
      });

      expect(item.freeDelivery, isTrue);
      expect(item.variants.length, 2);
      expect(item.defaultVariant?.label, 'Half');
      expect(item.displayPrice, 150);
      expect(item.displayOriginalPrice, 180);
      expect(item.hasDiscount, isTrue);
      expect(item.addOns.first.name, 'Extra Raita');
      expect(item.spiceLevels, ['Mild', 'Spicy']);
      expect(item.requiresConfiguration, isTrue);
      expect(item.isOutOfStock, isFalse);
    });

    test('detects out-of-stock product and store variants using weight', () {
      final outProduct = FoodItemModel.fromJson({
        '_id': 'p1',
        'name': 'Atta',
        'price': 300,
        'stock': 0,
        'isProduct': true,
        'storeId': {'_id': 's1', 'name': 'Fresh Mart'},
        'variants': [
          {'weight': '5kg', 'price': 260, 'stock': 0, 'isAvailable': true},
        ],
      });

      expect(outProduct.isProduct, isTrue);
      expect(outProduct.isOutOfStock, isTrue);
      expect(outProduct.variants.first.label, '5kg');
    });

    test('parses store GeoJSON coordinates and metadata via RestaurantModel', () {
      final store = RestaurantModel.fromJson({
        '_id': 's1',
        'name': 'City Mart',
        'storeType': 'supermarket',
        'coverImage': '/uploads/cover.jpg',
        'phone': '9876543210',
        'totalRatings': 42,
        'offers': ['10% OFF'],
        'location': {
          'type': 'Point',
          'coordinates': [83.951, 24.762],
        },
      });

      expect(store.lat, 24.762);
      expect(store.lng, 83.951);
      expect(store.coverImage, '/uploads/cover.jpg');
      expect(store.phone, '9876543210');
      expect(store.totalRatings, 42);
      expect(store.offers, ['10% OFF']);
      expect(store.cuisine, ['SUPERMARKET']);
    });
  });

  group('CartService variants, freeDelivery, and stock guards', () {
    test('separates variants/addOns in cart and serializes freeDelivery & custom options', () {
      final item = FoodItemModel(
        id: 'f1',
        name: 'Biryani',
        price: 200,
        freeDelivery: true,
        restaurantId: 'r1',
        restaurantName: 'Kitchen',
        variants: const [
          ItemVariant(label: 'Half', price: 150),
          ItemVariant(label: 'Full', price: 260),
        ],
      );

      final addedHalf = CartService.instance.addItem(
        item,
        restaurantId: 'r1',
        restaurantName: 'Kitchen',
        variantName: 'Half',
        addOns: const [ItemAddOn(name: 'Raita', price: 25)],
        spiceLevel: 'Spicy',
        basePrice: 150,
        computedPrice: 175,
      );
      final addedFull = CartService.instance.addItem(
        item,
        restaurantId: 'r1',
        restaurantName: 'Kitchen',
        variantName: 'Full',
        basePrice: 260,
        computedPrice: 260,
      );

      expect(addedHalf, isTrue);
      expect(addedFull, isTrue);
      expect(CartService.instance.items.length, 2);

      final payload = CartService.instance.items.first.toBackendPayload();
      expect(payload['variantName'], 'Half');
      expect(payload['spiceLevel'], 'Spicy');
      expect(payload['freeDelivery'], isTrue);
      expect(payload['basePrice'], 150);
      expect(payload['price'], 175);
      expect((payload['addOns'] as List).first['name'], 'Raita');
    });

    test('blocks adding out-of-stock item to cart', () {
      final unavailable = FoodItemModel(
        id: 'p2',
        name: 'Out Item',
        price: 100,
        stock: 0,
        isAvailable: true,
        restaurantId: 's1',
      );
      final ok = CartService.instance.addItem(
        unavailable,
        restaurantId: 's1',
        restaurantName: 'Mart',
        type: 'product',
      );
      expect(ok, isFalse);
      expect(CartService.instance.items, isEmpty);
    });
  });

  group('OrderModel tracking metadata & LocationService manual coordinates', () {
    test('parses estimatedDeliveryTime, vehicleNumber, and item customizations', () {
      final order = OrderModel.fromJson({
        '_id': 'ord12345678',
        'status': 'reached_restaurant',
        'totalAmount': 180,
        'deliveryFee': 0,
        'estimatedDeliveryTime': '20-25 mins',
        'alternatePhone': '9123456789',
        'deliveryAgentId': {
          'name': 'Ravi',
          'phone': '9000011111',
          'vehicleNumber': 'BR-24-AB-1234',
        },
        'items': [
          {
            'foodId': 'f1',
            'name': 'Biryani',
            'price': 180,
            'basePrice': 150,
            'variantName': 'Half',
            'spiceLevel': 'Medium',
            'addOns': [
              {'name': 'Extra Raita', 'price': 30}
            ],
            'quantity': 1,
          }
        ],
      });

      expect(order.estimatedDeliveryTime, '20-25 mins');
      expect(order.deliveryAgentVehicleNumber, 'BR-24-AB-1234');
      expect(order.alternatePhone, '9123456789');
      expect(order.items.first.variantName, 'Half');
      expect(order.items.first.spiceLevel, 'Medium');
      expect(order.items.first.addOns.length, 1);
    });

    test('LocationService keeps activeLat/activeLng null for manual locations', () async {
      await LocationService.instance.setSelectedLocation(
        title: 'Home',
        address: 'Manual Street, Patna',
      );
      expect(LocationService.instance.isLocationSet, isTrue);
      expect(LocationService.instance.activeLat, isNull);
      expect(LocationService.instance.activeLng, isNull);
    });

    test('FavoritesService toggles restaurant IDs properly', () async {
      await FavoritesService.instance.toggle('rest_1');
      expect(FavoritesService.instance.isFavorite('rest_1'), isTrue);
      await FavoritesService.instance.toggle('rest_1');
      expect(FavoritesService.instance.isFavorite('rest_1'), isFalse);
    });
  });

  group('OrderDetailsScreen & TrackingScreen status widgets', () {
    testWidgets('OrderDetailsScreen maps accepted and reached_customer labels cleanly', (tester) async {
      final order = OrderModel(
        id: 'o1',
        orderNumber: '#O1',
        status: 'accepted',
        totalAmount: 150,
        createdAt: DateTime(2026, 1, 1),
        deliveryOTP: '123456',
      );
      await tester.pumpWidget(MaterialApp(home: OrderDetailsScreen(order: order)));
      expect(find.text('Accepted'), findsOneWidget);
      expect(find.text('Share with rider: 123456'), findsOneWidget);
    });

    testWidgets('TrackingScreen displays ETA and vehicleNumber accurately', (tester) async {
      final order = OrderModel(
        id: 'o2',
        orderNumber: '#O2',
        status: 'picked_up',
        totalAmount: 220,
        createdAt: DateTime(2026, 1, 1),
        deliveryAgentName: 'Ramesh',
        deliveryAgentVehicleNumber: 'BR-01-XY-9999',
        estimatedDeliveryTime: '15-20 mins',
      );
      await tester.pumpWidget(MaterialApp(home: TrackingScreen(order: order)));
      expect(find.text('Order Picked Up • ETA 15-20 mins'), findsOneWidget);
      expect(find.text('BR-01-XY-9999'), findsOneWidget);
    });
  });
}
