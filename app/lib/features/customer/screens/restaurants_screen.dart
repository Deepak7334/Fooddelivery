import 'package:flutter/material.dart';
import 'restaurant_details_screen.dart';
import '../../../services/restaurant_service.dart';
import '../../../models/restaurant_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';

class RestaurantsScreen extends StatefulWidget {
  const RestaurantsScreen({Key? key}) : super(key: key);

  @override
  State<RestaurantsScreen> createState() => _RestaurantsScreenState();
}

class _RestaurantsScreenState extends State<RestaurantsScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);
  List<RestaurantModel> _restaurants = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRestaurants();
  }

  Future<void> _fetchRestaurants() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final list = await RestaurantService.instance.getRestaurants();
      if (mounted) {
        setState(() {
          _restaurants = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load restaurants. Please try again.';
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
        title: const Text('All Restaurants', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: jdkartOrange))
          : _error != null && _restaurants.isEmpty
              ? AppErrorState(message: _error!, onRetry: _fetchRestaurants)
              : _restaurants.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.storefront_outlined, size: 54, color: Colors.grey[400]),
                      const SizedBox(height: 12),
                      const Text('No restaurants found', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: _fetchRestaurants,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Retry'),
                      )
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  physics: const BouncingScrollPhysics(),
                  itemCount: _restaurants.length,
                  itemBuilder: (context, index) {
                    final res = _restaurants[index];
                    final cuisines = res.cuisine.isNotEmpty ? res.cuisine.join(' • ') : 'North Indian • Mughlai • Biryani';

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
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 3)),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SafeImage(
                              image: res.image,
                              height: 165,
                              width: double.infinity,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                              fit: BoxFit.cover,
                              placeholderIcon: Icons.restaurant_rounded,
                            ),
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
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
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
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              res.rating.toStringAsFixed(1),
                                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                            const SizedBox(width: 2),
                                            const Icon(Icons.star, color: Colors.white, size: 12),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    res.address.isNotEmpty ? res.address : cuisines,
                                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.access_time_filled, size: 13, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text(res.deliveryTime, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                                      const SizedBox(width: 12),
                                      Text('₹${res.minOrder} min order', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                                    ],
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
