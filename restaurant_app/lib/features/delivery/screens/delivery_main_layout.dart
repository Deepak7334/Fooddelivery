import 'package:flutter/material.dart';
import 'delivery_map_screen.dart';
import 'delivery_earnings_screen.dart';
import 'delivery_profile_screen.dart';

class DeliveryMainLayout extends StatefulWidget {
  const DeliveryMainLayout({Key? key}) : super(key: key);

  @override
  _DeliveryMainLayoutState createState() => _DeliveryMainLayoutState();
}

class _DeliveryMainLayoutState extends State<DeliveryMainLayout> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const DeliveryMapScreen(),
    const DeliveryEarningsScreen(),
    const DeliveryProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.map), label: 'Map'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet), label: 'Earnings'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
