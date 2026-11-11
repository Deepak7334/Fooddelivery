import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../../../models/notification_model.dart';
import '../../../services/notification_service.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;
  String? _error;
  final Color jdkartOrange = const Color(0xFFF97316);
  Timer? _refreshTimer;
  StreamSubscription<RemoteMessage>? _pushSub;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
    // Live updates while the list is open: instant on FCM push, plus a
    // periodic refetch so it stays fresh even when push is unavailable.
    _pushSub = FirebaseMessaging.onMessage.listen((_) => _fetchNotifications(silent: true));
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _fetchNotifications(silent: true),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _pushSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchNotifications({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final data = await NotificationService.instance.getNotifications();
      if (mounted) {
        setState(() {
          _notifications = data;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (!mounted || silent) return;
      setState(() {
        _error =
            e is ApiException ? e.message : 'Could not load notifications. Please try again.';
        _isLoading = false;
      });
    }
  }

  /// Swipe left-to-right removes the notification locally, then on the server.
  Future<void> _deleteNotification(NotificationModel notif) async {
    final index = _notifications.indexOf(notif);
    setState(() => _notifications.remove(notif));
    try {
      await NotificationService.instance.deleteNotification(notif.id);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _notifications.insert(index.clamp(0, _notifications.length), notif);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Could not delete notification.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          if (_notifications.isNotEmpty)
            TextButton(
              onPressed: () async {
                try {
                  await NotificationService.instance.markAllAsRead();
                  _fetchNotifications();
                } on ApiException catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.message), backgroundColor: Colors.redAccent),
                  );
                }
              },
              child: Text(
                'Mark all read',
                style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : RefreshIndicator(
              onRefresh: _fetchNotifications,
              color: jdkartOrange,
              child: _error != null && _notifications.isEmpty
                  ? AppErrorState(message: _error!, onRetry: _fetchNotifications)
                  : _notifications.isEmpty
                      ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: const BoxDecoration(
                                color: Color(0xFFFFF7ED),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.notifications_none_rounded, size: 64, color: jdkartOrange),
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'No Notifications Yet',
                              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF1E293B)),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'You are all caught up! Order updates, offers, and delivery alerts will appear here.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.4),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      itemCount: _notifications.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final notif = _notifications[index];
                        return Dismissible(
                          key: ValueKey(notif.id),
                          direction: DismissDirection.startToEnd,
                          background: Container(
                            color: const Color(0xFFFEE2E2),
                            alignment: Alignment.centerLeft,
                            padding: const EdgeInsets.only(left: 24),
                            child: const Icon(
                              Icons.delete_outline_rounded,
                              color: Color(0xFFB91C1C),
                              size: 26,
                            ),
                          ),
                          onDismissed: (_) => _deleteNotification(notif),
                          child: _buildNotificationItem(notif),
                        );
                      },
                    ),
            ),
    );
  }

  Widget _buildNotificationItem(NotificationModel item) {
    IconData icon = Icons.notifications_active_outlined;
    if (item.type.contains('ORDER')) {
      icon = Icons.delivery_dining_rounded;
    } else if (item.type.contains('PROMO') || item.type.contains('OFFER')) {
      icon = Icons.local_offer_outlined;
    }

    final timeStr = '${item.createdAt.day}/${item.createdAt.month}/${item.createdAt.year}';

    return Container(
      color: item.isRead ? Colors.white : const Color(0xFFFFF7ED).withValues(alpha: 0.4),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: item.isRead ? const Color(0xFFF1F5F9) : const Color(0xFFFFEDD5),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: item.isRead ? const Color(0xFF64748B) : jdkartOrange, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: TextStyle(
                          fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                          fontSize: 15,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    Text(
                      timeStr,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.body,
                  style: TextStyle(color: Colors.grey[700], fontSize: 13.5, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
