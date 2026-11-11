import 'package:flutter/material.dart';
import 'core/network/api_client.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/splash_screen.dart';
import 'features/customer/screens/notifications_screen.dart';
import 'services/auth_service.dart';
import 'services/cart_service.dart';
import 'services/push_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.loadSession();
  await CartService.instance.loadCart();
  ApiClient.tokenProvider = () => AuthService.instance.token;
  ApiClient.onUnauthorized = _handleSessionExpired;
  PushService.instance.onNotificationOpened = _openNotificationList;
  runApp(const FoodhubApp());
}

Future<void> _handleSessionExpired() async {
  if (!AuthService.instance.isAuthenticated) return;
  await AuthService.instance.clearSession();
  final navigator = PushService.instance.navigatorKey.currentState;
  if (navigator == null) return;
  navigator.pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginScreen()),
    (route) => false,
  );
}

void _openNotificationList() {
  final context = PushService.instance.navigatorKey.currentContext;
  if (context == null) return;
  Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
  );
}

class FoodhubApp extends StatelessWidget {
  const FoodhubApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JDkart',
      debugShowCheckedModeBanner: false,
      navigatorKey: PushService.instance.navigatorKey,
      theme: ThemeData(
        primarySwatch: Colors.orange,
        primaryColor: const Color(0xFFF97316),
        scaffoldBackgroundColor: Colors.white,
      ),
      home: const SplashScreen(),
    );
  }
}
