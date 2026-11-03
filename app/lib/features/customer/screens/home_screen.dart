import 'package:flutter/material.dart';
import 'notifications_screen.dart';
import 'restaurant_details_screen.dart';
import 'restaurants_screen.dart';
import 'food_items_screen.dart';
import 'grocery_items_screen.dart';
import 'table_booking_screen.dart';
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
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeCategory {
  const _HomeCategory(this.title, this.icon, this.screen);

  final String title;
  final IconData icon;
  final Widget Function() screen;
}

class _HomeScreenState extends State<HomeScreen> {
  static const Color _orange = Color(0xFFF97316);
  static const Color _ink = Color(0xFF1E293B);
  static const Color _muted = Color(0xFF64748B);
  static const Color _line = Color(0xFFE2E8F0);
  static const Color _peach = Color(0xFFFFF7ED);
  static const Color _green = Color(0xFF15803D);

  static const List<_HomeCategory> _categories = [
    _HomeCategory('Food', Icons.restaurant_rounded, FoodItemsScreen.new),
    _HomeCategory('Grocery', Icons.local_grocery_store_rounded, GroceryItemsScreen.new),
    _HomeCategory('Restaurants', Icons.storefront_rounded, RestaurantsScreen.new),
    _HomeCategory('Book a Table', Icons.table_restaurant_rounded, TableBookingScreen.new),
  ];

  String _currentAddress = 'Akbarpur, Rohtas, Bihar';
  String _currentLocationTitle = 'Home';
  double _userLat = LocationService.defaultLat;
  double _userLng = LocationService.defaultLng;
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

  void _openRestaurant(RestaurantModel res) {
    final cuisines = res.cuisine.isNotEmpty
        ? res.cuisine.join(' • ')
        : 'North Indian • Mughlai • Biryani';
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
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.white,
      body: RepaintBoundary(
        child: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            onRefresh: _loadBackendData,
            color: _orange,
            child: CustomScrollView(
              // Android-style clamping physics (no rubber-band overshoot) and a
              // deeper cache so rows are laid out before they reach the screen.
              physics: const AlwaysScrollableScrollPhysics(),
              cacheExtent: 600,
              slivers: [
                SliverToBoxAdapter(child: _buildLocationHeader()),
                SliverToBoxAdapter(child: _buildFreeDeliveryStrip()),
                SliverToBoxAdapter(child: _buildCategoryStrip()),
                SliverToBoxAdapter(child: _buildSectionHeader()),
                ..._buildRestaurantsSliver(),
                const SliverToBoxAdapter(child: SizedBox(height: 110)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── TOP BAR (DELIVERY LOCATION + NOTIFICATION BELL) ─────────────────────────
  Widget _buildLocationHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 12, 4),
      child: Row(
        children: [
          const Icon(Icons.location_on_rounded, color: _orange, size: 22),
          const SizedBox(width: 8),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _openSelectLocationScreen,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          _currentLocationTitle,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: _ink,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Icon(Icons.expand_more_rounded, size: 20, color: _muted),
                    ],
                  ),
                  Text(
                    _currentAddress,
                    style: const TextStyle(color: _muted, fontSize: 12.5),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            ),
            child: const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.notifications_none_rounded, size: 24, color: _ink),
            ),
          ),
        ],
      ),
    );
  }

  // ── FREE DELIVERY STRIP ─────────────────────────────────────────────────────
  Widget _buildFreeDeliveryStrip() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: _peach,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFED7AA)),
        ),
        child: const Row(
          children: [
            Icon(Icons.delivery_dining_rounded, color: _orange, size: 28),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'FREE delivery on orders above ₹99',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5,
                      color: Color(0xFF9A3412),
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'JDKart super-fast delivery',
                    style: TextStyle(fontSize: 11.5, color: _muted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── CATEGORY STRIP ──────────────────────────────────────────────────────────
  Widget _buildCategoryStrip() {
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final category = _categories[index];
          return SizedBox(
            width: 78,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => category.screen()),
                );
              },
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: _peach,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(category.icon, color: _orange, size: 26),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    category.title,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: _ink,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ── SECTION HEADER ──────────────────────────────────────────────────────────
  Widget _buildSectionHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Nearby Restaurants',
            style: TextStyle(
              color: _ink,
              fontWeight: FontWeight.w800,
              fontSize: 17,
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RestaurantsScreen()),
              );
            },
            child: const Text(
              'See all',
              style: TextStyle(color: _orange, fontWeight: FontWeight.w700, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  // ── RESTAURANT LIST STATES ──────────────────────────────────────────────────
  List<Widget> _buildRestaurantsSliver() {
    if (_isLoadingBackend) {
      return [
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(
              child: SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: _orange),
              ),
            ),
          ),
        ),
      ];
    }

    if (_backendError != null && _backendRestaurants.isEmpty) {
      return [
        SliverToBoxAdapter(
          child: AppErrorState(message: _backendError!, onRetry: _loadBackendData),
        ),
      ];
    }

    if (_backendRestaurants.isEmpty) {
      return [
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 40, horizontal: 32),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.storefront_outlined, size: 48, color: _muted),
                  SizedBox(height: 12),
                  Text(
                    'No restaurants available right now',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: _ink),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Pull down to refresh once new kitchens are live.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12.5, color: _muted),
                  ),
                ],
              ),
            ),
          ),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) => _buildRestaurantRow(_backendRestaurants[index]),
            childCount: _backendRestaurants.length,
          ),
        ),
      ),
    ];
  }

  // ── COMPACT RESTAURANT ROW ──────────────────────────────────────────────────
  Widget _buildRestaurantRow(RestaurantModel res) {
    final bool isFavorite = _favoriteRestaurants.contains(res.name);
    final double distKm = LocationService.instance.calculateDistanceKm(
      _userLat,
      _userLng,
      res.lat ?? LocationService.defaultLat,
      res.lng ?? LocationService.defaultLng,
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _openRestaurant(res),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _line),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: SafeImage(
                        image: res.image,
                        width: 84,
                        height: 84,
                        decodeWidth: 252,
                        placeholderIcon: Icons.restaurant_rounded,
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            if (isFavorite) {
                              _favoriteRestaurants.remove(res.name);
                            } else {
                              _favoriteRestaurants.add(res.name);
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isFavorite ? Icons.favorite : Icons.favorite_border,
                            size: 15,
                            color: isFavorite ? const Color(0xFFE11D48) : _muted,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        res.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15.5,
                          color: _ink,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        res.cuisine.isNotEmpty ? res.cuisine.join(' • ') : res.address,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5, color: _muted),
                      ),
                      const SizedBox(height: 7),
                      Row(
                        children: [
                          Icon(
                            res.isOpen ? Icons.schedule_rounded : Icons.storefront_rounded,
                            size: 14,
                            color: res.isOpen ? _muted : const Color(0xFFDC2626),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            res.isOpen ? res.deliveryTime : 'Closed now',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: res.isOpen ? _ink : const Color(0xFFDC2626),
                            ),
                          ),
                          const Text('  •  ', style: TextStyle(fontSize: 12, color: _muted)),
                          Text(
                            LocationService.instance.formatDistance(distKm),
                            style: const TextStyle(fontSize: 12, color: _ink),
                          ),
                          const Spacer(),
                          _ratingChip(res.rating),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            res.deliveryFee == 0 ? 'FREE delivery' : '₹${res.deliveryFee} delivery',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: _green,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '₹${res.minOrder} min',
                            style: const TextStyle(fontSize: 11.5, color: _muted),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _ratingChip(double rating) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF15803D),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            rating.toStringAsFixed(1),
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 11,
            ),
          ),
          const SizedBox(width: 2),
          const Icon(Icons.star_rounded, color: Colors.white, size: 12),
        ],
      ),
    );
  }
}
