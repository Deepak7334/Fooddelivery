import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:foodhub/features/customer/screens/my_bookings_screen.dart';
import 'package:foodhub/features/customer/screens/table_booking_screen.dart';
import 'package:foodhub/services/booking_service.dart';

void main() {
  group('AvailableTable', () {
    test('parses the backend availability payload', () {
      final table = AvailableTable.fromJson({
        '_id': '6ab4048cdbe3ed2d4ab3ff90',
        'number': '7',
        'maxGuests': 4,
        'availableSlots': ['09:00-11:00', '20:00-22:00'],
      });

      expect(table.number, 7);
      expect(table.maxGuests, 4);
      expect(table.slots.length, 2);
    });

    test('defaults safely when the payload is incomplete', () {
      final table = AvailableTable.fromJson({'number': 3});

      expect(table.number, 3);
      expect(table.maxGuests, 4);
      expect(table.slots, isEmpty);
    });

    test('formats 24h slot ranges for display', () {
      expect(AvailableTable.formatSlot('09:00-11:00'), '9:00 AM – 11:00 AM');
      expect(AvailableTable.formatSlot('18:00-20:00'), '6:00 PM – 8:00 PM');
      expect(AvailableTable.formatSlot('00:00-01:05'), '12:00 AM – 1:05 AM');
      expect(AvailableTable.formatSlot('12:30'), '12:30');
    });
  });

  group('booking screens', () {
    testWidgets('booking without a restaurant asks to pick one',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: TableBookingScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Open a restaurant to reserve its table.'),
          findsOneWidget);
    });

    testWidgets('my reservations asks a guest to log in', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MyBookingsScreen()),
      );
      await tester.pumpAndSettle();

      expect(
          find.text('Log in to see your table reservations.'), findsOneWidget);
    });
  });
}
