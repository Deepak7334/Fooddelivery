import 'package:flutter/material.dart';
import '../../../models/product_model.dart';
import '../../../core/utils/cart_actions.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/safe_image.dart';
import 'cart_screen.dart';

class ProductDetailsScreen extends StatelessWidget {
  final FoodItemModel? foodItem;

  const ProductDetailsScreen({Key? key, this.foodItem}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final Color jdkartOrange = const Color(0xFFF97316);
    final food = foodItem;

    if (food == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Product Details')),
        body: const Center(child: Text('No product selected')),
      );
    }

    final price = food.discountedPrice ?? food.price;
    final hasDiscount = food.hasDiscount;
    final discountPercent = food.discountPercent;

    return Scaffold(
      backgroundColor: Colors.white,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Food Image Hero Header
            Stack(
              children: [
                SafeImage(
                  image: food.image,
                  height: 340,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.4),
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.2),
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Food Name & Veg/Non-veg indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          food.name,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          border: Border.all(color: food.isVeg ? Colors.green : Colors.red, width: 1.5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: food.isVeg ? Colors.green : Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Restaurant Name & Category
                  Row(
                    children: [
                      Icon(Icons.storefront_rounded, size: 16, color: jdkartOrange),
                      const SizedBox(width: 4),
                      Text(
                        food.restaurantName.isNotEmpty ? food.restaurantName : 'JDKart Partner',
                        style: TextStyle(fontSize: 14, color: jdkartOrange, fontWeight: FontWeight.bold),
                      ),
                      if (food.category.isNotEmpty) ...[
                        const Text(' • ', style: TextStyle(color: Colors.grey)),
                        Text(
                          food.category,
                          style: TextStyle(fontSize: 13, color: Colors.grey[600], fontWeight: FontWeight.w600),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Pricing Row
                  Row(
                    children: [
                      Text(
                        formatPrice(price),
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      if (hasDiscount) ...[
                        const SizedBox(width: 10),
                        Text(
                          formatPrice(food.price),
                          style: const TextStyle(fontSize: 16, color: Colors.grey, decoration: TextDecoration.lineThrough),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF16A34A),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$discountPercent% OFF',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF267E3E),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star, color: Colors.white, size: 14),
                            const SizedBox(width: 3),
                            Text(
                              food.rating.toStringAsFixed(1),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  const Divider(height: 1),
                  const SizedBox(height: 18),

                  const Text('About this item', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    food.description.isNotEmpty
                        ? food.description
                        : food.isProduct
                            ? 'Quality ${food.name} from ${food.restaurantName.isNotEmpty ? food.restaurantName : "a JDKart partner store"}, delivered to your door.'
                            : 'Authentic ${food.name} prepared fresh with top quality ingredients by ${food.restaurantName.isNotEmpty ? food.restaurantName : "our chefs"} on JDKart.',
                    style: TextStyle(color: Colors.grey[700], height: 1.5, fontSize: 14),
                  ),
                  const SizedBox(height: 24),

                  // Quality Badges
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildBadge(Icons.shield_outlined, food.isProduct ? 'Quality Checked' : 'Hygienic'),
                        _buildBadge(
                          food.isProduct ? Icons.local_shipping_outlined : Icons.timer_outlined,
                          food.isProduct ? 'Fast Delivery' : 'Fresh Cooked',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _addToCart(context, food, goToCart: false),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: jdkartOrange,
                    backgroundColor: const Color(0xFFFFF7ED),
                    side: BorderSide(color: jdkartOrange.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('ADD',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () => _addToCart(context, food, goToCart: true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: jdkartOrange,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    '${food.isProduct ? 'Buy' : 'Order'} • ${formatPrice(price)}',
                    style: const TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _addToCart(BuildContext context, FoodItemModel food,
      {required bool goToCart}) async {
    const jdkartOrange = Color(0xFFF97316);
    if (food.restaurantId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This item is not available from a vendor right now.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }
    final added = await addToCart(
      context,
      food,
      vendorId: food.restaurantId,
      vendorName: food.restaurantName.isNotEmpty ? food.restaurantName : 'JDKart Partner',
      type: food.isProduct ? 'product' : 'food',
    );
    if (!added || !context.mounted) return;

    if (goToCart) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
      return;
    }

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added "${food.name}" to cart!'),
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

  Widget _buildBadge(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF64748B)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: Color(0xFF475569), fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
