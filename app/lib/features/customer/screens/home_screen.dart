import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'notifications_screen.dart';
import 'restaurants_screen.dart';
import 'food_items_screen.dart';
import 'grocery_items_screen.dart';
import 'table_booking_discovery_screen.dart';
import 'select_location_screen.dart';
import 'product_details_screen.dart';
import 'cart_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/location_service.dart';
import '../../../services/store_service.dart';
import '../../../services/favorites_service.dart';
import '../../../models/product_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/utils/cart_actions.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';
import '../../../core/utils/format.dart';
import '../../../core/network/api_client.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback? onProfileTap;
  const HomeScreen({Key? key, this.onProfileTap}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _currentAddress = 'Tap to set your delivery location';
  String _currentLocationTitle = 'Select location';
  final Color jdkartOrange = const Color(0xFFF97316);

  List<FoodItemModel> _homeFoods = [];
  List<FoodItemModel> _homeProducts = [];
  bool _isLoadingBackend = true;
  String? _backendError;

  final ScrollController _scrollController = ScrollController();
  int _gridItemCount = 10;
  bool _isLoadingMore = false;
  static const int _gridPageSize = 10;

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
    _scrollController.addListener(_onGridScroll);

    _shortcuts = [
      _HomeShortcut(label: 'Food', icon: Icons.restaurant_rounded, bannerIndex: 0, destination: () => const FoodItemsScreen()),
      _HomeShortcut(label: 'Grocery', icon: Icons.local_grocery_store_rounded, bannerIndex: 1, destination: () => const GroceryItemsScreen()),
      _HomeShortcut(label: 'Restaurants', icon: Icons.storefront_rounded, bannerIndex: 2, destination: () => const RestaurantsScreen()),
      _HomeShortcut(label: 'Book a Table', icon: Icons.table_restaurant_rounded, destination: () => const TableBookingDiscoveryScreen()),
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
      _HomeBanner(
        title: 'Find Your Perfect Table',
        subtitle: 'Discover your favourite restaurants and reserve your table in just a few clicks.',
        cta: 'Book Now',
        imageUrl: 'assets/images/banners/book_a_table_hero.jpg',
        fallbackIcon: Icons.table_restaurant_rounded,
        overlayColors: [const Color(0xFF1C1207).withValues(alpha: 0.92), const Color(0xFFF97316).withValues(alpha: 0.35)],
        accent: jdkartOrange,
        chromeColors: const [Color(0xFF1C1207), Color(0xFF431407)],
        chromeIsDark: true,
        destination: () => const TableBookingDiscoveryScreen(),
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
    _scrollController.dispose();
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
      if (LocationService.instance.isLocationSet) {
        _currentLocationTitle = LocationService.instance.selectedTitle;
        _currentAddress = LocationService.instance.selectedAddress;
      } else {
        _currentLocationTitle = 'Select location';
        _currentAddress = 'Showing all stores & restaurants';
      }

      // Items and products are the main attraction on the home screen.
      final lat = LocationService.instance.activeLat;
      final lng = LocationService.instance.activeLng;
      Object? foodsError;
      Object? productsError;
      final foodsFuture = RestaurantService.instance
          .getFoods(lat: lat, lng: lng)
          .catchError((Object e) {
        foodsError = e;
        return <FoodItemModel>[];
      });
      final productsFuture = _loadNearbyProducts(lat, lng).catchError((Object e) {
        productsError = e;
        return <FoodItemModel>[];
      });
      final foods = await foodsFuture;
      final products = await productsFuture;
      if (foodsError != null && productsError != null) throw foodsError!;

      if (mounted) {
        setState(() {
          _homeFoods = foods;
          _homeProducts = products;
          _gridItemCount = _gridPageSize;
          _isLoadingBackend = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _backendError = e is ApiException
              ? e.message
              : 'Could not load items. Please try again.';
          _isLoadingBackend = false;
        });
      }
    }
  }

  Future<List<FoodItemModel>> _loadNearbyProducts(double? lat, double? lng) async {
    final productsFuture = StoreService.instance.getProducts();
    if (lat == null || lng == null) return productsFuture;
    final (products, stores) =
        await (productsFuture, StoreService.instance.getStores(lat: lat, lng: lng)).wait;
    final nearbyStoreIds = stores.map((s) => s.id).toSet();
    return products.where((p) => nearbyStoreIds.contains(p.restaurantId)).toList();
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

  // ── INFINITE SCROLL (reveals more grid items near the bottom) ─────────────
  void _onGridScroll() {
    if (_isLoadingMore || !_scrollController.hasClients) return;
    final total = _homeFoods.length + _homeProducts.length;
    if (_gridItemCount >= total || total == 0) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      setState(() => _isLoadingMore = true);
      Future.delayed(const Duration(milliseconds: 350), () {
        if (!mounted) return;
        setState(() {
          final next = _gridItemCount + _gridPageSize;
          _gridItemCount = next < total ? next : total;
          _isLoadingMore = false;
        });
      });
    }
  }

  Future<void> _openSelectLocationScreen() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SelectLocationScreen()),
    );
    if (!mounted) return;
    if (result != null && result is Map<String, dynamic>) {
      if (result['cleared'] == true) {
        setState(() {
          _currentLocationTitle = 'Select location';
          _currentAddress = 'Tap to set your delivery location';
        });
        await _loadBackendData();
        if (!mounted) return;
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Location removed — showing all items'),
            backgroundColor: const Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
        return;
      }

      final title = result['title'] ?? 'Selected Location';
      final address = result['address'] ?? '';

      setState(() {
        _currentLocationTitle = title;
        _currentAddress = address;
      });

      // Refetch items for the newly selected location.
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
    final allItems = <FoodItemModel>[..._homeFoods, ..._homeProducts];
    final visibleItems = allItems.take(_gridItemCount).toList();
    final hasMore = _gridItemCount < allItems.length;

    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.white,
      body: Column(
        children: [
          _buildStickyHeader(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () { ApiClient.instance.clearCache(); return _loadBackendData(); },
              color: jdkartOrange,
              child: NotificationListener<ScrollNotification>(
                onNotification: _handleHomeScroll,
                child: CustomScrollView(
                  controller: _scrollController,
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  slivers: [
                    const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // 3. Auto-Sliding Promo Banners (replaces the Food & Grocery cards)
            SliverToBoxAdapter(child: _buildBannerCarousel()),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // 4. Popular Food Items (featured highlight)
            if (_homeFoods.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: _buildSectionHeader(
                  title: 'Popular Items',
                  onSeeAll: () => _openScreen(() => const FoodItemsScreen()),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              SliverToBoxAdapter(child: _buildHomeItemCarousel(_homeFoods)),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],

            // 5. All Items & Products — 2-column grid with infinite scroll
            if (allItems.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: _buildSectionHeader(
                  title: 'All Items',
                  onSeeAll: () => _openScreen(() => const FoodItemsScreen()),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.62,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _buildGridItemCard(visibleItems[index]),
                    childCount: visibleItems.length,
                  ),
                ),
              ),
              if (hasMore)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: _isLoadingMore
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: jdkartOrange,
                              ),
                            )
                          : Text(
                              'Scroll for more',
                              style: TextStyle(color: Colors.grey[500], fontSize: 12),
                            ),
                    ),
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
            ],

            // 6. Loading / error / empty states for items
            if (_isLoadingBackend)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Center(
                    child: Column(
                      children: [
                        CircularProgressIndicator(color: jdkartOrange),
                        const SizedBox(height: 12),
                        const Text('Loading fresh items...', style: TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              )
            else if (_backendError != null && _homeFoods.isEmpty && _homeProducts.isEmpty)
              SliverToBoxAdapter(
                child: AppErrorState(
                  message: _backendError!,
                  onRetry: () { ApiClient.instance.clearCache(); _loadBackendData(); },
                ),
              )
            else if (_homeFoods.isEmpty && _homeProducts.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(Icons.local_mall_outlined, size: 54, color: Colors.grey[400]),
                        const SizedBox(height: 12),
                        Text(
                          LocationService.instance.isLocationSet
                              ? 'Nothing delivers to this location yet'
                              : 'No items available right now',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        if (LocationService.instance.isLocationSet) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Try another delivery location to see nearby restaurants and stores.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey[600], fontSize: 13),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            onPressed: _openSelectLocationScreen,
                            icon: const Icon(Icons.location_on_outlined, color: Colors.white, size: 18),
                            label: const Text('Change location',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(backgroundColor: jdkartOrange),
                          ),
                        ],
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: () { ApiClient.instance.clearCache(); _loadBackendData(); },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
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


  // ── HOME ITEM SECTIONS ────────────────────────────────────────────────────
  Widget _buildSectionHeader({required String title, required VoidCallback onSeeAll}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF1E293B),
              fontWeight: FontWeight.w900,
              fontSize: 18,
              letterSpacing: -0.2,
            ),
          ),
          GestureDetector(
            onTap: onSeeAll,
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
    );
  }

  Widget _buildHomeItemCarousel(List<FoodItemModel> items) {
    return SizedBox(
      height: 212,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length > 12 ? 12 : items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) => _buildHomeItemCard(items[index]),
      ),
    );
  }

  Widget _buildHomeItemCard(FoodItemModel item) {
    final price = item.discountedPrice ?? item.price;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: item)),
        );
      },
      child: Container(
        width: 140,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey[200]!),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                SafeImage(
                  image: item.image,
                  height: 88,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(10),
                  fit: BoxFit.cover,
                ),
                Positioned(
                  top: 5,
                  left: 5,
                  child: Container(
                    width: 13,
                    height: 13,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(3),
                      border: Border.all(
                        color: item.isVeg ? Colors.green : Colors.red,
                        width: 1.4,
                      ),
                    ),
                    child: Center(
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: item.isVeg ? Colors.green : Colors.red,
                        ),
                      ),
                    ),
                  ),
                ),
                if (item.hasDiscount)
                  Positioned(
                    bottom: 5,
                    left: 5,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF16A34A),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${item.discountPercent}% OFF',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 7),
            Text(
              item.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              item.restaurantName.isNotEmpty ? item.restaurantName : item.category,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
            ),
            const Spacer(),
            Text(
              formatPrice(price),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 14,
                color: Color(0xFFC2410C),
              ),
            ),
            const SizedBox(height: 6),
            _buildCardActionButtons(item),
          ],
        ),
      ),
    );
  }

  Widget _buildGridItemCard(FoodItemModel item) {
    final price = item.discountedPrice ?? item.price;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: item)),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey[200]!),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: SafeImage(
                      image: item.image,
                      borderRadius: BorderRadius.circular(10),
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 5,
                    left: 5,
                    child: Container(
                      width: 13,
                      height: 13,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(3),
                        border: Border.all(
                          color: item.isVeg ? Colors.green : Colors.red,
                          width: 1.4,
                        ),
                      ),
                      child: Center(
                        child: Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: item.isVeg ? Colors.green : Colors.red,
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (item.hasDiscount)
                    Positioned(
                      bottom: 5,
                      left: 5,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${item.discountPercent}% OFF',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 7),
            Text(
              item.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: Color(0xFF1E293B),
                height: 1.15,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              item.restaurantName.isNotEmpty ? item.restaurantName : item.category,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 6),
            Text(
              formatPrice(price),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 14,
                color: Color(0xFFC2410C),
              ),
            ),
            const SizedBox(height: 6),
            _buildCardActionButtons(item),
          ],
        ),
      ),
    );
  }

  // ── CARD ACTIONS (matches website: light ADD + solid Order/Buy) ───────────
  Widget _buildCardActionButtons(FoodItemModel item) {
    return Row(
      children: [
        Expanded(
          child: _buildActionButton(
            label: 'ADD',
            onTap: () => _addHomeToCart(item),
            filled: false,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildActionButton(
            label: item.isProduct ? 'Buy' : 'Order',
            onTap: () => _buyNow(item),
            filled: true,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required String label,
    required VoidCallback onTap,
    required bool filled,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: filled ? jdkartOrange : const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(8),
          border: filled ? null : Border.all(color: jdkartOrange.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: filled ? Colors.white : jdkartOrange,
            fontWeight: FontWeight.w700,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Future<void> _buyNow(FoodItemModel item) async {
    final vendorId = item.restaurantId;
    if (vendorId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This item is unavailable right now.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final vendorName = item.restaurantName.isNotEmpty
        ? item.restaurantName
        : (item.isProduct ? 'JDKart Store' : 'JDKart Restaurant');
    final added = await addToCart(
      context,
      item,
      vendorId: vendorId,
      vendorName: vendorName,
      type: item.isProduct ? 'product' : 'food',
    );
    if (!added || !mounted) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
  }

  Future<void> _addHomeToCart(FoodItemModel item) async {
    final vendorId = item.restaurantId;
    if (vendorId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This item is unavailable right now.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final vendorName = item.restaurantName.isNotEmpty
        ? item.restaurantName
        : (item.isProduct ? 'JDKart Store' : 'JDKart Restaurant');
    final added = await addToCart(
      context,
      item,
      vendorId: vendorId,
      vendorName: vendorName,
      type: item.isProduct ? 'product' : 'food',
    );
    if (!added || !mounted) return;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added "${item.name}" to cart!'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
        backgroundColor: jdkartOrange,
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: Colors.white,
          onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
          },
        ),
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
