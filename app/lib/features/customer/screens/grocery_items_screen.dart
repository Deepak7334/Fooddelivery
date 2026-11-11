import 'package:flutter/material.dart';
import 'product_details_screen.dart';
import 'restaurant_details_screen.dart';
import 'cart_screen.dart';
import 'checkout_screen.dart';
import 'food_items_screen.dart';
import '../../../services/store_service.dart';
import '../../../services/cart_service.dart';
import '../../../models/product_model.dart';
import '../../../models/restaurant_model.dart';
import '../../../models/category_model.dart';
import '../../../core/widgets/safe_image.dart';

class GroceryItemsScreen extends StatefulWidget {
  final String? initialCategory;
  const GroceryItemsScreen({Key? key, this.initialCategory}) : super(key: key);

  @override
  State<GroceryItemsScreen> createState() => _GroceryItemsScreenState();
}

class _GroceryItemsScreenState extends State<GroceryItemsScreen> {
  // JDKart.in Brand Colors
  final Color jdkartOrange = const Color(0xFFF97316);
  final Color jdkartOrangeDark = const Color(0xFFC2410C);
  final Color jdkartPeach = const Color(0xFFFFF7ED);
  final Color greenPrimary = const Color(0xFF16A34A);
  final Color greenDark = const Color(0xFF15803D);

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  int _selectedCategoryIndex = 0; // 0 = All
  String _filterType = 'all'; // 'all', 'under99', 'discounted'

  List<FoodItemModel> _backendProducts = [];
  List<RestaurantModel> _backendStores = [];
  List<CategoryModel> _storeCategories = [];
  bool _isLoading = true;
  String? _errorMessage;
  bool _cartBarDismissed = false;

  @override
  void initState() {
    super.initState();
    _fetchStoreData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchStoreData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        StoreService.instance.getProducts(),
        StoreService.instance.getStores(),
        StoreService.instance.getStoreTypes(),
      ]);

      if (mounted) {
        final products = results[0] as List<FoodItemModel>;
        final stores = results[1] as List<RestaurantModel>;
        final types = results[2] as List<CategoryModel>;

        // Build categories dynamically from backend types and product categories
        final List<CategoryModel> categories = [
          CategoryModel(id: 'all', name: 'All Grocery', icon: '🛒'),
        ];

        if (types.isNotEmpty) {
          categories.addAll(types);
        } else {
          // If types endpoint is empty, extract unique categories from products
          final productCategories = products
              .map((p) => p.category.trim())
              .where((c) => c.isNotEmpty)
              .toSet();

          for (final cat in productCategories) {
            categories.add(CategoryModel(
              id: cat.toLowerCase().replaceAll(' ', '_'),
              name: cat,
              icon: _getCategoryIcon(cat),
            ));
          }

          if (categories.length == 1) {
            // Default store catalog categories
            categories.addAll([
              CategoryModel(id: 'fruits_veg', name: 'Fruits & Veggies', icon: '🥦'),
              CategoryModel(id: 'dairy', name: 'Dairy & Milk', icon: '🥛'),
              CategoryModel(id: 'snacks', name: 'Snacks & Drinks', icon: '🍿'),
              CategoryModel(id: 'staples', name: 'Atta, Rice & Dal', icon: '🌾'),
              CategoryModel(id: 'oils', name: 'Cooking Essentials', icon: '🛢️'),
              CategoryModel(id: 'bakery', name: 'Bakery & Bread', icon: '🍞'),
              CategoryModel(id: 'cleaning', name: 'Home Care', icon: '🧼'),
            ]);
          }
        }

        setState(() {
          _backendProducts = products;
          _backendStores = stores;
          _storeCategories = categories;
          _isLoading = false;

          if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
            final idx = _storeCategories.indexWhere(
              (c) => c.name.toLowerCase().contains(widget.initialCategory!.toLowerCase()),
            );
            if (idx >= 0) {
              _selectedCategoryIndex = idx;
            }
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not load grocery catalog. Please check your connection.';
        });
      }
    }
  }

  String _getCategoryIcon(String category) {
    final c = category.toLowerCase();
    if (c.contains('fruit') || c.contains('veg')) return '🥦';
    if (c.contains('milk') || c.contains('dairy')) return '🥛';
    if (c.contains('snack') || c.contains('chip')) return '🍿';
    if (c.contains('atta') || c.contains('rice') || c.contains('dal')) return '🌾';
    if (c.contains('oil') || c.contains('ghee')) return '🛢️';
    if (c.contains('masala') || c.contains('spice')) return '🌶️';
    if (c.contains('bread') || c.contains('bakery')) return '🍞';
    if (c.contains('clean') || c.contains('care')) return '🧼';
    return '🛒';
  }

  List<FoodItemModel> get _filteredProducts {
    List<FoodItemModel> list = _backendProducts;

    // Filter by Category
    if (_selectedCategoryIndex > 0 && _selectedCategoryIndex < _storeCategories.length) {
      final selectedCat = _storeCategories[_selectedCategoryIndex].name.toLowerCase();
      list = list.where((f) {
        final itemCat = f.category.toLowerCase();
        return itemCat.contains(selectedCat) || selectedCat.contains(itemCat);
      }).toList();
    }

    // Filter by search query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((f) {
        return f.name.toLowerCase().contains(q) ||
            f.description.toLowerCase().contains(q) ||
            f.category.toLowerCase().contains(q) ||
            f.restaurantName.toLowerCase().contains(q);
      }).toList();
    }

    // Filter by price or discount chips
    if (_filterType == 'under99') {
      list = list.where((f) => (f.discountedPrice ?? f.price) <= 99).toList();
    } else if (_filterType == 'discounted') {
      list = list.where((f) => f.discountedPrice != null && f.discountedPrice! < f.price).toList();
    }

    return list;
  }

  void _addGroceryToCart(FoodItemModel dish) {
    final storeId = dish.restaurantId.isNotEmpty
        ? dish.restaurantId
        : (_backendStores.isNotEmpty ? _backendStores.first.id : '');
    final storeName = dish.restaurantName.isNotEmpty
        ? dish.restaurantName
        : (_backendStores.isNotEmpty ? _backendStores.first.name : 'JDKart Store');

    _cartBarDismissed = false;
    CartService.instance.addItem(dish, restaurantId: storeId, restaurantName: storeName);

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

  void _orderGroceryNow(FoodItemModel dish) {
    final storeId = dish.restaurantId.isNotEmpty
        ? dish.restaurantId
        : (_backendStores.isNotEmpty ? _backendStores.first.id : '');
    final storeName = dish.restaurantName.isNotEmpty
        ? dish.restaurantName
        : (_backendStores.isNotEmpty ? _backendStores.first.name : 'JDKart Store');

    _cartBarDismissed = false;
    CartService.instance.addItem(dish, restaurantId: storeId, restaurantName: storeName);
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final int crossAxisCount = screenWidth >= 600 ? (screenWidth >= 900 ? 4 : 3) : 2;
    // Responsive aspect ratio scaled based on width to prevent overflow
    final double childAspectRatio = screenWidth < 360 ? 0.58 : (screenWidth >= 600 ? 0.68 : 0.62);

    final items = _filteredProducts;
    final dealsList = _backendProducts.where((p) => p.discountedPrice != null && p.discountedPrice! < p.price).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF1E293B)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Grocery & Store',
                  style: TextStyle(
                    color: jdkartOrangeDark,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'JDKart',
                    style: TextStyle(color: greenDark, fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const Text(
              'Real stores & essentials delivered fast',
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
                    icon: const Icon(Icons.shopping_bag_outlined, color: Color(0xFF1E293B)),
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
                        decoration: BoxDecoration(
                          color: jdkartOrange,
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
                  const Text('Connecting to live JDKart stores...', style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _fetchStoreData,
              color: jdkartOrange,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  // 1. Search Box
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
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
                            prefixIcon: Icon(Icons.search, color: jdkartOrange, size: 22),
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
                            hintText: 'Search grocery items, staples, dairy...',
                            hintStyle: TextStyle(color: Colors.grey[500], fontSize: 13.5),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 2. Circular Categories (From Backend / Store Types)
                  if (_storeCategories.isNotEmpty)
                    SliverToBoxAdapter(
                      child: _buildCategoriesHorizontal(),
                    ),

                  const SliverToBoxAdapter(child: SizedBox(height: 12)),

                  // 3. Quick Filter Chips
                  SliverToBoxAdapter(
                    child: _buildFiltersHorizontal(),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: 16)),

                  // 4. REAL STORE DEALS (Only if backend has discounted products)
                  if (_searchQuery.isEmpty && dealsList.isNotEmpty) ...[
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'STORE OFFERS & DEALS',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                                fontSize: 12.5,
                              ),
                            ),
                            Text(
                              'Save More',
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

                  // 5. Section Header
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'GROCERY ITEMS (${items.length})',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF1E293B)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.bolt, color: greenDark, size: 14),
                                const SizedBox(width: 2),
                                Text(
                                  'Fast Delivery',
                                  style: TextStyle(color: greenDark, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: 12)),

                  // 6. Real Grid of Grocery Items OR Honest Clean Empty State
                  if (items.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 24),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: jdkartPeach,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.storefront_outlined, size: 54, color: jdkartOrange),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'No Grocery Items Listed Yet',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _searchQuery.isNotEmpty
                                    ? 'No products matched "$_searchQuery". Try clearing your search.'
                                    : 'Stores and supermarkets are currently onboarding in your area. You can order fresh meals from our partner restaurants in the meantime!',
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 13.5, height: 1.4),
                              ),
                              const SizedBox(height: 20),
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 12,
                                runSpacing: 8,
                                children: [
                                  if (_searchQuery.isNotEmpty || _selectedCategoryIndex > 0)
                                    OutlinedButton(
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() {
                                          _searchQuery = '';
                                          _selectedCategoryIndex = 0;
                                          _filterType = 'all';
                                        });
                                      },
                                      style: OutlinedButton.styleFrom(
                                        side: BorderSide(color: jdkartOrange),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      child: Text('Clear Filters', style: TextStyle(color: jdkartOrange)),
                                    ),
                                  ElevatedButton.icon(
                                    onPressed: () {
                                      Navigator.pushReplacement(
                                        context,
                                        MaterialPageRoute(builder: (_) => const FoodItemsScreen()),
                                      );
                                    },
                                    icon: const Icon(Icons.restaurant_menu, size: 18),
                                    label: const Text('Browse Food Dishes'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: jdkartOrange,
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                    ),
                                  ),
                                ],
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
                            final item = items[index];
                            return _buildGroceryCard(item);
                          },
                          childCount: items.length,
                        ),
                      ),
                    ),

                  const SliverToBoxAdapter(child: SizedBox(height: 28)),

                  // 7. REAL GROCERY STORES & SUPERMARKETS
                  if (_backendStores.isNotEmpty && _searchQuery.isEmpty) ...[
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Text(
                          'ALL STORES & SUPERMARKETS (${_backendStores.length})',
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 14)),
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      sliver: _buildGroceryStoresSliverList(),
                    ),
                  ],

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
    return SizedBox(
      height: 98,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _storeCategories.length,
        physics: const BouncingScrollPhysics(),
        itemBuilder: (context, index) {
          final bool isSelected = index == _selectedCategoryIndex;
          final cat = _storeCategories[index];

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
                      color: isSelected ? jdkartPeach : const Color(0xFFF8FAFC),
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
                    child: Center(
                      child: Text(
                        cat.icon.isNotEmpty ? cat.icon : '🛒',
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: 68,
                    child: Text(
                      cat.name,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                        fontSize: 11.5,
                        color: isSelected ? jdkartOrange : const Color(0xFF1E293B),
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
                _filterType = 'all';
                _searchController.clear();
                _searchQuery = '';
              });
            },
            child: _buildFilterChip(
              Icons.restart_alt,
              'All Items',
              isActive: _filterType == 'all' && _selectedCategoryIndex == 0,
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _filterType = _filterType == 'under99' ? 'all' : 'under99';
              });
            },
            child: _buildFilterChip(
              Icons.currency_rupee,
              'Under ₹99',
              isActive: _filterType == 'under99',
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _filterType = _filterType == 'discounted' ? 'all' : 'discounted';
              });
            },
            child: _buildFilterChip(
              Icons.discount_outlined,
              'With Offers',
              isActive: _filterType == 'discounted',
            ),
          ),
          const SizedBox(width: 8),
          _buildFilterChip(Icons.bolt, '15-Min Delivery'),
        ],
      ),
    );
  }

  Widget _buildFilterChip(IconData? icon, String label, {bool isActive = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: isActive ? jdkartPeach : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isActive ? jdkartOrange : Colors.grey[300]!),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))],
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: isActive ? jdkartOrange : const Color(0xFF1E293B)),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: isActive ? jdkartOrange : const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDealsSection(List<FoodItemModel> dealsList) {
    return SizedBox(
      height: 195,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        physics: const BouncingScrollPhysics(),
        itemCount: dealsList.length,
        itemBuilder: (context, index) {
          final item = dealsList[index];
          final discountText = 'SAVE ₹${item.price - item.discountedPrice!}';

          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: item)),
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
                          image: item.image,
                          width: 155,
                          height: 115,
                          borderRadius: BorderRadius.circular(14),
                          fit: BoxFit.cover,
                          placeholderIcon: Icons.shopping_basket_rounded,
                        ),
                        Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: jdkartOrange.withValues(alpha: 0.92),
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
                              color: Colors.black.withValues(alpha: 0.72),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, color: Color(0xFFFBBF24), size: 10),
                                const SizedBox(width: 2),
                                Text(
                                  item.rating.toStringAsFixed(1),
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
                    item.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            '₹${item.discountedPrice ?? item.price}',
                            style: TextStyle(color: jdkartOrange, fontSize: 13, fontWeight: FontWeight.w900),
                          ),
                          if (item.discountedPrice != null) ...[
                            const SizedBox(width: 4),
                            Text(
                              '₹${item.price}',
                              style: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 11,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ],
                      ),
                      GestureDetector(
                        onTap: () => _addGroceryToCart(item),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: jdkartPeach,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: jdkartOrange, width: 1),
                          ),
                          child: Text(
                            '+ ADD',
                            style: TextStyle(
                              color: jdkartOrange,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
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

  Widget _buildGroceryCard(FoodItemModel item) {
    final price = item.discountedPrice ?? item.price;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: item)),
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
            Stack(
              children: [
                SafeImage(
                  image: item.image,
                  height: 100,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(12),
                  fit: BoxFit.cover,
                  placeholderIcon: Icons.shopping_basket_rounded,
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: greenPrimary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'FRESH',
                      style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
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
                          item.rating.toStringAsFixed(1),
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
              item.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 2),
            Text(
              item.restaurantName.isNotEmpty ? item.restaurantName : item.category,
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
                if (item.discountedPrice != null && item.discountedPrice! < item.price) ...[
                  const SizedBox(width: 5),
                  Text(
                    '₹${item.price}',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11.5, decoration: TextDecoration.lineThrough),
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
                      onPressed: () => _addGroceryToCart(item),
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
                      onPressed: () => _orderGroceryNow(item),
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

  Widget _buildGroceryStoresSliverList() {
    final stores = _backendStores;

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final store = stores[index];
          final cuisines = store.cuisine.isNotEmpty ? store.cuisine.join(' • ') : 'Supermarket • Essentials';

          return GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => RestaurantDetailsScreen(
                  restaurantId: store.id,
                  restaurantName: store.name,
                  restaurantImage: store.image,
                  restaurantCuisine: cuisines,
                  restaurantRating: store.rating.toStringAsFixed(1),
                  restaurantDeliveryTime: store.deliveryTime,
                  restaurantDeliveryFee: '₹${store.deliveryFee}',
                ),
              ),
            ),
            child: Container(
              margin: const EdgeInsets.only(bottom: 16.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[200]!),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                    child: SafeImage(
                      image: store.image,
                      height: 100,
                      width: 100,
                      fit: BoxFit.cover,
                      placeholderIcon: Icons.store_rounded,
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  store.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF267E3E),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  children: [
                                    Text(
                                      store.rating.toStringAsFixed(1),
                                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(width: 2),
                                    const Icon(Icons.star, color: Colors.white, size: 10),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            store.address,
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.bolt, size: 14, color: jdkartOrange),
                              const SizedBox(width: 2),
                              Text(
                                store.deliveryTime,
                                style: TextStyle(color: jdkartOrangeDark, fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                              const Spacer(),
                              Text(
                                'Browse Store >',
                                style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.bold, fontSize: 11.5),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        childCount: stores.length,
      ),
    );
  }
}
