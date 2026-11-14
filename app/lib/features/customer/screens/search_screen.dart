import 'package:flutter/material.dart';
import 'restaurant_details_screen.dart';
import 'product_details_screen.dart';
import 'main_layout.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/store_service.dart';
import '../../../services/location_service.dart';
import '../../../models/product_model.dart';
import '../../../models/restaurant_model.dart';
import '../../../models/category_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';
import '../../../core/utils/format.dart';
import '../../../core/network/api_client.dart';

class SearchScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final bool autofocus;
  const SearchScreen({Key? key, this.onBack, this.autofocus = true}) : super(key: key);

  @override
  _SearchScreenState createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Color jdkartOrange = const Color(0xFFF97316);

  List<FoodItemModel> _allFoods = [];
  List<RestaurantModel> _allRestaurants = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSearchData();
  }

  Future<void> _loadSearchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await LocationService.instance.init();
      final lat = LocationService.instance.activeLat;
      final lng = LocationService.instance.activeLng;
      final productsFuture = StoreService.instance
          .getProducts()
          .catchError((_) => <FoodItemModel>[]);
      final nearbyFuture = lat != null && lng != null
          ? StoreService.instance
              .getStores(lat: lat, lng: lng)
              .then<Set<String>?>((s) => s.map((e) => e.id).toSet())
              .catchError((_) => <String>{})
          : Future<Set<String>?>.value(null);
      final results = await Future.wait([
        RestaurantService.instance.getFoods(lat: lat, lng: lng),
        RestaurantService.instance.getRestaurants(lat: lat, lng: lng),
        RestaurantService.instance.getCategories(),
      ]);
      final products = await productsFuture;
      final nearbyStoreIds = await nearbyFuture;
      if (mounted) {
        setState(() {
          _allFoods = [
            ...results[0] as List<FoodItemModel>,
            ...products.where((p) =>
                nearbyStoreIds == null || nearbyStoreIds.contains(p.restaurantId)),
          ];
          _allRestaurants = results[1] as List<RestaurantModel>;
          _categories = results[2] as List<CategoryModel>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load search results. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<FoodItemModel> get _matchingFoods {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return [];
    return _allFoods.where((f) =>
      f.name.toLowerCase().contains(query) ||
      f.category.toLowerCase().contains(query) ||
      f.restaurantName.toLowerCase().contains(query)
    ).toList();
  }

  List<RestaurantModel> get _matchingRestaurants {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return [];
    return _allRestaurants.where((r) =>
      r.name.toLowerCase().contains(query) ||
      r.address.toLowerCase().contains(query) ||
      r.cuisine.any((c) => c.toLowerCase().contains(query))
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    final hasQuery = _searchController.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const MainLayout()),
              );
            }
          },
        ),
        title: Container(
          height: 46,
          margin: const EdgeInsets.only(right: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: _searchController,
            autofocus: widget.autofocus,
            decoration: InputDecoration(
              hintText: 'Search food, groceries, restaurants...',
              hintStyle: TextStyle(color: Colors.grey[500], fontSize: 14),
              prefixIcon: Icon(Icons.search_rounded, color: jdkartOrange, size: 22),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, color: Colors.grey, size: 18),
                      onPressed: () {
                        setState(() {
                          _searchController.clear();
                        });
                      },
                    )
                  : null,
            ),
            onChanged: (val) => setState(() {}),
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh_rounded, color: Colors.black54),
            onPressed: () { ApiClient.instance.clearCache(); _loadSearchData(); },
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: jdkartOrange))
          : _error != null &&
                  _allFoods.isEmpty &&
                  _allRestaurants.isEmpty &&
                  _categories.isEmpty
              ? AppErrorState(message: _error!, onRetry: () { ApiClient.instance.clearCache(); _loadSearchData(); })
              : hasQuery
                  ? _buildSearchResults()
                  : _buildDefaultSuggestions(),
    );
  }

  Widget _buildSearchResults() {
    final foods = _matchingFoods;
    final rests = _matchingRestaurants;

    if (foods.isEmpty && rests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off_rounded, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              'No items matching "${_searchController.text}"',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 6),
            Text('Try searching for Biryani, Pizza, Rice, or Milk', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (rests.isNotEmpty) ...[
          const Text('Restaurants', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 10),
          ...rests.map((r) => ListTile(
                tileColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                contentPadding: const EdgeInsets.all(10),
                leading: SafeImage(
                  image: r.image,
                  width: 50,
                  height: 50,
                  borderRadius: BorderRadius.circular(8),
                  fit: BoxFit.cover,
                  placeholderIcon: Icons.restaurant_rounded,
                ),
                title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(r.address.isNotEmpty ? r.address : r.deliveryTime, maxLines: 1),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RestaurantDetailsScreen(
                        restaurantId: r.id,
                        restaurantName: r.name,
                        restaurantImage: r.image,
                        restaurantDeliveryTime: r.deliveryTime,
                      ),
                    ),
                  );
                },
              )),
          const SizedBox(height: 20),
        ],

        if (foods.isNotEmpty) ...[
          Text('Items (${foods.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 10),
          ...foods.map((dish) {
            final price = dish.discountedPrice ?? dish.price;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.all(10),
                leading: SafeImage(
                  image: dish.image,
                  width: 54,
                  height: 54,
                  borderRadius: BorderRadius.circular(8),
                  fit: BoxFit.cover,
                ),
                title: Text(dish.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(
                  '${dish.restaurantName.isNotEmpty ? dish.restaurantName : "JDKart"} • ${formatPrice(price)}',
                  style: TextStyle(color: Colors.grey[700], fontSize: 13),
                ),
                trailing: Text(
                  formatPrice(price),
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: jdkartOrange),
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: dish)),
                  );
                },
              ),
            );
          }),
        ],
      ],
    );
  }

  Widget _buildDefaultSuggestions() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Explore Categories', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _categories.take(12).map((c) {
            return ActionChip(
              backgroundColor: Colors.white,
              side: const BorderSide(color: Color(0xFFE2E8F0)),
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(c.icon.isNotEmpty ? c.icon : '🍲', style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 6),
                  Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ],
              ),
              onPressed: () {
                _searchController.text = c.name;
                setState(() {});
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 24),

        if (_allFoods.isNotEmpty) ...[
          const Text('Popular Dishes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          ..._allFoods.take(6).map((dish) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                leading: SafeImage(
                  image: dish.image,
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius.circular(8),
                  fit: BoxFit.cover,
                ),
                title: Text(dish.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: Text(
                  formatPrice(dish.discountedPrice ?? dish.price),
                  style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.w900),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: dish)),
                  );
                },
              ),
            );
          }),
        ],
      ],
    );
  }
}
