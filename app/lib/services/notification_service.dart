import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/notification_model.dart';
import 'auth_service.dart';

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  /// Fetch notifications from backend. Throws [ApiException] on failure.
  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 20}) async {
    if (!AuthService.instance.isAuthenticated) return [];

    final data = await ApiClient.instance
        .get('${ApiConstants.notifications}?page=$page&limit=$limit', auth: true);
    if (data is Map && data['notifications'] is List) {
      return (data['notifications'] as List)
          .map((n) => NotificationModel.fromJson(Map<String, dynamic>.from(n)))
          .toList();
    }
    return [];
  }

  /// Mark a single notification as read
  Future<void> markAsRead(String id) async {
    await ApiClient.instance
        .put('${ApiConstants.notifications}/$id/read', auth: true);
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    await ApiClient.instance
        .put('${ApiConstants.notifications}/read-all', auth: true);
  }

  /// Delete notification
  Future<void> deleteNotification(String id) async {
    await ApiClient.instance
        .delete('${ApiConstants.notifications}/$id', auth: true);
  }
}
