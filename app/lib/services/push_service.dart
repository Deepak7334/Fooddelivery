import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import 'auth_service.dart';

/// Live order-status pushes. The backend stores the device token on the user
/// record (POST /notifications/save-token) and sends through FCM.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Set by the app so tapping a push opens the notifications list without
  /// this service importing any feature screen.
  VoidCallback? onNotificationOpened;

  bool _firebaseReady = false;
  bool _listening = false;
  String? _fcmToken;
  StreamSubscription<RemoteMessage>? _foregroundSub;
  StreamSubscription<RemoteMessage>? _openedSub;
  StreamSubscription<String>? _registeredSub;
  StreamSubscription<String>? _unregisteredSub;

  bool get isFirebaseReady => _firebaseReady;
  String? get fcmToken => _fcmToken;

  /// Android-only for now: this project has no GoogleService-Info.plist for
  /// iOS, and Flutter web has no FCM setup, so both are skipped.
  Future<void> _ensureFirebase() async {
    if (_firebaseReady || kIsWeb) return;
    if (defaultTargetPlatform != TargetPlatform.android) return;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _firebaseReady = true;
    } catch (e) {
      debugPrint('Firebase init failed: $e');
    }
  }

  /// Ask for permission, hand the device token to the backend and start
  /// listening. Safe to call on app start and right after login.
  Future<void> registerForPush() async {
    await _ensureFirebase();
    if (!_firebaseReady) return;
    if (!AuthService.instance.isAuthenticated) return;

    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        sound: true,
        badge: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      _startListening(messaging);
      await messaging.register();
      // Newer plugin versions deliver the token through `onRegistered`, but
      // existing installs may already hold one, so sync it explicitly here.
      // ignore: deprecated_member_use
      final existingToken = await messaging.getToken();
      if (existingToken != null &&
          existingToken.isNotEmpty &&
          existingToken != _fcmToken) {
        _fcmToken = existingToken;
        await _uploadToken();
      }
    } catch (e) {
      debugPrint('Push registration failed: $e');
    }
  }

  void _startListening(FirebaseMessaging messaging) {
    if (_listening) return;
    _listening = true;

    _foregroundSub = FirebaseMessaging.onMessage.listen(_showInApp);
    _openedSub =
        FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationTapped);
    _registeredSub = messaging.onRegistered.listen((token) {
      _fcmToken = token;
      _uploadToken();
    });
    _unregisteredSub = messaging.onUnregistered.listen((token) {
      if (_fcmToken == token) _fcmToken = null;
    });

    messaging.getInitialMessage().then((message) {
      if (message != null) _onNotificationTapped(message);
    });
  }

  Future<void> _uploadToken() async {
    final token = _fcmToken;
    if (token == null || token.isEmpty) return;
    if (!AuthService.instance.isAuthenticated) return;
    try {
      await ApiClient.instance
          .post(ApiConstants.saveFcmToken, {'token': token}, auth: true);
    } on ApiException catch (e) {
      debugPrint('Could not save FCM token: ${e.message}');
    }
  }

  /// Called from logout, while the session token is still valid.
  Future<void> unregister() async {
    await _foregroundSub?.cancel();
    await _openedSub?.cancel();
    await _registeredSub?.cancel();
    await _unregisteredSub?.cancel();
    _foregroundSub = null;
    _openedSub = null;
    _registeredSub = null;
    _unregisteredSub = null;
    _listening = false;

    final token = _fcmToken;
    _fcmToken = null;
    if (token == null || token.isEmpty) return;
    try {
      await ApiClient.instance
          .post(ApiConstants.removeFcmToken, {'token': token}, auth: true);
    } on ApiException catch (e) {
      debugPrint('Could not remove FCM token: ${e.message}');
    }
  }

  void _showInApp(RemoteMessage message) {
    final context = navigatorKey.currentContext;
    if (context == null) return;
    final notification = message.notification;
    final title = notification?.title ?? 'JDkart update';
    final body = notification?.body ?? '';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(body.isEmpty ? title : '$title: $body'),
        duration: const Duration(seconds: 5),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: _openNotifications,
        ),
      ),
    );
  }

  void _onNotificationTapped(RemoteMessage message) => _openNotifications();

  void _openNotifications() => onNotificationOpened?.call();
}
