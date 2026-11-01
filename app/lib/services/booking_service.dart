import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import 'auth_service.dart';

class BookingService {
  BookingService._();
  static final BookingService instance = BookingService._();

  /// Check table availability for a restaurant on a specific date (YYYY-MM-DD).
  /// Throws [ApiException] on failure.
  Future<List<Map<String, dynamic>>> getAvailableTables(String restaurantId, String date) async {
    final data = await ApiClient.instance
        .get('${ApiConstants.bookingAvailability}/$restaurantId/$date', auth: true);
    if (data is Map && data['tables'] is List) {
      return List<Map<String, dynamic>>.from(data['tables']);
    }
    return [];
  }

  /// Submit a table reservation request
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
            : 'Table booked successfully!',
      };
    } on ApiException catch (e) {
      return {'success': false, 'message': e.message};
    }
  }

  /// Get current user's table bookings. Throws on failure.
  Future<List<Map<String, dynamic>>> getMyBookings() async {
    if (!AuthService.instance.isAuthenticated) return [];

    final data = await ApiClient.instance
        .get(ApiConstants.myBookings, auth: true);
    if (data is List) {
      return List<Map<String, dynamic>>.from(data);
    }
    if (data is Map && data['bookings'] is List) {
      return List<Map<String, dynamic>>.from(data['bookings']);
    }
    return [];
  }
}
