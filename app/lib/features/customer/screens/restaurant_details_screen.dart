import 'package:flutter/material.dart';
import 'table_booking_screen.dart';
import 'checkout_screen.dart';
import 'cart_screen.dart';
import 'product_details_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/cart_service.dart';
import '../../../models/product_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';

class RestaurantDetailsScreen extends StatefulWidget {
  final String? restaurantId;
  final String? restaurantName;
  final String? restaurantImage;
  final String? restaurantCuisine;
  final String? restaurantRating;
  final String? restaurantDeliveryTime;
  final String? restaurantDeliveryFee;

  const RestaurantDetailsScreen({
    Key? key,
    this.restaurantId,
    this.restaurantName,
    this.restaurantImage,
    this.restaurantCuisine,
    this.restaurantRating,
    this.restaurantDeliveryTime,
    this.restaurantDeliveryFee,
  }) : super(key: key);

  @override
  _RestaurantDetailsScreenState createState() => _RestaurantDetailsScreenState();
}

class _RestaurantDetailsScreenState extends State<RestaurantDetailsScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);
  bool _isLoadingMenu = true;
  String? _error;
  List<FoodItemModel> _menuItems = [];
  String _effectiveRestId = '';
  String _effectiveRestName = '';
  String _effectiveRestImage = '';
  String _effectiveRestCuisine = '';
  String _effectiveRestRating = '4.5';
  String _effectiveDeliveryTime = '20-30 min';
  String _effectiveDeliveryFee = '₹15';

  @override
  void initState() {
    super.initState();
    _effectiveRestId = widget.restaurantId ?? '';
    _effectiveRestName = widget.restaurantName ?? '';
    _effectiveRestImage = widget.restaurantImage ?? '';
    _effectiveRestCuisine = widget.restaurantCuisine ?? '';
    _effectiveRestRating = widget.restaurantRating ?? '4.5';
    _effectiveDeliveryTime = widget.restaurantDeliveryTime ?? '20-30 min';
    _effectiveDeliveryFee = widget.restaurantDeliveryFee ?? '₹15';
    _initMenu();
  }

  Future<void> _initMenu() async {
    setState(() {
      _isLoadingMenu = true;
      _error = null;
    });
    try {
      if (_effectiveRestId.isEmpty) {
        final rests = await RestaurantService.instance.getRestaurants();
        if (rests.isNotEmpty) {
          final r = rests.first;
          _effectiveRestId = r.id;
          _effectiveRestName = r.name;
          _effectiveRestImage = r.image;
          _effectiveRestCuisine = r.cuisine.isNotEmpty ? r.cuisine.join(' • ') : 'North Indian • Biryani';
          _effectiveRestRating = r.rating.toStringAsFixed(1);
          _effectiveDeliveryTime = r.deliveryTime;
          _effectiveDeliveryFee = '₹${r.deliveryFee}';
        }
      }

      if (_effectiveRestId.isNotEmpty) {
        final details = await RestaurantService.instance.getRestaurantDetails(_effectiveRestId);
        if (mounted) {
          setState(() {
            _menuItems = details.menu;
            final r = details.restaurant;
            if (r != null) {
              if (_effectiveRestName.isEmpty) _effectiveRestName = r.name;
              if (_effectiveRestImage.isEmpty) _effectiveRestImage = r.image;
            }
            _isLoadingMenu = false;
          });
          return;
        }
      }

      // If restaurant details returned empty or no id, load all foods for fallback
      final allFoods = await RestaurantService.instance.getFoods();
      if (mounted) {
        setState(() {
          _menuItems = allFoods;
          _isLoadingMenu = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'Could not load the menu. Please try again.';
          _isLoadingMenu = false;
        });
      }
    }
  }

  void _addItem(FoodItemModel dish) {
    CartService.instance.addItem(
      dish,
      restaurantId: _effectiveRestId.isNotEmpty ? _effectiveRestId : dish.restaurantId,
      restaurantName: _effectiveRestName.isNotEmpty ? _effectiveRestName : dish.restaurantName,
    );
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added "${dish.name}" to cart'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        backgroundColor: jdkartOrange,
      ),
    );
  }

  void _decrementItem(FoodItemModel dish) {
    final currentQty = CartService.instance.items.firstWhere(
      (i) => i.id == dish.id,
      orElse: () => CartItem(id: '', name: '', price: 0, restaurantId: '', restaurantName: '', quantity: 0),
    ).quantity;

    if (currentQty > 0) {
      CartService.instance.updateQuantity(dish.id, currentQty - 1);
    }
  }

  void _orderItemDirectly(FoodItemModel dish) {
    CartService.instance.addItem(
      dish,
      restaurantId: _effectiveRestId.isNotEmpty ? _effectiveRestId : dish.restaurantId,
      restaurantName: _effectiveRestName.isNotEmpty ? _effectiveRestName : dish.restaurantName,
    );
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartService.instance,
      builder: (context, _) {
        final totalCartCount = CartService.instance.totalItems;
        final totalPrice = CartService.instance.totalPrice;

        return Scaffold(
          backgroundColor: Colors.white,
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 250.0,
                pinned: true,
                iconTheme: const IconThemeData(color: Colors.white),
                backgroundColor: jdkartOrange,
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      SafeImage(
                        image: _effectiveRestImage,
                        fit: BoxFit.cover,
                        placeholderIcon: Icons.restaurant_rounded,
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.6),
                              Colors.transparent,
                              Colors.black.withOpacity(0.85),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 20,
                        left: 16,
                        right: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _effectiveRestName.isNotEmpty ? _effectiveRestName : 'Annapurna Family Restaurant',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _effectiveRestCuisine.isNotEmpty ? _effectiveRestCuisine : 'Akbarpur, Rohtas, Bihar',
                              style: const TextStyle(color: Colors.white70, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 12.0,
                              runSpacing: 6.0,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: const Color(0xFF267E3E), borderRadius: BorderRadius.circular(4)),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(_effectiveRestRating, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                      const SizedBox(width: 2),
                                      const Icon(Icons.star, color: Colors.white, size: 12),
                                    ],
                                  ),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.access_time_filled, color: Colors.white, size: 13),
                                    const SizedBox(width: 4),
                                    Text(_effectiveDeliveryTime, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                const Text('•', style: TextStyle(color: Colors.white54)),
                                Text('$_effectiveDeliveryFee delivery', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                GestureDetector(
                                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TableBookingScreen(restaurantId: _effectiveRestId, restaurantName: _effectiveRestName, restaurantAddress: 'Rohtas, Bihar'))),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.2),
                                      border: Border.all(color: Colors.white70),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.table_restaurant_rounded, color: Colors.white, size: 12),
                                        SizedBox(width: 4),
                                        Text('Book Table', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                  color: Colors.grey[50],
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Live Restaurant Menu',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      Text(
                        '${_menuItems.length} dishes',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),

              if (_isLoadingMenu)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(50.0),
                    child: Center(
                      child: CircularProgressIndicator(color: Color(0xFFF97316)),
                    ),
                  ),
                )
              else if (_error != null && _menuItems.isEmpty)
                SliverToBoxAdapter(
                  child: AppErrorState(message: _error!, onRetry: _initMenu),
                )
              else if (_menuItems.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(50.0),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.restaurant_menu_rounded, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          const Text('No dishes found for this restaurant', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ],
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        return _buildMenuItem(_menuItems[index]);
                      },
                      childCount: _menuItems.length,
                    ),
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
          bottomNavigationBar: totalCartCount > 0
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, -4)),
                    ],
                  ),
                  child: SafeArea(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        backgroundColor: jdkartOrange,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(left: 16.0),
                            child: Text(
                              '$totalCartCount ITEMS • ₹$totalPrice',
                              style: const TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w900),
                            ),
                          ),
                          const Row(
                            children: [
                              Text('View Cart', style: TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.bold)),
                              SizedBox(width: 4),
                              Icon(Icons.arrow_forward_ios, color: Colors.white, size: 14),
                              SizedBox(width: 16),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : null,
        );
      },
    );
  }

  Widget _buildMenuItem(FoodItemModel item) {
    final cartItem = CartService.instance.items.firstWhere(
      (i) => i.id == item.id,
      orElse: () => CartItem(id: '', name: '', price: 0, restaurantId: '', restaurantName: '', quantity: 0),
    );
    final int qty = cartItem.quantity;
    final price = item.discountedPrice ?? item.price;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailsScreen(foodItem: item)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.grey[200]!),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Side: Item Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Veg / Non-Veg Icon & Category Badge
                  Row(
                    children: [
                      Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: item.isVeg ? Colors.green : Colors.red, width: 1.5),
                        ),
                        child: Center(
                          child: Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: item.isVeg ? Colors.green : Colors.red,
                            ),
                          ),
                        ),
                      ),
                      if (item.category.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.orange[50],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.category,
                            style: TextStyle(color: jdkartOrange, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ]
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, height: 1.2),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Color(0xFFF59E0B), size: 14),
                      const SizedBox(width: 2),
                      Text(
                        item.rating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('₹$price', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                      if (item.discountedPrice != null && item.discountedPrice! < item.price) ...[
                        const SizedBox(width: 6),
                        Text(
                          '₹${item.price}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12, decoration: TextDecoration.lineThrough),
                        ),
                      ]
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.description.isNotEmpty
                        ? item.description
                        : 'Authentic ${item.name} made fresh to order.',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.grey[600], fontSize: 12, height: 1.3),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),

            // Right Side: SafeImage + Stepper + Order
            Column(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.bottomCenter,
                  children: [
                    Container(
                      width: 115,
                      height: 105,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 6, offset: const Offset(0, 2)),
                        ],
                      ),
                      child: SafeImage(
                        image: item.image,
                        width: 115,
                        height: 105,
                        borderRadius: BorderRadius.circular(14),
                        fit: BoxFit.cover,
                      ),
                    ),

                    // ADD Button / Stepper (overlapped at bottom)
                    Positioned(
                      bottom: -14,
                      child: Container(
                        width: 95,
                        height: 34,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: jdkartOrange, width: 1.5),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 4, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: qty == 0
                            ? InkWell(
                                onTap: () => _addItem(item),
                                child: Center(
                                  child: Text(
                                    'ADD +',
                                    style: TextStyle(
                                      color: jdkartOrange,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                children: [
                                  InkWell(
                                    onTap: () => _decrementItem(item),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                      child: Icon(Icons.remove, size: 16, color: jdkartOrange),
                                    ),
                                  ),
                                  Text(
                                    '$qty',
                                    style: TextStyle(
                                      color: jdkartOrange,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 14,
                                    ),
                                  ),
                                  InkWell(
                                    onTap: () => _addItem(item),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                      child: Icon(Icons.add, size: 16, color: jdkartOrange),
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),

                // ORDER NOW Button
                SizedBox(
                  width: 115,
                  height: 32,
                  child: ElevatedButton(
                    onPressed: () => _orderItemDirectly(item),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: jdkartOrange,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Order Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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
