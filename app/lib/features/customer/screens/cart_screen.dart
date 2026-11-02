import 'package:flutter/material.dart';
import 'checkout_screen.dart';
import '../../../services/cart_service.dart';
import '../../../core/widgets/safe_image.dart';

class CartScreen extends StatefulWidget {
  final VoidCallback? onBrowseTap;
  const CartScreen({Key? key, this.onBrowseTap}) : super(key: key);

  @override
  _CartScreenState createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartService.instance,
      builder: (context, _) {
        final items = CartService.instance.items;
        final subtotal = CartService.instance.totalPrice;
        final deliveryFee = subtotal >= 99 ? 0.0 : 15.0;
        final platformFee = 3.0;
        final grandTotal = subtotal > 0 ? (subtotal + deliveryFee + platformFee) : 0.0;

        if (items.isEmpty) {
          return Scaffold(
            backgroundColor: Colors.white,
            appBar: AppBar(
              title: const Text('Your Cart', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              backgroundColor: Colors.white,
              elevation: 0,
              iconTheme: const IconThemeData(color: Colors.black),
            ),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFF7ED),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.shopping_bag_outlined, size: 72, color: jdkartOrange),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Your cart is empty',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Good food is always cooking! Go ahead and order some yummy items from the menu.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.4),
                    ),
                    const SizedBox(height: 28),
                    ElevatedButton(
                      onPressed: () {
                        if (Navigator.canPop(context)) {
                          Navigator.pop(context);
                        } else if (widget.onBrowseTap != null) {
                          widget.onBrowseTap!();
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: jdkartOrange,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Browse Food', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            title: const Text('Your Cart', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            backgroundColor: Colors.white,
            elevation: 0,
            iconTheme: const IconThemeData(color: Colors.black),
            actions: [
              TextButton(
                onPressed: () {
                  CartService.instance.clearCart();
                },
                child: const Text('Clear', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              )
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Restaurant Header
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFF7ED),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.storefront_rounded, color: jdkartOrange, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              CartService.instance.restaurantName ?? 'JDKart Partner',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const Text(
                              'Delivery to your doorstep • Akbarpur, Rohtas',
                              style: TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Cart Items List
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: items.asMap().entries.map((entry) {
                      final item = entry.value;
                      final isLast = entry.key == items.length - 1;

                      return Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(14.0),
                            child: Row(
                              children: [
                                SafeImage(
                                  image: item.image,
                                  width: 58,
                                  height: 58,
                                  borderRadius: BorderRadius.circular(10),
                                  fit: BoxFit.cover,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '₹${item.price}',
                                        style: TextStyle(color: Colors.grey[700], fontSize: 13, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Stepper
                                Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF7ED),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: jdkartOrange.withValues(alpha: 0.5)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      InkWell(
                                        onTap: () {
                                          CartService.instance.updateQuantity(item.id, item.quantity - 1);
                                        },
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                          child: Icon(Icons.remove, size: 16, color: jdkartOrange),
                                        ),
                                      ),
                                      Text(
                                        '${item.quantity}',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: jdkartOrange),
                                      ),
                                      InkWell(
                                        onTap: () {
                                          CartService.instance.updateQuantity(item.id, item.quantity + 1);
                                        },
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                          child: Icon(Icons.add, size: 16, color: jdkartOrange),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  '₹${item.price * item.quantity}',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                                ),
                              ],
                            ),
                          ),
                          if (!isLast) const Divider(height: 1, indent: 14, endIndent: 14),
                        ],
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Bill Details
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Bill Summary', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 12),
                      _buildBillRow('Item Total', '₹$subtotal'),
                      const SizedBox(height: 8),
                      _buildBillRow(
                        'Delivery Partner Fee',
                        deliveryFee == 0 ? 'FREE' : '₹$deliveryFee',
                        isHighlight: deliveryFee == 0,
                      ),
                      const SizedBox(height: 8),
                      _buildBillRow('Platform Fee', '₹$platformFee'),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12.0),
                        child: Divider(height: 1),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Grand Total', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
                          Text(
                            '₹${grandTotal.toStringAsFixed(0)}',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: jdkartOrange),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 120),
              ],
            ),
          ),
          bottomNavigationBar: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -4)),
              ],
            ),
            child: SafeArea(
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen()));
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: jdkartOrange,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 16.0),
                      child: Text(
                        '₹${grandTotal.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.w900),
                      ),
                    ),
                    const Row(
                      children: [
                        Text('Proceed to Checkout', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                        SizedBox(width: 16),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBillRow(String label, String value, {bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey[700], fontSize: 13.5)),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13.5,
            color: isHighlight ? const Color(0xFF16A34A) : Colors.black87,
          ),
        ),
      ],
    );
  }
}
