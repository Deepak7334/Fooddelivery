import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'notifications_screen.dart';
import 'restaurant_details_screen.dart';
import 'restaurants_screen.dart';
import 'food_items_screen.dart';
import 'grocery_items_screen.dart';
import 'categories_screen.dart';
import 'select_location_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/location_service.dart';
import '../../../services/favorites_service.dart';
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

  List<RestaurantModel> _backendRestaurants = [];
  bool _isLoadingBackend = true;
  String? _backendError;

  static const Duration _chromeSwap = Duration(milliseconds: 500);
  static const int _bannerLoopFactor = 200;
  late final List<_HomeBanner> _banners;
  late final List<_HomeShortcut> _shortcuts;
  late final PageController _bannerController;
  Timer? _bannerTimer;
  int _activeBannerIndex = 0;
  bool _isBannerDragging = false;

  _HomeBanner get _activeBanner => _banners[_activeBannerIndex];

  @override
  void initState() {
    super.initState();
    FavoritesService.instance.load();
    FavoritesService.instance.addListener(_onFavoritesChanged);

    _shortcuts = [
      _HomeShortcut(label: 'Food', icon: Icons.restaurant_rounded, bannerIndex: 0, destination: () => const FoodItemsScreen()),
      _HomeShortcut(label: 'Grocery', icon: Icons.local_grocery_store_rounded, bannerIndex: 1, destination: () => const GroceryItemsScreen()),
      _HomeShortcut(label: 'Restaurants', icon: Icons.storefront_rounded, bannerIndex: 2, destination: () => const RestaurantsScreen()),
      _HomeShortcut(label: 'Categories', icon: Icons.grid_view_rounded, destination: () => const CategoriesScreen()),
    ];

    _banners = [
      _HomeBanner(
        title: 'Craving something tasty?',
        subtitle: 'Order from top-rated kitchens near you',
        cta: 'Explore Food',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
        overlayColors: [const Color(0xFF9A3412).withValues(alpha: 0.92), const Color(0xFFF97316).withValues(alpha: 0.45)],
        accent: jdkartOrange,
        chromeColors: const [Color(0xFFFFF4EA), Color(0xFFFFE3CC)],
        destination: () => const FoodItemsScreen(),
      ),
      _HomeBanner(
        title: 'Fresh grocery, fast',
        subtitle: 'Fruits, veggies & daily essentials',
        cta: 'Shop Grocery',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
        fallbackIcon: Icons.local_grocery_store_rounded,
        overlayColors: [const Color(0xFF14532D).withValues(alpha: 0.92), const Color(0xFF16A34A).withValues(alpha: 0.45)],
        accent: const Color(0xFF16A34A),
        chromeColors: const [Color(0xFFF0FDF4), Color(0xFFDCFCE7)],
        destination: () => const GroceryItemsScreen(),
      ),
      _HomeBanner(
        title: 'Super fast delivery',
        subtitle: 'Live tracking on every JDKart order',
        cta: 'See Restaurants',
        cardColors: const [Color(0xFF0F172A), Color(0xFF334155)],
        accent: const Color(0xFFF59E0B),
        chromeColors: const [Color(0xFF0F172A), Color(0xFF1E293B)],
        chromeIsDark: true,
        watermarkIcon: Icons.delivery_dining_rounded,
        destination: () => const RestaurantsScreen(),
      ),
    ];

    _bannerController = PageController(
      viewportFraction: 0.92,
      initialPage: _banners.length * (_bannerLoopFactor ~/ 2),
    );
    _activeBannerIndex = _bannerController.initialPage % _banners.length;
    _startBannerAutoSlide();
    WidgetsBinding.instance.addPostFrameCallback((_) => _applyChromeOverlay());

    _loadBackendData();
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _bannerController.dispose();
    FavoritesService.instance.removeListener(_onFavoritesChanged);
    super.dispose();
  }

  // ── AUTO-SLIDING BANNER ───────────────────────────────────────────────────
  void _startBannerAutoSlide() {
    _bannerTimer?.cancel();
    if (_isBannerDragging || !mounted) return;
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_bannerController.hasClients) return;
      final lastPage = _banners.length * _bannerLoopFactor - 1;
      final next = (_bannerController.page ?? _bannerController.initialPage.toDouble()).round() + 1;
      if (next > lastPage) {
        _bannerController.jumpToPage(_banners.length * (_bannerLoopFactor ~/ 2));
      } else {
        _bannerController.animateToPage(
          next,
          duration: const Duration(milliseconds: 550),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  bool _handleBannerScroll(ScrollNotification notification) {
    if (notification is ScrollStartNotification && notification.dragDetails != null) {
      _isBannerDragging = true;
      _bannerTimer?.cancel();
    } else if (notification is ScrollEndNotification) {
      _isBannerDragging = false;
      _startBannerAutoSlide();
    }
    return false;
  }

  void _onBannerPageChanged(int page) {
    final logicalIndex = page % _banners.length;
    if (logicalIndex != _activeBannerIndex) {
      setState(() => _activeBannerIndex = logicalIndex);
      _applyChromeOverlay();
    }
  }

  void _applyChromeOverlay() {
    if (!mounted) return;
    final isDark = _activeBanner.chromeIsDark;
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
    ));
  }

  void _openScreen(Widget Function() builder) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => builder()));
  }

  void _onFavoritesChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadBackendData() async {
    setState(() {
      _isLoadingBackend = true;
      _backendError = null;
    });
    try {
      await LocationService.instance.init();
      await LocationService.instance.ensureAutoLocation();
      _currentLocationTitle = LocationService.instance.selectedTitle;
      _currentAddress = LocationService.instance.selectedAddress;
      _userLat = LocationService.instance.selectedLat;
      _userLng = LocationService.instance.selectedLng;

      final restaurants = await RestaurantService.instance
          .getRestaurants(lat: _userLat, lng: _userLng);
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

  // ── STICKY HEADER (top bar + category pills wrapper) ─────────────────────
  Widget _buildStickyHeader() {
    final banner = _activeBanner;
    return AnimatedContainer(
      duration: _chromeSwap,
      decoration: BoxDecoration(
        color: banner.chromeColors[0],
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildTopBar(),
              const SizedBox(height: 10),
              _buildCategoryPills(),
            ],
          ),
        ),
      ),
    );
  }

  // ── HOME SCROLL HANDLER (passes through, reserved for future collapse) ────
  bool _handleHomeScroll(ScrollNotification notification) {
    // Passthrough; return false so the event continues to bubble
    return false;
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
      });

      // Refetch nearby restaurants for the newly selected location.
      await _loadBackendData();
      if (!mounted) return;

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
      body: Column(
        children: [
          _buildStickyHeader(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadBackendData,
              color: jdkartOrange,
              child: NotificationListener<ScrollNotification>(
                onNotification: _handleHomeScroll,
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  slivers: [
                    const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // 3. Auto-Sliding Promo Banners (replaces the Food & Grocery cards)
            SliverToBoxAdapter(child: _buildBannerCarousel()),

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
            ),
          ),
        ],
      ),
    );
  }

  // ── TOP BAR (ADDRESS + NOTIFICATION CONTAINER) ─────────────────────────────
  Widget _buildTopBar() {
    final banner = _activeBanner;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: _openSelectLocationScreen,
              behavior: HitTestBehavior.opaque,
              child: Row(
                children: [
                  _buildHeaderIconButton(Icons.location_on_rounded, color: banner.accent),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedDefaultTextStyle(
                          duration: _chromeSwap,
                          style: TextStyle(
                            color: banner.chromeIsDark ? banner.accent : const Color(0xFFC2410C),
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                            letterSpacing: 0.8,
                          ),
                          child: const Text('DELIVERING TO'),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Flexible(
                              child: AnimatedDefaultTextStyle(
                                duration: _chromeSwap,
                                style: TextStyle(
                                  color: banner.onChrome,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 17,
                                  height: 1.1,
                                  letterSpacing: -0.2,
                                ),
                                child: Text(
                                  _currentLocationTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                            const SizedBox(width: 2),
                            TweenAnimationBuilder<Color?>(
                              duration: _chromeSwap,
                              tween: ColorTween(end: banner.onChromeMuted),
                              builder: (context, color, _) => Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 20,
                                color: color ?? banner.onChromeMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 1),
                        AnimatedDefaultTextStyle(
                          duration: _chromeSwap,
                          style: TextStyle(
                            color: banner.onChromeMuted,
                            fontWeight: FontWeight.w600,
                            fontSize: 11.5,
                            height: 1.25,
                          ),
                          child: Text(
                            _currentAddress,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          // Notification Bell
          GestureDetector(
            onTap: () => _openScreen(() => const NotificationsScreen()),
            child: _buildHeaderIconButton(Icons.notifications_none_rounded),
          ),
        ],
      ),
    );
  }

  // ── CATEGORY PILLS (inside the top container) ─────────────────────────────
  Widget _buildCategoryPills() {
    final banner = _activeBanner;
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        physics: const BouncingScrollPhysics(),
        itemCount: _shortcuts.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final shortcut = _shortcuts[index];
          final isSelected = shortcut.bannerIndex == _activeBannerIndex;
          return GestureDetector(
            onTap: () => _openScreen(shortcut.destination),
            behavior: HitTestBehavior.opaque,
            child: AnimatedContainer(
              duration: _chromeSwap,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? banner.accent : banner.pillFill,
                borderRadius: BorderRadius.circular(19),
                border: Border.all(
                  color: isSelected ? Colors.transparent : banner.pillBorder,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    shortcut.icon,
                    size: 16,
                    color: isSelected ? Colors.white : banner.pillText,
                  ),
                  const SizedBox(width: 6),
                  AnimatedDefaultTextStyle(
                    duration: _chromeSwap,
                    style: TextStyle(
                      color: isSelected ? Colors.white : banner.pillText,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                    child: Text(shortcut.label),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeaderIconButton(IconData icon, {Color color = const Color(0xFF1E293B)}) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Icon(icon, size: 21, color: color),
    );
  }

  // ── AUTO-SLIDING BANNER CAROUSEL ──────────────────────────────────────────
  Widget _buildBannerCarousel() {
    return Column(
      children: [
        SizedBox(
          height: 172,
          child: NotificationListener<ScrollNotification>(
            onNotification: _handleBannerScroll,
            child: PageView.builder(
              controller: _bannerController,
              onPageChanged: _onBannerPageChanged,
              itemCount: _banners.length * _bannerLoopFactor,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6.0),
                child: _buildBannerCard(_banners[index % _banners.length]),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _buildBannerDots(),
      ],
    );
  }

  Widget _buildBannerCard(_HomeBanner banner) {
    return GestureDetector(
      onTap: () => _openScreen(banner.destination),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: banner.hasPhoto
              ? null
              : LinearGradient(
                  colors: banner.cardColors!,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
          boxShadow: [
            BoxShadow(
              color: banner.accent.withValues(alpha: 0.25),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (banner.hasPhoto) SafeImage(image: banner.imageUrl!, placeholderIcon: banner.fallbackIcon),
            if (banner.hasPhoto)
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: banner.overlayColors!,
                      begin: Alignment.bottomLeft,
                      end: Alignment.topRight,
                    ),
                  ),
                ),
              ),
            if (!banner.hasPhoto && banner.watermarkIcon != null)
              Positioned(
                right: -16,
                bottom: -16,
                child: Icon(
                  banner.watermarkIcon,
                  size: 150,
                  color: Colors.white.withValues(alpha: 0.08),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    banner.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 21,
                      height: 1.15,
                      letterSpacing: -0.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 5),
                  Text(
                    banner.subtitle,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w600,
                      fontSize: 12.5,
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          banner.cta,
                          style: TextStyle(
                            color: banner.accent,
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 13, color: banner.accent),
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

  Widget _buildBannerDots() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < _banners.length; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == _activeBannerIndex ? 20 : 7,
            height: 7,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(4),
              color: i == _activeBannerIndex ? _banners[i].accent : const Color(0xFFE2E8F0),
            ),
          ),
      ],
    );
  }


  // ── REAL RESTAURANTS SLIVER LIST ──────────────────────────────────────────
  Widget _buildAllRestaurantsSliverList() {
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final res = _backendRestaurants[index];
          final bool isFavorite = FavoritesService.instance.isFavorite(res.id);
          final String cuisines = res.cuisine.join(' • ');
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
                      // Top-right: Bookmark Heart Button
                      Positioned(
                        top: 10,
                        right: 12,
                        child: GestureDetector(
                          onTap: () => FavoritesService.instance.toggle(res.id),
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
                      // Bottom-left: Offer Ribbon (only when free delivery)
                      if (res.deliveryFee <= 0)
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
                              'Min ₹${res.minOrder}',
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

// ── HOME BANNER + PILL MODELS ───────────────────────────────────────────────
class _HomeBanner {
  final String title;
  final String subtitle;
  final String cta;
  final String? imageUrl;
  final List<Color>? overlayColors;
  final List<Color>? cardColors;
  final IconData? watermarkIcon;
  final IconData fallbackIcon;
  final Color accent;
  final List<Color> chromeColors;
  final bool chromeIsDark;
  final Widget Function() destination;

  const _HomeBanner({
    required this.title,
    required this.subtitle,
    required this.cta,
    this.imageUrl,
    this.overlayColors,
    this.cardColors,
    this.watermarkIcon,
    this.fallbackIcon = Icons.restaurant_rounded,
    required this.accent,
    required this.chromeColors,
    this.chromeIsDark = false,
    required this.destination,
  });

  bool get hasPhoto => imageUrl != null;

  Color get onChrome => chromeIsDark ? Colors.white : const Color(0xFF0F172A);
  Color get onChromeMuted => chromeIsDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
  Color get pillFill => chromeIsDark ? Colors.white.withValues(alpha: 0.14) : Colors.white;
  Color get pillBorder => chromeIsDark ? Colors.white.withValues(alpha: 0.22) : Colors.black.withValues(alpha: 0.06);
  Color get pillText => chromeIsDark ? const Color(0xFFF1F5F9) : const Color(0xFF1E293B);
}

class _HomeShortcut {
  final String label;
  final IconData icon;
  final int? bannerIndex;
  final Widget Function() destination;

  const _HomeShortcut({
    required this.label,
    required this.icon,
    this.bannerIndex,
    required this.destination,
  });
}
