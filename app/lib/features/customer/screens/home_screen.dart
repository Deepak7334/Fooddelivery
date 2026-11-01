import 'package:flutter/material.dart';
import 'restaurant_details_screen.dart';
import 'categories_screen.dart';
import 'checkout_screen.dart';
import 'cart_screen.dart';
import 'product_details_screen.dart';
import 'search_screen.dart';
import 'select_location_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/cart_service.dart';
import '../../../services/location_service.dart';
import '../../../models/restaurant_model.dart';
import '../../../models/product_model.dart';
import '../../../models/category_model.dart';
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
  bool isVegMode = false;
  int _selectedCategoryIndex = 0; // 0 = All
  String _currentAddress = 'Akbarpur, Rohtas, Bihar';
  String _currentLocationTitle = 'Home';
  double _userLat = LocationService.defaultLat;
  double _userLng = LocationService.defaultLng;
  final Color jdkartOrange = const Color(0xFFF97316);
  final Color coralRed = const Color(0xFFE11D48);
  final Set<String> _favoriteRestaurants = {};

  List<RestaurantModel> _backendRestaurants = [];
  List<FoodItemModel> _backendFoods = [];
  List<CategoryModel> _backendCategories = [];
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

      final results = await Future.wait([
        RestaurantService.instance.getRestaurants(),
        RestaurantService.instance.getFoods(),
        RestaurantService.instance.getCategories(),
      ]);
      if (mounted) {
        setState(() {
          _backendRestaurants = results[0] as List<RestaurantModel>;
          _backendFoods = results[1] as List<FoodItemModel>;
          _backendCategories = results[2] as List<CategoryModel>;
          _sortAndFilterNearMe();
          _isLoadingBackend = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _backendError = e is ApiException
              ? e.message
              : 'Could not load the menu. Please try again.';
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

    if (_backendRestaurants.isNotEmpty) {
      final nearestRestId = _backendRestaurants.first.id;
      _backendFoods.sort((a, b) {
        final aIsNear = a.restaurantId == nearestRestId ? 0 : 1;
        final bIsNear = b.restaurantId == nearestRestId ? 0 : 1;
        return aIsNear.compareTo(bIsNear);
      });
    }
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

  List<FoodItemModel> get _filteredFoods {
    List<FoodItemModel> list = _backendFoods;
    if (isVegMode) {
      list = list.where((f) => f.isVeg).toList();
    }
    if (_selectedCategoryIndex > 0 && _selectedCategoryIndex <= _backendCategories.length) {
      final selectedCat = _backendCategories[_selectedCategoryIndex - 1].name.toLowerCase();
      list = list.where((f) => f.category.toLowerCase().contains(selectedCat) || selectedCat.contains(f.category.toLowerCase())).toList();
    }
    return list;
  }

  void _addFoodToCart(FoodItemModel dish) {
    final restId = dish.restaurantId.isNotEmpty
        ? dish.restaurantId
        : (_backendRestaurants.isNotEmpty ? _backendRestaurants.first.id : '6ab4048cdbe3ed2d4ab3ff89');
    final restName = dish.restaurantName.isNotEmpty
        ? dish.restaurantName
        : (_backendRestaurants.isNotEmpty ? _backendRestaurants.first.name : 'Annapurna Family Restaurant');

    CartService.instance.addItem(dish, restaurantId: restId, restaurantName: restName);

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added "${dish.name}" to cart!'),
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

  void _orderFoodNow(FoodItemModel dish) {
    final restId = dish.restaurantId.isNotEmpty
        ? dish.restaurantId
        : (_backendRestaurants.isNotEmpty ? _backendRestaurants.first.id : '6ab4048cdbe3ed2d4ab3ff89');
    final restName = dish.restaurantName.isNotEmpty
        ? dish.restaurantName
        : (_backendRestaurants.isNotEmpty ? _backendRestaurants.first.name : 'Annapurna Family Restaurant');

    CartService.instance.addItem(dish, restaurantId: restId, restaurantName: restName);
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen()));
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
            // Top bar header with localized gradient
            SliverToBoxAdapter(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [const Color(0xFFFEF3C7).withOpacity(0.4), Colors.white],
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

            // Sticky search bar
            SliverPersistentHeader(
              pinned: true,
              delegate: _StickySearchBarDelegate(
                height: MediaQuery.of(context).padding.top + 70.0,
                child: _buildSearchBarContainer(),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            // Hero Envelope Free Delivery Banner
            SliverToBoxAdapter(child: _buildEnvelopeHeroBanner()),

            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // Circular Real Food Categories from Database
            SliverToBoxAdapter(child: _buildCircularFoodCategoriesList()),

            const SliverToBoxAdapter(child: SizedBox(height: 14)),

            // Filters Row
            SliverToBoxAdapter(child: _buildFiltersRow()),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // RECOMMENDED WITH DEALS Section (Real Foods with Discounts/Offers)
            if (_backendFoods.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Text(
                    'RECOMMENDED WITH DEALS',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 14)),
              SliverToBoxAdapter(child: _buildDealsHorizontalSection()),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],

            // POPULAR FOOD ITEMS with Add to Cart & Order buttons
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'POPULAR FOOD ITEMS (${_filteredFoods.length})',
                      style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold, letterSpacing: 1.2, fontSize: 13),
                    ),
                    Text(
                      'Quick Order',
                      style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 14)),

            SliverToBoxAdapter(
              child: _buildPopularFoodItemsCarousel(),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 32)),

            // Real Restaurants Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  'ALL RESTAURANTS NEAR YOU (${_backendRestaurants.length})',
                  style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold, letterSpacing: 1.2, fontSize: 13),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            if (_isLoadingBackend)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Center(
                    child: Column(
                      children: [
                        CircularProgressIndicator(color: jdkartOrange),
                        const SizedBox(height: 12),
                        const Text('Loading fresh menu from server...', style: TextStyle(color: Colors.grey, fontSize: 13)),
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
                        )
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
                  Text(_currentAddress, style: TextStyle(color: Colors.grey[600], fontSize: 12.5), overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: widget.onProfileTap,
            child: CircleAvatar(
              backgroundColor: jdkartOrange,
              radius: 19,
              child: const Icon(Icons.person, color: Colors.white, size: 21),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBarContainer() {
    final double statusBarHeight = MediaQuery.of(context).padding.top;
    return Container(
      color: Colors.white,
      padding: EdgeInsets.only(top: statusBarHeight + 6, bottom: 8),
      child: _buildSearchBar(),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen()));
              },
              child: Container(
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey[200]!),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
                  ],
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 14),
                    Icon(Icons.search, color: coralRed, size: 26),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Search food, dishes, restaurants...',
                        style: TextStyle(color: Colors.grey[400], fontSize: 14, fontWeight: FontWeight.w500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          // VEG MODE Toggle
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('VEG\nMODE', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 8.5, letterSpacing: 0.5)),
              SizedBox(
                height: 22,
                child: Switch(
                  value: isVegMode,
                  onChanged: (v) => setState(() => isVegMode = v),
                  activeColor: Colors.green,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildEnvelopeHeroBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Container(
        height: 175,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Left Rider Scooter Badge
            Positioned(
              left: 14,
              bottom: 24,
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDE68A).withOpacity(0.9),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFD97706).withOpacity(0.3)),
                ),
                child: const Icon(Icons.two_wheeler_rounded, size: 24, color: Color(0xFF78350F)),
              ),
            ),

            // Right Rider Scooter Badge
            Positioned(
              right: 14,
              top: 20,
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDE68A).withOpacity(0.9),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFD97706).withOpacity(0.3)),
                ),
                child: const Icon(Icons.delivery_dining_rounded, size: 24, color: Color(0xFF78350F)),
              ),
            ),

            // Center Envelope Card
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 36, vertical: 12),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF9C3),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFDE68A), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFD97706).withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'FREE DELIVERY',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 22,
                      color: Color(0xFF78350F),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
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
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFF59E0B), width: 1.2),
                    ),
                    child: const Text(
                      'JDKart Super Fast Delivery >',
                      style: TextStyle(
                        color: Color(0xFFFDE68A),
                        fontWeight: FontWeight.bold,
                        fontSize: 11.5,
                      ),
                    ),
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Circular Food Categories from Database
  Widget _buildCircularFoodCategoriesList() {
    if (_backendCategories.isEmpty && !_isLoadingBackend) {
      return const SizedBox.shrink();
    }

    final totalCount = _backendCategories.length + 1; // 1 for "All"

    return Column(
      children: [
        SizedBox(
          height: 104,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: totalCount,
            physics: const BouncingScrollPhysics(),
            itemBuilder: (context, index) {
              final bool isAll = index == 0;
              final bool isSelected = index == _selectedCategoryIndex;
              final String name = isAll ? 'All' : _backendCategories[index - 1].name;
              final String icon = isAll ? '🍽️' : _backendCategories[index - 1].icon;
              final String catImage = isAll ? '' : _backendCategories[index - 1].image;

              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedCategoryIndex = index;
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.only(right: 18),
                  child: Column(
                    children: [
                      Container(
                        width: 62,
                        height: 62,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected ? const Color(0xFFFFF7ED) : const Color(0xFFF8FAFC),
                          border: Border.all(
                            color: isSelected ? jdkartOrange : const Color(0xFFE2E8F0),
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 6,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: catImage.isNotEmpty
                              ? SafeImage(
                                  image: catImage,
                                  width: 62,
                                  height: 62,
                                  fit: BoxFit.cover,
                                )
                              : Center(
                                  child: Text(
                                    icon.isNotEmpty ? icon : '🍲',
                                    style: const TextStyle(fontSize: 26),
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 68,
                        child: Text(
                          name,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                            fontSize: 12,
                            color: isSelected ? Colors.black : Colors.black87,
                          ),
                        ),
                      ),
                      const SizedBox(height: 3),
                      if (isSelected)
                        Container(
                          height: 3,
                          width: 24,
                          decoration: BoxDecoration(
                            color: coralRed,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        )
                      else
                        const SizedBox(height: 3),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16.0),
          child: Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
        ),
      ],
    );
  }

  Widget _buildFiltersRow() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CategoriesScreen()));
            },
            child: _buildFilterChip(Icons.tune, 'All Categories', hasDropdown: false),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategoryIndex = 0;
                isVegMode = false;
              });
            },
            child: _buildFilterChip(Icons.restart_alt, 'Reset'),
          ),
          const SizedBox(width: 8),
          _buildFilterChip(Icons.bolt, 'Fast Delivery'),
        ],
      ),
    );
  }

  Widget _buildFilterChip(IconData? icon, String label, {bool hasDropdown = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))],
      ),
      child: Row(
        children: [
          if (icon != null) ...[Icon(icon, size: 16, color: Colors.black87), const SizedBox(width: 6)],
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.black87)),
          if (hasDropdown) ...[const SizedBox(width: 4), const Icon(Icons.arrow_drop_down, size: 18, color: Colors.black54)],
        ],
      ),
    );
  }

  // Real Deals Section using live backend foods with discounted price or high rating
  Widget _buildDealsHorizontalSection() {
    final dealsList = _backendFoods.take(8).toList();

    return SizedBox(
      height: 185,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        physics: const BouncingScrollPhysics(),
        itemCount: dealsList.length,
        itemBuilder: (context, index) {
          final dish = dealsList[index];
          final discountText = dish.discountedPrice != null
              ? 'SAVE ₹${dish.price - dish.discountedPrice!}'
              : 'SPECIAL';

          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: dish)),
              );
            },
            child: Container(
              width: 155,
              margin: const EdgeInsets.only(right: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 115,
                    width: 155,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 6,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        SafeImage(
                          image: dish.image,
                          width: 155,
                          height: 115,
                          borderRadius: BorderRadius.circular(14),
                          fit: BoxFit.cover,
                        ),
                        // Top Translucent Offer Ribbon
                        Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.68),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                            ),
                            child: Text(
                              discountText,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        // Bottom Left Green Rating Badge
                        Positioned(
                          bottom: 6,
                          left: 6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF267E3E),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, color: Colors.white, size: 10),
                                const SizedBox(width: 2),
                                Text(
                                  dish.rating.toStringAsFixed(1),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    dish.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black87),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '₹${dish.discountedPrice ?? dish.price}',
                    style: TextStyle(color: jdkartOrange, fontSize: 13, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // Horizontal Food Items Carousel with REAL FOOD PHOTOS & LIVE DATA
  Widget _buildPopularFoodItemsCarousel() {
    final list = _filteredFoods;

    if (list.isEmpty) {
      return Container(
        height: 120,
        alignment: Alignment.center,
        child: Text(
          isVegMode ? 'No pure veg items in this category' : 'No food items found',
          style: TextStyle(color: Colors.grey[500], fontSize: 14),
        ),
      );
    }

    return SizedBox(
      height: 235,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: list.length,
        itemBuilder: (context, index) {
          final dish = list[index];
          final price = dish.discountedPrice ?? dish.price;

          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: dish)),
              );
            },
            child: Container(
              width: 175,
              margin: const EdgeInsets.only(right: 14, bottom: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[200]!),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Dish Photo Container with Veg/Non-Veg Badge
                  Stack(
                    children: [
                      SafeImage(
                        image: dish.image,
                        height: 90,
                        width: double.infinity,
                        borderRadius: BorderRadius.circular(12),
                        fit: BoxFit.cover,
                      ),
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(3),
                            border: Border.all(color: dish.isVeg ? Colors.green : Colors.red, width: 1.5),
                          ),
                          child: Center(
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: dish.isVeg ? Colors.green : Colors.red,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    dish.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '₹$price',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Color(0xFFF59E0B), size: 12),
                          const SizedBox(width: 2),
                          Text(
                            dish.rating.toStringAsFixed(1),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 28,
                          child: OutlinedButton(
                            onPressed: () => _addFoodToCart(dish),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: jdkartOrange, width: 1.2),
                              padding: EdgeInsets.zero,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                            child: Text(
                              '+ Add',
                              style: TextStyle(color: jdkartOrange, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: SizedBox(
                          height: 28,
                          child: ElevatedButton(
                            onPressed: () => _orderFoodNow(dish),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: jdkartOrange,
                              foregroundColor: Colors.white,
                              padding: EdgeInsets.zero,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                            child: const Text(
                              'Order',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // Real Restaurant Cards from Database
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
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Restaurant Image Container
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

                      // Dark gradient overlay for bottom text contrast
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Colors.black.withOpacity(0.35), Colors.transparent, Colors.black.withOpacity(0.7)],
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
                            color: Colors.black.withOpacity(0.65),
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
                              color: Colors.white.withOpacity(0.9),
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

                      // Bottom-right: Time Pill
                      Positioned(
                        bottom: 10,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)],
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

                  // Restaurant Info Section
                  Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Row 1: Restaurant Name & Green Rating Badge
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

                        // Row 2: Address & Min Order
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

                        // Row 3: Safety / Hygiene
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

                        // Row 4: Action Buttons
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

class _StickySearchBarDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double height;

  _StickySearchBarDelegate({required this.child, required this.height});

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return child;
  }

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  bool shouldRebuild(covariant _StickySearchBarDelegate oldDelegate) {
    return oldDelegate.height != height || oldDelegate.child != child;
  }
}
