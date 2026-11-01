import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import 'home_screen.dart';
import 'categories_screen.dart';
import 'search_screen.dart';
import 'cart_screen.dart';
import 'profile_screen.dart';
import '../../../services/push_service.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({Key? key}) : super(key: key);

  @override
  _MainLayoutState createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;
  final ValueNotifier<bool> _isNavbarVisible = ValueNotifier<bool>(true);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      PushService.instance.registerForPush();
    });
  }

  @override
  void dispose() {
    _isNavbarVisible.dispose();
    super.dispose();
  }

  bool _handleScrollNotification(ScrollNotification notification) {
    if (notification.depth == 0 && notification is UserScrollNotification) {
      if (notification.direction == ScrollDirection.forward) {
        if (!_isNavbarVisible.value) _isNavbarVisible.value = true;
      } else if (notification.direction == ScrollDirection.reverse) {
        if (_isNavbarVisible.value) _isNavbarVisible.value = false;
      }
    }
    return false;
  }

  void _onTabTapped(int index) {
    if (_currentIndex != index) {
      setState(() => _currentIndex = index);
    }
  }

  Widget _buildNavIcon(IconData icon, int index) {
    final bool isActive = _currentIndex == index;
    
    return GestureDetector(
      onTap: () => _onTabTapped(index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 60,
        width: (280.0 - 24.0) / 5,
        alignment: Alignment.center,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          width: isActive ? 42 : 36,
          height: isActive ? 42 : 36,
          decoration: BoxDecoration(
            color: isActive ? Theme.of(context).primaryColor : Colors.transparent,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: isActive ? Colors.white : Colors.grey[500],
            size: isActive ? 24 : 26,
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNavBar() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: ValueListenableBuilder<bool>(
        valueListenable: _isNavbarVisible,
        builder: (context, isVisible, child) {
          return AnimatedSlide(
            duration: const Duration(milliseconds: 250),
            curve: Curves.fastOutSlowIn,
            offset: isVisible ? Offset.zero : const Offset(0, 1.5),
            child: child,
          );
        },
        child: Align(
          alignment: Alignment.bottomCenter,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Container(
                height: 60,
                width: 280,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08), 
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildNavIcon(Icons.home_rounded, 0),
                      _buildNavIcon(Icons.category_rounded, 1),
                      _buildNavIcon(Icons.search_rounded, 2),
                      _buildNavIcon(Icons.shopping_bag_rounded, 3),
                      _buildNavIcon(Icons.person_rounded, 4),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );     
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
        }
      },
      child: Scaffold(
        extendBody: true,
        body: NotificationListener<ScrollNotification>(
          onNotification: _handleScrollNotification,
          child: Stack(
            children: [
              IndexedStack(
                index: _currentIndex,
                children: [
                  HomeScreen(onProfileTap: () => _onTabTapped(4)),
                  const CategoriesScreen(),
                  SearchScreen(
                    onBack: () => _onTabTapped(0),
                    autofocus: false,
                  ),
                  CartScreen(
                    onBrowseTap: () => _onTabTapped(0),
                  ),
                  const ProfileScreen(),
                ],
              ),
              _buildBottomNavBar(),
            ],
          ),
        ),
      ),
    );
  }
}
