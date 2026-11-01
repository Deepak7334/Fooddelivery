import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/notification_model.dart';
import 'auth_service.dart';

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  /// Fetch notifications from backend. Throws [ApiException] on failure.
  Future<List<NotificationModel>> getNotifications() async {
    if (!AuthService.instance.isAuthenticated) return [];

    final data = await ApiClient.instance
        .get(ApiConstants.notifications, auth: true);
    if (data is Map && data['notifications'] is List) {
      return (data['notifications'] as List)
          .map((n) => NotificationModel.fromJson(Map<String, dynamic>.from(n)))
          .toList();
    }
    return [];
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
