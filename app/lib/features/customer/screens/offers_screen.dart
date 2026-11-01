import 'package:flutter/material.dart';
import 'cart_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../services/cart_service.dart';
import '../../../models/product_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';

class OffersScreen extends StatefulWidget {
  const OffersScreen({Key? key}) : super(key: key);

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> {
  List<FoodItemModel> _offers = [];
  bool _isLoading = true;
  String? _error;
  final Color jdkartOrange = const Color(0xFFF97316);

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  Future<void> _loadOffers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final foods = await RestaurantService.instance.getFoods();
      if (mounted) {
        setState(() {
          _offers = foods;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load offers. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Offers & Deals', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Banner
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFEA580C), Color(0xFFF97316)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFFF97316).withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    children: [
                      const Text(
                        '🔥 JDKart Special Deals',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Enjoy delicious food from Rohtas top restaurants with free delivery on orders above ₹99!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text('Featured Food Deals', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),

                if (_error != null && _offers.isEmpty)
                  AppErrorState(message: _error!, onRetry: _loadOffers)
                else if (_offers.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text('No offers available at the moment.'),
                    ),
                  )
                else
                  ..._offers.map((food) => _buildOfferCard(food)).toList(),
              ],
            ),
    );
  }

  Widget _buildOfferCard(FoodItemModel food) {
    final originalPrice = food.price + 25;
    final restId = food.restaurantId.isNotEmpty ? food.restaurantId : '6ab4048cdbe3ed2d4ab3ff89';
    final restName = food.restaurantName.isNotEmpty ? food.restaurantName : 'Annapurna Family Restaurant';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: SafeImage(
                  image: food.image,
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: jdkartOrange,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: const Text('SPECIAL OFFER', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11)),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        food.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Row(
                      children: [
                        Text('₹${food.price}', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: jdkartOrange)),
                        const SizedBox(width: 6),
                        Text('₹$originalPrice', style: const TextStyle(color: Colors.grey, fontSize: 13, decoration: TextDecoration.lineThrough)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  restName,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          CartService.instance.addItem(
                            food,
                            restaurantId: restId,
                            restaurantName: restName,
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Added "${food.name}" to cart!'),
                              backgroundColor: const Color(0xFF16A34A),
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: jdkartOrange,
                          side: BorderSide(color: jdkartOrange.withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('+ Add to Cart', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          CartService.instance.addItem(
                            food,
                            restaurantId: restId,
                            restaurantName: restName,
                          );
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: jdkartOrange,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Order Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
