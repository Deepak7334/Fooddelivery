import 'package:flutter/material.dart';
import 'notifications_screen.dart';
import 'restaurant_details_screen.dart';
import 'restaurants_screen.dart';
import 'food_items_screen.dart';
import 'grocery_items_screen.dart';
import 'select_location_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/location_service.dart';
import '../../../models/restaurant_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback? onProfileTap;
  const HomeScreen({Key? key, this.onProfileTap}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _currentAddress = 'Akbarpur, Rohtas, Bihar';
  String _currentLocationTitle = 'Home';
  double _userLat = LocationService.defaultLat;
  double _userLng = LocationService.defaultLng;
  final Color jdkartOrange = const Color(0xFFF97316);
  final Set<String> _favoriteRestaurants = {};

  List<RestaurantModel> _backendRestaurants = [];
  bool _isLoadingBackend = true;
  String? _backendError;

  @override
  void initState() {
    super.initState();
    _loadBackendData();
  }

  Future<void> _loadBackendData() async {
    setState(() {
      _isLoadingBackend = true;
      _backendError = null;
    });
    try {
      await LocationService.instance.init();
      _currentLocationTitle = LocationService.instance.selectedTitle;
      _currentAddress = LocationService.instance.selectedAddress;
      _userLat = LocationService.instance.selectedLat;
      _userLng = LocationService.instance.selectedLng;

      final restaurants = await RestaurantService.instance.getRestaurants();
      if (mounted) {
        setState(() {
          _backendRestaurants = restaurants;
          _sortAndFilterNearMe();
          _isLoadingBackend = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _backendError = e is ApiException
              ? e.message
              : 'Could not load restaurants. Please try again.';
          _isLoadingBackend = false;
        });
      }
    }
  }

  void _sortAndFilterNearMe() {
    _backendRestaurants.sort((a, b) {
      final aLat = a.lat ?? LocationService.defaultLat;
      final aLng = a.lng ?? LocationService.defaultLng;
      final bLat = b.lat ?? LocationService.defaultLat;
      final bLng = b.lng ?? LocationService.defaultLng;

      final distA = LocationService.instance.calculateDistanceKm(_userLat, _userLng, aLat, aLng);
      final distB = LocationService.instance.calculateDistanceKm(_userLat, _userLng, bLat, bLng);
      return distA.compareTo(distB);
    });
  }

  Future<void> _openSelectLocationScreen() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SelectLocationScreen()),
    );
    if (result != null && result is Map<String, dynamic>) {
      final title = result['title'] ?? 'Selected Location';
      final address = result['address'] ?? '';
      final double lat = (result['lat'] is num)
          ? (result['lat'] as num).toDouble()
          : LocationService.defaultLat;
      final double lng = (result['lng'] is num)
          ? (result['lng'] as num).toDouble()
          : LocationService.defaultLng;

      setState(() {
        _currentLocationTitle = title;
        _currentAddress = address;
        _userLat = lat;
        _userLng = lng;
        _sortAndFilterNearMe();
      });

      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Showing items near $title'),
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.white,
      body: RefreshIndicator(
        onRefresh: _loadBackendData,
        color: jdkartOrange,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            // 1. Top Bar Header
            SliverToBoxAdapter(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [const Color(0xFFFEF3C7).withValues(alpha: 0.4), Colors.white],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Padding(
                  padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 12, bottom: 8),
                  child: _buildTopBar(),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            // 2. Hero Envelope Free Delivery Banner
            SliverToBoxAdapter(child: _buildEnvelopeHeroBanner()),

            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // 3. Food & Grocery Dual Category Cards (From Reference Design)
            SliverToBoxAdapter(child: _buildFoodGroceryCategoryCards()),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // 4. Nearby Restaurants Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Nearby Restaurants',
                      style: TextStyle(
                        color: Color(0xFF1E293B),
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        letterSpacing: -0.2,
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const RestaurantsScreen()),
                        );
                      },
                      child: Text(
                        'See all →',
                        style: TextStyle(
                          color: jdkartOrange,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // 5. Restaurants List
            if (_isLoadingBackend)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Center(
                    child: Column(
                      children: [
                        CircularProgressIndicator(color: jdkartOrange),
                        const SizedBox(height: 12),
                        const Text('Loading fresh restaurants...', style: TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              )
            else if (_backendError != null && _backendRestaurants.isEmpty)
              SliverToBoxAdapter(
                child: AppErrorState(
                  message: _backendError!,
                  onRetry: _loadBackendData,
                ),
              )
            else if (_backendRestaurants.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(Icons.storefront_outlined, size: 54, color: Colors.grey[400]),
                        const SizedBox(height: 12),
                        const Text('No restaurants available right now', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: _loadBackendData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                sliver: _buildAllRestaurantsSliverList(),
              ),

            // Bottom Spacing to clear floating navbar
            const SliverToBoxAdapter(child: SizedBox(height: 120)),
          ],
        ),
      ),
    );
  }

  // ── TOP BAR (LOCATION & NOTIFICATION ICON) ──────────────────────────────────
  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          Icon(Icons.location_on, color: jdkartOrange, size: 30),
          const SizedBox(width: 8),
          Expanded(
            child: GestureDetector(
              onTap: _openSelectLocationScreen,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          _currentLocationTitle,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 19),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down, size: 22),
                    ],
                  ),
                  Text(
                    _currentAddress,
                    style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Notification Bell Icon (Replaced Profile Icon)
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
            child: Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                size: 22,
                color: Color(0xFF1E293B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── HERO ENVELOPE FREE DELIVERY BANNER ────────────────────────────────────
  Widget _buildEnvelopeHeroBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFEF08A), Color(0xFFFDE047)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFD97706).withValues(alpha: 0.16),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Left Decorative Coin/Discount Graphic
            Positioned(
              left: 14,
              top: 18,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDE68A).withValues(alpha: 0.95),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.delivery_dining_rounded, size: 26, color: Color(0xFF78350F)),
              ),
            ),

            // Center Envelope Card (Self-sizing, no fixed-height overflow!)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 32),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF9C3),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFFDE68A), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFD97706).withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'FREE DELIVERY',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 22,
                      color: Color(0xFF78350F),
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    'on all orders above ₹99',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: Color(0xFF92400E),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFF59E0B), width: 1.2),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bolt, size: 14, color: Color(0xFFFDE68A)),
                        SizedBox(width: 4),
                        Text(
                          'JDKart Super Fast Delivery >',
                          style: TextStyle(
                            color: Color(0xFFFDE68A),
                            fontWeight: FontWeight.bold,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── FOOD & GROCERY DUAL CATEGORY CARDS (FROM USER REFERENCE DESIGN) ────────
  Widget _buildFoodGroceryCategoryCards() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          // 1. Food Card -> Opens Dedicated Food Items Page
          Expanded(
            child: _buildCategoryCard(
              title: 'Food',
              subtitle: 'Order your favourite food',
              buttonText: 'Explore Food',
              imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FoodItemsScreen()),
                );
              },
            ),
          ),
          const SizedBox(width: 14),
          // 2. Grocery Card -> Opens Dedicated Grocery & Store Page
          Expanded(
            child: _buildCategoryCard(
              title: 'Grocery',
              subtitle: 'Shop your daily essentials',
              buttonText: 'Shop Grocery',
              imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const GroceryItemsScreen()),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCard({
    required String title,
    required String subtitle,
    required String buttonText,
    required String imageUrl,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7ED), // Soft warm peach / cream matching reference image
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: const Color(0xFFFED7AA).withValues(alpha: 0.9),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Image with increased height (135px) for bigger, professional tab look
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SafeImage(
                image: imageUrl,
                height: 135,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholderIcon: Icons.restaurant_rounded,
              ),
            ),
            const SizedBox(height: 12),
            // Title
            Text(
              title,
              style: const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w900,
                color: Color(0xFFC2410C), // Warm terracotta orange from reference
                letterSpacing: 0.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            // Subtitle (maxLines: 2 to prevent truncation)
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF78716C), // Muted brown-gray
                height: 1.25,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            // Soft Green Pill Button with arrow icon
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7), // Soft mint green from screenshot
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    buttonText,
                    style: const TextStyle(
                      color: Color(0xFF15803D), // Emerald green
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    size: 13,
                    color: Color(0xFF15803D),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── REAL RESTAURANTS SLIVER LIST ──────────────────────────────────────────
  Widget _buildAllRestaurantsSliverList() {
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final res = _backendRestaurants[index];
          final String name = res.name;
          final bool isFavorite = _favoriteRestaurants.contains(name);
          final String cuisines = res.cuisine.isNotEmpty ? res.cuisine.join(' • ') : 'North Indian • Mughlai • Biryani';
          final restLat = res.lat ?? LocationService.defaultLat;
          final restLng = res.lng ?? LocationService.defaultLng;
          final distKm = LocationService.instance.calculateDistanceKm(_userLat, _userLng, restLat, restLng);
          final distanceStr = LocationService.instance.formatDistance(distKm);

          return GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => RestaurantDetailsScreen(
                  restaurantId: res.id,
                  restaurantName: res.name,
                  restaurantImage: res.image,
                  restaurantCuisine: cuisines,
                  restaurantRating: res.rating.toStringAsFixed(1),
                  restaurantDeliveryTime: res.deliveryTime,
                  restaurantDeliveryFee: '₹${res.deliveryFee}',
                ),
              ),
            ),
            child: Container(
              margin: const EdgeInsets.only(bottom: 22.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey[200]!),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Restaurant Image Container
                  Stack(
                    children: [
                      SafeImage(
                        image: res.image,
                        height: 180,
                        width: double.infinity,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                        fit: BoxFit.cover,
                        placeholderIcon: Icons.restaurant_rounded,
                      ),
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Colors.black.withValues(alpha: 0.35), Colors.transparent, Colors.black.withValues(alpha: 0.7)],
                              stops: const [0.0, 0.4, 1.0],
                            ),
                          ),
                        ),
                      ),
                      // Top-left: Featured Badge
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.65),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'FEATURED',
                            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                          ),
                        ),
                      ),
                      // Top-right: Bookmark Heart Button
                      Positioned(
                        top: 10,
                        right: 12,
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              if (isFavorite) {
                                _favoriteRestaurants.remove(name);
                              } else {
                                _favoriteRestaurants.add(name);
                              }
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.9),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isFavorite ? Icons.favorite : Icons.favorite_border,
                              color: isFavorite ? Colors.red : Colors.black87,
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                      // Bottom-left: Offer Ribbon
                      Positioned(
                        bottom: 10,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E3A8A),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.percent, color: Colors.white, size: 12),
                              SizedBox(width: 4),
                              Text(
                                'FREE DELIVERY',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Bottom-right: Delivery Time & Distance
                      Positioned(
                        bottom: 10,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.access_time_filled, size: 12, color: Colors.black87),
                              const SizedBox(width: 4),
                              Text(
                                res.deliveryTime,
                                style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w700, fontSize: 11),
                              ),
                              const Text(' • ', style: TextStyle(color: Colors.black54, fontWeight: FontWeight.bold, fontSize: 11)),
                              Text(
                                distanceStr,
                                style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w700, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Info Section
                  Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                res.name,
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.black87),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF267E3E),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    res.rating.toStringAsFixed(1),
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12),
                                  ),
                                  const SizedBox(width: 2),
                                  const Icon(Icons.star, color: Colors.white, size: 12),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                res.address.isNotEmpty ? res.address : cuisines,
                                style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              '₹${res.minOrder} min',
                              style: TextStyle(color: Colors.grey[700], fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10.0),
                          child: Divider(height: 1, color: Colors.grey[200]),
                        ),
                        Row(
                          children: [
                            Icon(Icons.verified_rounded, size: 14, color: jdkartOrange),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Verified Kitchen • Live on JDKart',
                                style: TextStyle(color: Colors.grey[700], fontSize: 12, fontWeight: FontWeight.w500),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: SizedBox(
                                height: 36,
                                child: OutlinedButton(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => RestaurantDetailsScreen(
                                          restaurantId: res.id,
                                          restaurantName: res.name,
                                          restaurantImage: res.image,
                                          restaurantCuisine: cuisines,
                                          restaurantRating: res.rating.toStringAsFixed(1),
                                          restaurantDeliveryTime: res.deliveryTime,
                                          restaurantDeliveryFee: '₹${res.deliveryFee}',
                                        ),
                                      ),
                                    );
                                  },
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(color: jdkartOrange, width: 1.2),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: Text(
                                    'View Menu',
                                    style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: SizedBox(
                                height: 36,
                                child: ElevatedButton(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => RestaurantDetailsScreen(
                                          restaurantId: res.id,
                                          restaurantName: res.name,
                                          restaurantImage: res.image,
                                          restaurantCuisine: cuisines,
                                          restaurantRating: res.rating.toStringAsFixed(1),
                                          restaurantDeliveryTime: res.deliveryTime,
                                          restaurantDeliveryFee: '₹${res.deliveryFee}',
                                        ),
                                      ),
                                    );
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: jdkartOrange,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.bolt, size: 16),
                                      SizedBox(width: 2),
                                      Text(
                                        'Order Now',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        childCount: _backendRestaurants.length,
      ),
    );
  }
}
