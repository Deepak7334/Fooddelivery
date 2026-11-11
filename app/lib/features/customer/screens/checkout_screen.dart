import 'package:flutter/material.dart';
import 'orders_screen.dart';
import 'addresses_screen.dart';
import '../../auth/screens/login_screen.dart';
import '../../../services/order_service.dart';
import '../../../services/cart_service.dart';
import '../../../services/address_service.dart';
import '../../../services/auth_service.dart';
import '../../../models/address_model.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
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
    CartService.instance.refreshCharges();
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

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: CartService.instance,
      builder: (context, _) {
        final items = CartService.instance.items;
        final subtotal = CartService.instance.totalPrice;
        final deliveryFee = CartService.instance.deliveryFee;
        final chargesLoaded = CartService.instance.chargesLoaded;
        final grandTotal = CartService.instance.grandTotal;

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
                          Text('Item Total', style: TextStyle(color: Colors.grey[700], fontSize: 13.5)),
                          Text('₹${subtotal.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Delivery Fee', style: TextStyle(color: Colors.grey[700], fontSize: 13.5)),
                          Text(
                            !chargesLoaded
                                ? 'Calculated at checkout'
                                : (deliveryFee == 0 ? 'FREE' : '₹${deliveryFee.toStringAsFixed(0)}'),
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                              color: chargesLoaded && deliveryFee == 0 ? const Color(0xFF16A34A) : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                      if (chargesLoaded && CartService.instance.isFirstOrderFree) ...[
                        const SizedBox(height: 6),
                        const Row(
                          children: [
                            Icon(Icons.local_offer_outlined, size: 14, color: Color(0xFF16A34A)),
                            SizedBox(width: 4),
                            Text(
                              'First order free delivery',
                              style: TextStyle(color: Color(0xFF16A34A), fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
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
                            RadioGroup<int>(
                              groupValue: _selectedAddressIndex,
                              onChanged: (value) {
                                if (value == null) return;
                                setState(() {
                                  _selectedAddressIndex = value;
                                });
                              },
                              child: Radio(
                                value: index,
                                activeColor: jdkartOrange,
                              ),
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
                
                // COD is the only accepted payment method for now.
                _buildActivePaymentOption(
                  'cod',
                  'Cash on Delivery',
                  'Pay cash when food arrives at your door',
                  badge: 'AVAILABLE & RECOMMENDED',
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
                BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -5))
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
                          final loggedIn = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const LoginScreen(popOnSuccess: true),
                            ),
                          );
                          if (loggedIn == true) {
                            await _loadAddresses();
                            await CartService.instance.refreshCharges();
                          }
                          return;
                        }

                        if (_savedAddresses.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Please add a delivery address to continue.')),
                          );
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const AddressesScreen()),
                          );
                          _loadAddresses();
                          return;
                        }

                        final addr = _selectedAddressIndex >= 0 &&
                                _selectedAddressIndex < _savedAddresses.length
                            ? _savedAddresses[_selectedAddressIndex]
                            : null;
                        if (addr == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please select a delivery address.')),
                          );
                          return;
                        }

                        setState(() => _isPlacingOrder = true);
                        try {
                          final hasCoords =
                              addr.latitude != null && addr.longitude != null;

                          final deliveryAddressObj = <String, dynamic>{
                            if (addr.addressLine1.isNotEmpty)
                              'addressLine1': addr.addressLine1,
                            if (addr.addressLine2.isNotEmpty)
                              'addressLine2': addr.addressLine2,
                            if (addr.landmark.isNotEmpty) 'landmark': addr.landmark,
                            if (addr.area.isNotEmpty) 'area': addr.area,
                            if (addr.city.isNotEmpty) 'city': addr.city,
                            if (addr.state.isNotEmpty) 'state': addr.state,
                            if (addr.pincode.isNotEmpty) 'pincode': addr.pincode,
                            if (hasCoords) 'latitude': addr.latitude,
                            if (hasCoords) 'longitude': addr.longitude,
                          };

                          // Verify serviceability and resolve the real service area.
                          String? resolvedServiceAreaId;
                          try {
                            final checkRes = await ApiClient.instance.post(
                              ApiConstants.checkServiceability,
                              {'address': deliveryAddressObj},
                            );
                            if (checkRes is Map) {
                              if (checkRes['serviceable'] == false) {
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(checkRes['message']?.toString() ??
                                        'Selected delivery address is currently not serviceable.'),
                                    backgroundColor: Colors.redAccent,
                                  ),
                                );
                                setState(() => _isPlacingOrder = false);
                                return;
                              }
                              resolvedServiceAreaId =
                                  checkRes['serviceAreaId']?.toString();

                              final minOrder =
                                  (checkRes['minimumOrderValue'] as num?) ?? 0;
                              final currentSubtotal =
                                  CartService.instance.totalPrice;
                              if (minOrder > 0 && currentSubtotal < minOrder) {
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                        'Minimum order for this area is ₹${minOrder.toStringAsFixed(0)}. Please add more items.'),
                                    backgroundColor: Colors.redAccent,
                                  ),
                                );
                                setState(() => _isPlacingOrder = false);
                                return;
                              }
                            }
                          } on ApiException catch (e) {
                            if (!hasCoords) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(e.message),
                                  backgroundColor: Colors.redAccent,
                                ),
                              );
                              setState(() => _isPlacingOrder = false);
                              return;
                            }
                          }

                          if (resolvedServiceAreaId == null && !hasCoords) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                    'We could not verify delivery for this address. Please choose another address.'),
                                backgroundColor: Colors.redAccent,
                              ),
                            );
                            setState(() => _isPlacingOrder = false);
                            return;
                          }

                          final payloadItems = items.map((i) {
                            return <String, dynamic>{
                              if (i.isProduct) 'productId': i.id else 'foodId': i.id,
                              'type': i.type,
                              if (i.isProduct)
                                'storeId': i.restaurantId
                              else
                                'restaurantId': i.restaurantId,
                              'name': i.name,
                              'price': i.price,
                              'quantity': i.quantity,
                              'image': i.image,
                            };
                          }).toList();

                          final result = await OrderService.instance.placeOrder(
                            restaurantId: CartService.instance.restaurantId,
                            items: payloadItems,
                            totalAmount: CartService.instance.totalPrice,
                            deliveryAddress: deliveryAddressObj,
                            deliveryCoords: hasCoords
                                ? {'lat': addr.latitude, 'lng': addr.longitude}
                                : null,
                            specialInstructions: _instructionsController.text.trim(),
                            serviceAreaId: resolvedServiceAreaId,
                            paymentMethod: _paymentMethod,
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
            RadioGroup<String>(
              groupValue: _paymentMethod,
              onChanged: (value) {
                if (value == null) return;
                setState(() => _paymentMethod = value);
              },
              child: Radio(
                value: id,
                activeColor: jdkartOrange,
              ),
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
}
