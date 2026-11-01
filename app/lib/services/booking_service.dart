import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import 'auth_service.dart';

class AvailableTable {
  final int number;
  final int maxGuests;
  final List<String> slots;

  AvailableTable({
    required this.number,
    required this.maxGuests,
    required this.slots,
  });

  factory AvailableTable.fromJson(Map<String, dynamic> json) => AvailableTable(
        number: _asInt(json['number']) ?? 0,
        maxGuests: _asInt(json['maxGuests']) ?? 4,
        slots: (json['availableSlots'] as List? ?? [])
            .map((s) => s.toString())
            .toList(),
      );

  static int? _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  /// "18:00-20:00" -> "6:00 PM – 8:00 PM"
  static String formatSlot(String slot) {
    final parts = slot.split('-');
    if (parts.length != 2) return slot;
    return '${_to12Hour(parts[0].trim())} – ${_to12Hour(parts[1].trim())}';
  }

  static String _to12Hour(String hhmm) {
    final bits = hhmm.split(':');
    final hour = int.tryParse(bits.first);
    final minute = bits.length > 1 ? int.tryParse(bits[1]) ?? 0 : 0;
    if (hour == null) return hhmm;
    final suffix = hour >= 12 ? 'PM' : 'AM';
    final display = hour % 12 == 0 ? 12 : hour % 12;
    return '$display:${minute.toString().padLeft(2, '0')} $suffix';
  }
}

class BookingService {
  BookingService._();
  static final BookingService instance = BookingService._();

  /// Tables still free for the given date (YYYY-MM-DD). Throws [ApiException].
  Future<List<AvailableTable>> getAvailableTables(
      String restaurantId, String date) async {
    final data = await ApiClient.instance
        .get('${ApiConstants.bookingAvailability}/$restaurantId/$date',
            auth: AuthService.instance.isAuthenticated);
    if (data is Map && data['tables'] is List) {
      return (data['tables'] as List)
          .whereType<Map>()
          .map((t) => AvailableTable.fromJson(Map<String, dynamic>.from(t)))
          .toList();
    }
    return [];
  }

  /// Submit a table reservation request.
  Future<Map<String, dynamic>> createBooking({
    required String restaurantId,
    required int tableNumber,
    required String timeSlot,
    required int partySize,
    required String customerName,
    required String phone,
    String notes = '',
    required String date,
  }) async {
    if (!AuthService.instance.isAuthenticated) {
      return {
        'success': false,
        'message': 'Please login to reserve a table.',
      };
    }

    try {
      final data = await ApiClient.instance.post(ApiConstants.bookings, {
        'restaurantId': restaurantId,
        'tableNumber': tableNumber,
        'timeSlot': timeSlot,
        'partySize': partySize,
        'customerName': customerName,
        'phone': phone,
        'notes': notes,
        'date': date,
      }, auth: true);

      return {
        'success': data is Map ? data['success'] != false : true,
        'message': data is Map && data['message'] != null
            ? data['message'].toString()
            : 'Reservation request sent to the restaurant.',
      };
    } on ApiException catch (e) {
      return {'success': false, 'message': e.message};
    }
  }

  /// Current user's reservations. Throws [ApiException] on failure.
  Future<List<Map<String, dynamic>>> getMyBookings() async {
    if (!AuthService.instance.isAuthenticated) return [];

    final data =
        await ApiClient.instance.get(ApiConstants.myBookings, auth: true);
    if (data is List) {
      return data.map((b) => Map<String, dynamic>.from(b)).toList();
    }
    if (data is Map && data['bookings'] is List) {
      return List<Map<String, dynamic>>.from(data['bookings']);
    }
    return [];
  }

  /// Cancel a still-pending reservation. Throws [ApiException] on failure.
  Future<void> cancelBooking(String bookingId) async {
    await ApiClient.instance
        .patch('${ApiConstants.bookings}/$bookingId/cancel', auth: true);
  }
}
