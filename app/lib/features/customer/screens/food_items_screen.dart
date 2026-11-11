import 'package:flutter/material.dart';
import 'product_details_screen.dart';
import 'cart_screen.dart';
import 'checkout_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/cart_service.dart';
import '../../../models/product_model.dart';
import '../../../models/category_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/utils/cart_actions.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';

class FoodItemsScreen extends StatefulWidget {
  final String? initialCategory;
  const FoodItemsScreen({Key? key, this.initialCategory}) : super(key: key);

  @override
  State<FoodItemsScreen> createState() => _FoodItemsScreenState();
}

class _FoodItemsScreenState extends State<FoodItemsScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);
  final Color jdkartOrangeDark = const Color(0xFFC2410C);
  final Color jdkartPeach = const Color(0xFFFFF7ED);
  final Color coralRed = const Color(0xFFE11D48);

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  int _selectedCategoryIndex = 0; // 0 = All
  bool _isVegOnly = false;
  String _sortBy = 'popular'; // 'popular', 'rating', 'price_low', 'price_high'

  List<FoodItemModel> _allFoods = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = true;
  String? _error;
  bool _cartBarDismissed = false;

  @override
  void initState() {
    super.initState();
    _fetchFoodData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchFoodData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        RestaurantService.instance.getFoods(),
        RestaurantService.instance.getCategories(),
      ]);

      if (mounted) {
        setState(() {
          _allFoods = results[0] as List<FoodItemModel>;
          _categories = results[1] as List<CategoryModel>;
          _isLoading = false;

          // If initialCategory was passed, select it
          if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
            final idx = _categories.indexWhere(
              (c) => c.name.toLowerCase() == widget.initialCategory!.toLowerCase(),
            );
            if (idx >= 0) {
              _selectedCategoryIndex = idx + 1;
            }
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException
              ? e.message
              : 'Could not load foods. Please check your connection and try again.';
          _isLoading = false;
        });
      }
    }
  }

  List<FoodItemModel> get _filteredFoods {
    List<FoodItemModel> list = _allFoods;

    // Filter by Veg only
    if (_isVegOnly) {
      list = list.where((f) => f.isVeg).toList();
    }

    // Filter by Category
    if (_selectedCategoryIndex > 0 && _selectedCategoryIndex <= _categories.length) {
      final selectedCat = _categories[_selectedCategoryIndex - 1].name.toLowerCase();
      list = list.where((f) {
        final cat = f.category.toLowerCase();
        return cat.contains(selectedCat) || selectedCat.contains(cat);
      }).toList();
    }

    // Filter by Search Query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((f) {
        return f.name.toLowerCase().contains(q) ||
            f.description.toLowerCase().contains(q) ||
            f.category.toLowerCase().contains(q) ||
            f.restaurantName.toLowerCase().contains(q);
      }).toList();
    }

    // Sort
    switch (_sortBy) {
      case 'rating':
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case 'price_low':
        list.sort((a, b) {
          final pA = a.discountedPrice ?? a.price;
          final pB = b.discountedPrice ?? b.price;
          return pA.compareTo(pB);
        });
        break;
      case 'price_high':
        list.sort((a, b) {
          final pA = a.discountedPrice ?? a.price;
          final pB = b.discountedPrice ?? b.price;
          return pB.compareTo(pA);
        });
        break;
      default:
        // 'popular' - default order
        break;
    }

    return list;
  }

  Future<void> _addFoodToCart(FoodItemModel dish) async {
    final restId = dish.restaurantId;
    final restName = dish.restaurantName.isNotEmpty ? dish.restaurantName : 'JDKart Restaurant';
    if (restId.isEmpty) {
      _showUnavailable();
      return;
    }

    _cartBarDismissed = false;
    if (!await addToCart(context, dish, vendorId: restId, vendorName: restName)) return;
    if (!mounted) return;

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

  Future<void> _orderFoodNow(FoodItemModel dish) async {
    final restId = dish.restaurantId;
    final restName = dish.restaurantName.isNotEmpty ? dish.restaurantName : 'JDKart Restaurant';
    if (restId.isEmpty) {
      _showUnavailable();
      return;
    }

    _cartBarDismissed = false;
    if (!await addToCart(context, dish, vendorId: restId, vendorName: restName)) return;
    if (!mounted) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen()));
  }

  void _showUnavailable() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('This item is not available from a restaurant right now.'),
        backgroundColor: Colors.redAccent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _filteredFoods;
    final screenWidth = MediaQuery.of(context).size.width;
    final int crossAxisCount = screenWidth >= 600 ? (screenWidth >= 900 ? 4 : 3) : 2;
    final double childAspectRatio = screenWidth < 360 ? 0.58 : (screenWidth >= 600 ? 0.68 : 0.62);
    final dealsList = _allFoods.where((f) => (f.discountedPrice != null && f.discountedPrice! < f.price) || f.isFeatured).take(8).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Food Items & Dishes',
              style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w900, fontSize: 18),
            ),
            Text(
              'Order fresh dishes near you',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
        ),
        actions: [
          AnimatedBuilder(
            animation: CartService.instance,
            builder: (context, _) {
              final count = CartService.instance.totalItems;
              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_bag_outlined, color: Colors.black87),
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
                    },
                  ),
                  if (count > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF97316),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '$count',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: jdkartOrange),
                  const SizedBox(height: 14),
                  const Text('Loading delicious menu...', style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          : _error != null && _allFoods.isEmpty
              ? AppErrorState(message: _error!, onRetry: _fetchFoodData)
              : RefreshIndicator(
                  onRefresh: _fetchFoodData,
                  color: jdkartOrange,
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    slivers: [
                      // 1. Search Box & Veg Mode Bar
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                          child: Row(
                            children: [
                              // Search TextField
                              Expanded(
                                child: Container(
                                  height: 46,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: (val) {
                                      setState(() {
                                        _searchQuery = val;
                                      });
                                    },
                                    decoration: InputDecoration(
                                      prefixIcon: const Icon(Icons.search, color: Colors.grey, size: 22),
                                      suffixIcon: _searchQuery.isNotEmpty
                                          ? IconButton(
                                              icon: const Icon(Icons.clear, size: 18, color: Colors.grey),
                                              onPressed: () {
                                                _searchController.clear();
                                                setState(() {
                                                  _searchQuery = '';
                                                });
                                              },
                                            )
                                          : null,
                                      hintText: 'Search biryani, pizza, burger...',
                                      hintStyle: TextStyle(color: Colors.grey[500], fontSize: 13.5),
                                      border: InputBorder.none,
                                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Veg Mode Switch Pill
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _isVegOnly = !_isVegOnly;
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: _isVegOnly ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: _isVegOnly ? const Color(0xFF16A34A) : Colors.transparent,
                                      width: 1.2,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 10,
                                        height: 10,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: _isVegOnly ? const Color(0xFF16A34A) : Colors.grey[500],
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'VEG',
                                        style: TextStyle(
                                          color: _isVegOnly ? const Color(0xFF15803D) : Colors.black87,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 11.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // 2. Circular Food Categories
                      if (_categories.isNotEmpty)
                        SliverToBoxAdapter(
                          child: _buildCategoriesHorizontal(),
                        ),

                      const SliverToBoxAdapter(child: SizedBox(height: 12)),

                      // 3. Quick Filter Chips
                      SliverToBoxAdapter(
                        child: _buildFiltersHorizontal(),
                      ),

                      const SliverToBoxAdapter(child: SizedBox(height: 16)),

                      // 4. RECOMMENDED DEALS (if applicable and search is empty)
                      if (_searchQuery.isEmpty && dealsList.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'RECOMMENDED WITH DEALS',
                                  style: TextStyle(
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    fontSize: 12.5,
                                  ),
                                ),
                                Text(
                                  'Special Offers',
                                  style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 12)),
                        SliverToBoxAdapter(child: _buildDealsSection(dealsList)),
                        const SliverToBoxAdapter(child: SizedBox(height: 24)),
                      ],

                      // 5. Header: ALL DISHES (Count)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'ALL DISHES (${items.length})',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Colors.black87),
                              ),
                              PopupMenuButton<String>(
                                initialValue: _sortBy,
                                onSelected: (val) {
                                  setState(() {
                                    _sortBy = val;
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey[300]!),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.sort, size: 16, color: Colors.black87),
                                      const SizedBox(width: 4),
                                      Text(
                                        _sortBy == 'rating'
                                            ? 'Top Rated'
                                            : _sortBy == 'price_low'
                                                ? 'Price: Low'
                                                : _sortBy == 'price_high'
                                                    ? 'Price: High'
                                                    : 'Popular',
                                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                                itemBuilder: (context) => const [
                                  PopupMenuItem(value: 'popular', child: Text('Most Popular')),
                                  PopupMenuItem(value: 'rating', child: Text('Top Rated')),
                                  PopupMenuItem(value: 'price_low', child: Text('Price: Low to High')),
                                  PopupMenuItem(value: 'price_high', child: Text('Price: High to Low')),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SliverToBoxAdapter(child: SizedBox(height: 12)),

                      // 6. Grid of Food Items
                      if (items.isEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(Icons.search_off_rounded, size: 54, color: Colors.grey[400]),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No food items match your criteria',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Try resetting the search or category filter',
                                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                  ),
                                  const SizedBox(height: 14),
                                  ElevatedButton(
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {
                                        _searchQuery = '';
                                        _selectedCategoryIndex = 0;
                                        _isVegOnly = false;
                                      });
                                    },
                                    style: ElevatedButton.styleFrom(backgroundColor: jdkartOrange),
                                    child: const Text('Reset All Filters', style: TextStyle(color: Colors.white)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverGrid(
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: crossAxisCount,
                              childAspectRatio: childAspectRatio,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 14,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final dish = items[index];
                                return _buildFoodCard(dish);
                              },
                              childCount: items.length,
                            ),
                          ),
                        ),

                      // Bottom Spacing
                      const SliverToBoxAdapter(child: SizedBox(height: 100)),
                    ],
                  ),
                ),
      bottomNavigationBar: AnimatedBuilder(
        animation: CartService.instance,
        builder: (context, _) {
          final count = CartService.instance.totalItems;
          final totalPrice = CartService.instance.totalPrice;
          if (count == 0 || _cartBarDismissed) return const SizedBox.shrink();

          return SafeArea(
            child: Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: jdkartOrange,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: jdkartOrange.withValues(alpha: 0.35), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$count ${count == 1 ? "ITEM" : "ITEMS"} IN CART',
                        style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '₹$totalPrice',
                        style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: jdkartOrange,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('View Cart', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 16),
                      ],
                    ),
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => setState(() => _cartBarDismissed = true),
                    behavior: HitTestBehavior.opaque,
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(Icons.close, color: Colors.white70, size: 20),
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

  Widget _buildCategoriesHorizontal() {
    final totalCount = _categories.length + 1; // 1 for "All"

    return SizedBox(
      height: 98,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: totalCount,
        physics: const BouncingScrollPhysics(),
        itemBuilder: (context, index) {
          final bool isAll = index == 0;
          final bool isSelected = index == _selectedCategoryIndex;
          final String name = isAll ? 'All' : _categories[index - 1].name;
          final String icon = isAll ? '🍽️' : _categories[index - 1].icon;
          final String catImage = isAll ? '' : _categories[index - 1].image;

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategoryIndex = index;
              });
            },
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Column(
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected ? const Color(0xFFFFF7ED) : const Color(0xFFF8FAFC),
                      border: Border.all(
                        color: isSelected ? jdkartOrange : const Color(0xFFE2E8F0),
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ClipOval(
                      child: catImage.isNotEmpty
                          ? SafeImage(
                              image: catImage,
                              width: 58,
                              height: 58,
                              fit: BoxFit.cover,
                            )
                          : Center(
                              child: Text(
                                icon.isNotEmpty ? icon : '🍲',
                                style: const TextStyle(fontSize: 24),
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: 62,
                    child: Text(
                      name,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                        fontSize: 11.5,
                        color: isSelected ? jdkartOrange : Colors.black87,
                      ),
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

  Widget _buildFiltersHorizontal() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategoryIndex = 0;
                _isVegOnly = false;
                _searchController.clear();
                _searchQuery = '';
                _sortBy = 'popular';
              });
            },
            child: _buildFilterChip(Icons.restart_alt, 'Reset Filters'),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _sortBy = 'rating';
              });
            },
            child: _buildFilterChip(
              Icons.star,
              'Top Rated',
              isActive: _sortBy == 'rating',
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _sortBy = 'price_low';
              });
            },
            child: _buildFilterChip(
              Icons.arrow_downward,
              'Price: Low to High',
              isActive: _sortBy == 'price_low',
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() => _sortBy = 'price_high');
            },
            child: _buildFilterChip(
              Icons.arrow_upward,
              'Price: High to Low',
              isActive: _sortBy == 'price_high',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(IconData? icon, String label, {bool isActive = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFFFFF7ED) : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isActive ? jdkartOrange : Colors.grey[300]!),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))],
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: isActive ? jdkartOrange : Colors.black87),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: isActive ? jdkartOrange : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDealsSection(List<FoodItemModel> dealsList) {
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
                          color: Colors.black.withValues(alpha: 0.06),
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
                        Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.68),
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
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Colors.black87),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '₹${dish.discountedPrice ?? dish.price}',
                        style: TextStyle(color: jdkartOrange, fontSize: 13, fontWeight: FontWeight.w900),
                      ),
                      GestureDetector(
                        onTap: () => _addFoodToCart(dish),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: jdkartOrange, width: 1),
                          ),
                          child: Text(
                            '+ ADD',
                            style: TextStyle(color: jdkartOrange, fontSize: 10, fontWeight: FontWeight.bold),
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

  Widget _buildFoodCard(FoodItemModel dish) {
    final price = dish.discountedPrice ?? dish.price;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: dish)),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
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
            // Dish Photo Container with Veg/Non-Veg Badge & Rating
            Stack(
              children: [
                SafeImage(
                  image: dish.image,
                  height: 100,
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
                Positioned(
                  bottom: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star, color: Color(0xFFFBBF24), size: 10),
                        const SizedBox(width: 2),
                        Text(
                          dish.rating.toStringAsFixed(1),
                          style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
                        ),
                      ],
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
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 2),
            Text(
              dish.restaurantName.isNotEmpty ? dish.restaurantName : dish.category,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Text(
                  '₹$price',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: jdkartOrangeDark),
                ),
                if (dish.discountedPrice != null) ...[
                  const SizedBox(width: 5),
                  Text(
                    '₹${dish.price}',
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 11.5,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ],
              ],
            ),
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 30,
                    child: OutlinedButton(
                      onPressed: () => _addFoodToCart(dish),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: jdkartOrange, width: 1.2),
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      ),
                      child: Text(
                        '+ Add',
                        style: TextStyle(color: jdkartOrange, fontSize: 11.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: SizedBox(
                    height: 30,
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
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
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
  }
}
