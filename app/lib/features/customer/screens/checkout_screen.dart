import 'package:flutter/material.dart';
import 'orders_screen.dart';
import 'addresses_screen.dart';
import '../../auth/screens/login_screen.dart';
import '../../../services/order_service.dart';
import '../../../services/cart_service.dart';
import '../../../services/address_service.dart';
import '../../../services/auth_service.dart';
import '../../../services/location_service.dart';
import '../../../models/address_model.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({Key? key}) : super(key: key);

  @override
  _CheckoutScreenState createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  int _selectedAddressIndex = 0;
  String _paymentMethod = 'cod'; // COD selected by default
  bool _isPlacingOrder = false;
  bool _isLoadingAddresses = true;
  String? _error;
  List<AddressModel> _savedAddresses = [];
  final TextEditingController _instructionsController = TextEditingController();
  final Color jdkartOrange = const Color(0xFFF97316);

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _isLoadingAddresses = true;
      _error = null;
    });
    try {
      final addrs = await AddressService.instance.getAddresses();
      if (mounted) {
        setState(() {
          _savedAddresses = addrs;
          _isLoadingAddresses = false;
          // Auto-select default address if exists
          final defIdx = _savedAddresses.indexWhere((a) => a.isDefault);
          if (defIdx != -1) {
            _selectedAddressIndex = defIdx;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load your addresses. Please try again.';
          _isLoadingAddresses = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _instructionsController.dispose();
    super.dispose();
  }

  void _showOnlinePaymentDisabledDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.info_outline_rounded, color: Color(0xFFF97316), size: 26),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Online Payment Disabled',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ),
          ],
        ),
        content: const Text(
          'Currently not accepting online payments. Please choose Cash on Delivery.',
          style: TextStyle(fontSize: 14.5, height: 1.4, color: Color(0xFF334155)),
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _paymentMethod = 'cod';
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Switched to Cash on Delivery'),
                  backgroundColor: Color(0xFF16A34A),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: jdkartOrange,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Choose Cash on Delivery', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

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

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            title: const Text('Checkout', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            backgroundColor: Colors.white,
            elevation: 0,
            iconTheme: const IconThemeData(color: Colors.black),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Order Summary Card
                _buildSectionTitle('Order Items (${items.length})'),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      ...items.map((i) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6.0),
                            child: Row(
                              children: [
                                SafeImage(
                                  image: i.image,
                                  width: 44,
                                  height: 44,
                                  borderRadius: BorderRadius.circular(8),
                                  fit: BoxFit.cover,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    '${i.quantity}x ${i.name}',
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '₹${i.price * i.quantity}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ],
                            ),
                          )),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.0),
                        child: Divider(height: 1),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total to Pay', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                          Text(
                            '₹${grandTotal.toStringAsFixed(0)}',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: jdkartOrange),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Delivery Address Header with Manage Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionTitle('Delivery Address'),
                    TextButton.icon(
                      onPressed: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const AddressesScreen()),
                        );
                        _loadAddresses();
                      },
                      icon: Icon(Icons.add_location_alt_outlined, size: 16, color: jdkartOrange),
                      label: Text('Manage', style: TextStyle(color: jdkartOrange, fontWeight: FontWeight.bold, fontSize: 13)),
                    )
                  ],
                ),
                const SizedBox(height: 8),

                if (_isLoadingAddresses)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16.0),
                      child: CircularProgressIndicator(color: Color(0xFFF97316)),
                    ),
                  )
                else if (_error != null && _savedAddresses.isEmpty)
                  AppErrorState(
                    message: _error!,
                    onRetry: _loadAddresses,
                  )
                else if (_savedAddresses.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Text('No address found. Please tap Manage above to add an address.'),
                  )
                else
                  ...List.generate(_savedAddresses.length, (index) {
                    final isSelected = _selectedAddressIndex == index;
                    final addr = _savedAddresses[index];
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedAddressIndex = index;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFFFF7ED) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? jdkartOrange : const Color(0xFFE2E8F0),
                            width: isSelected ? 1.8 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Radio(
                              value: index,
                              groupValue: _selectedAddressIndex,
                              onChanged: (value) {
                                setState(() {
                                  _selectedAddressIndex = value as int;
                                });
                              },
                              activeColor: jdkartOrange,
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        addr.label,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                      ),
                                      if (isSelected)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFDCFCE7),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text('SELECTED', style: TextStyle(color: Color(0xFF15803D), fontSize: 10, fontWeight: FontWeight.bold)),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    addr.fullAddress,
                                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 16),

                // Delivery Instructions
                _buildSectionTitle('Cooking & Delivery Notes'),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _instructionsController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'e.g. Less spicy, leave at door...',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(14),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Payment Method
                _buildSectionTitle('Payment Method'),
                const SizedBox(height: 12),
                
                // COD is active and recommended
                _buildActivePaymentOption(
                  'cod',
                  'Cash on Delivery',
                  'Pay cash when food arrives at your door',
                  badge: 'AVAILABLE & RECOMMENDED',
                ),

                // Online payment options (Disabled per user requirement)
                _buildDisabledPaymentOption(
                  'upi',
                  'UPI / Online Payment',
                  'Google Pay, PhonePe, Paytm, BHIM',
                ),
                _buildDisabledPaymentOption(
                  'cards',
                  'Cards & Net Banking',
                  'Credit / Debit Card, Net Banking',
                ),

                const SizedBox(height: 30),
              ],
            ),
          ),
          bottomNavigationBar: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, -5))
              ],
            ),
            child: SafeArea(
              child: ElevatedButton(
                onPressed: _isPlacingOrder
                    ? null
                    : () async {
                        if (items.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Your cart is empty!')),
                          );
                          return;
                        }

                        if (!AuthService.instance.isAuthenticated) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please log in to place your order.')),
                          );
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                          return;
                        }

                        if (_paymentMethod != 'cod') {
                          _showOnlinePaymentDisabledDialog();
                          return;
                        }

                        if (_savedAddresses.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please select or add a delivery address.')),
                          );
                          return;
                        }

                        setState(() => _isPlacingOrder = true);
                        try {
                          final restId = CartService.instance.restaurantId ?? '6ab4048cdbe3ed2d4ab3ff89';

                          final payloadItems = items.map((i) => {
                            'foodId': i.id,
                            'name': i.name,
                            'price': i.price,
                            'quantity': i.quantity,
                            'type': 'food',
                            'restaurantId': i.restaurantId.isNotEmpty ? i.restaurantId : restId,
                            'image': i.image,
                          }).toList();

                          final addr = _savedAddresses.isNotEmpty && _selectedAddressIndex < _savedAddresses.length
                              ? _savedAddresses[_selectedAddressIndex]
                              : null;

                          final selectedAddress = addr?.fullAddress ?? 'Akbarpur, Rohtas, Bihar';

                          final deliveryAddressObj = {
                            'address': selectedAddress,
                            'addressLine1': addr?.addressLine1 ?? selectedAddress,
                            'city': addr?.city.isNotEmpty == true ? addr!.city : 'Rohtas',
                            'state': addr?.state.isNotEmpty == true ? addr!.state : 'Bihar',
                            'pincode': addr?.pincode.isNotEmpty == true ? addr!.pincode : '821311',
                            'latitude': addr?.latitude ?? LocationService.instance.selectedLat,
                            'longitude': addr?.longitude ?? LocationService.instance.selectedLng,
                          };

                          final deliveryCoords = {
                            'lat': addr?.latitude ?? LocationService.instance.selectedLat,
                            'lng': addr?.longitude ?? LocationService.instance.selectedLng,
                          };

                          final result = await OrderService.instance.placeOrder(
                            restaurantId: restId,
                            items: payloadItems,
                            totalAmount: grandTotal,
                            deliveryAddress: deliveryAddressObj,
                            deliveryCoords: deliveryCoords,
                            specialInstructions: _instructionsController.text.trim(),
                            serviceAreaId: '6ab55c81fdf553743734e6e2',
                            paymentMethod: 'COD',
                          );

                          if (!mounted) return;

                          if (result['success'] == true) {
                            CartService.instance.clearCart();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(result['message'] ?? 'Order placed successfully with Cash on Delivery!'),
                                backgroundColor: const Color(0xFF16A34A),
                              ),
                            );
                            Navigator.pushAndRemoveUntil(
                              context,
                              MaterialPageRoute(builder: (_) => const OrdersScreen()),
                              (route) => route.isFirst,
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(result['message'] ?? 'Failed to place order. Please try again.'),
                                backgroundColor: Colors.redAccent,
                              ),
                            );
                          }
                        } catch (e) {
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Order submission error: $e'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                        } finally {
                          if (mounted) setState(() => _isPlacingOrder = false);
                        }
                      },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: jdkartOrange,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isPlacingOrder
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Place Order (Cash on Delivery) • ₹${grandTotal.toStringAsFixed(0)}',
                            style: const TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold),
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

  Widget _buildSectionTitle(String title) {
    return Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)));
  }

  Widget _buildActivePaymentOption(String id, String title, String subtitle, {String? badge}) {
    final isSelected = _paymentMethod == id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _paymentMethod = id;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFFF7ED) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? jdkartOrange : const Color(0xFFE2E8F0),
            width: isSelected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Radio(
              value: id,
              groupValue: _paymentMethod,
              onChanged: (val) {
                setState(() => _paymentMethod = val.toString());
              },
              activeColor: jdkartOrange,
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      if (badge != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF15803D)),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDisabledPaymentOption(String id, String title, String subtitle) {
    return GestureDetector(
      onTap: () {
        _showOnlinePaymentDisabledDialog();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9).withOpacity(0.7),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: const Color(0xFFCBD5E1),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.block_rounded, color: Colors.grey, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5, color: Color(0xFF64748B)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'NOT ACCEPTED',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.info_outline_rounded, color: Color(0xFF94A3B8), size: 18),
          ],
        ),
      ),
    );
  }
}
