import 'package:flutter/material.dart';
import 'core/network/api_client.dart';
import 'features/auth/screens/splash_screen.dart';
import 'services/auth_service.dart';
import 'services/cart_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.loadSession();
  await CartService.instance.loadCart();
  ApiClient.tokenProvider = () => AuthService.instance.token;
  runApp(const FoodhubApp());
}

class FoodhubApp extends StatelessWidget {
  const FoodhubApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JDkart',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.orange,
        primaryColor: const Color(0xFFF97316),
        scaffoldBackgroundColor: Colors.white,
      ),
      home: const SplashScreen(),
    );
  }
}
