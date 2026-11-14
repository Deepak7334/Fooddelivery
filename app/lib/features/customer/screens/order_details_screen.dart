import 'package:flutter/material.dart';
import 'cart_screen.dart';
import 'tracking_screen.dart';
import '../../../models/order_model.dart';
import '../../../models/product_model.dart';
import '../../../services/cart_service.dart';
import '../../../services/order_service.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/utils/format.dart';

class OrderDetailsScreen extends StatefulWidget {
  final OrderModel? order;

  const OrderDetailsScreen({Key? key, this.order}) : super(key: key);

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  OrderModel? _currentOrder;
  bool _isLoading = false;
  bool _isActing = false;
  String? _error;

  Map<String, dynamic> _statusStyle(String status) {
    switch (status) {
      case 'delivered':
        return {
          'label': 'Delivered',
          'color': const Color(0xFF15803D),
          'bg': const Color(0xFFDCFCE7),
        };
      case 'cancelled':
      case 'rejected':
        return {
          'label': status == 'rejected' ? 'Rejected' : 'Cancelled',
          'color': const Color(0xFFB91C1C),
          'bg': const Color(0xFFFEE2E2),
        };
      case 'out_for_delivery':
      case 'on_the_way':
      case 'accepted_by_driver':
      case 'picked_up':
        return {
          'label': 'Out for delivery',
          'color': const Color(0xFF1D4ED8),
          'bg': const Color(0xFFDBEAFE),
        };
      case 'assignment_pending':
        return {
          'label': 'Assigning rider',
          'color': const Color(0xFF6D28D9),
          'bg': const Color(0xFFEDE9FE),
        };
      case 'confirmed':
        return {
          'label': 'Confirmed',
          'color': const Color(0xFFB45309),
          'bg': const Color(0xFFFFFBEB),
        };
      case 'preparing':
        return {
          'label': 'Preparing',
          'color': const Color(0xFFB45309),
          'bg': const Color(0xFFFFFBEB),
        };
      default:
        return {
          'label': 'Pending',
          'color': const Color(0xFFB45309),
          'bg': const Color(0xFFFFFBEB),
        };
    }
  }

  bool _isTrackable(String status) =>
      status != 'delivered' && status != 'cancelled' && status != 'rejected';

  bool _isPrepaid(OrderModel order) {
    final method = order.paymentMethod.toLowerCase();
    if (method == 'cod' || method == 'cash') return false;
    return order.paymentStatus.toLowerCase() == 'paid';
  }

  Widget _statusChip(String status) {
    final style = _statusStyle(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: style['bg'] as Color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        style['label'] as String,
        style: TextStyle(
          color: style['color'] as Color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _currentOrder = widget.order;
    if (_currentOrder == null) {
      _fetchLatestOrder();
    }
  }

  Future<void> _refreshOrder() async {
    final id = _currentOrder?.id;
    if (id == null || id.isEmpty) return;
    try {
      final fresh = await OrderService.instance.getOrderById(id);
      if (fresh != null && mounted) setState(() => _currentOrder = fresh);
    } catch (_) {}
  }

  void _showSnack(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? Colors.redAccent : const Color(0xFF16A34A),
      ),
    );
  }

  Future<void> _cancelOrder(OrderModel order) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel order?'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, cancel', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    setState(() => _isActing = true);
    try {
      await OrderService.instance.cancelOrder(order.id);
      await _refreshOrder();
      _showSnack('Order cancelled');
    } on ApiException catch (e) {
      _showSnack(e.message, error: true);
    } catch (_) {
      _showSnack('Could not cancel the order. Please try again.', error: true);
    } finally {
      if (mounted) setState(() => _isActing = false);
    }
  }

  Future<void> _reorder(OrderModel order) async {
    final reorderable = order.items.where((i) => i.itemId.isNotEmpty).toList();
    if (reorderable.isEmpty || order.vendorId.isEmpty) {
      _showSnack('These items can no longer be reordered.', error: true);
      return;
    }

    final cart = CartService.instance;
    if (cart.items.isNotEmpty) {
      final replace = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Replace cart?'),
          content: const Text('Your current cart will be cleared and replaced with the items from this order.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Replace')),
          ],
        ),
      );
      if (replace != true || !mounted) return;
    }

    cart.clearCart();
    for (final item in reorderable) {
      cart.addItem(
        FoodItemModel(
          id: item.itemId,
          name: item.name,
          price: item.price,
          image: item.image,
          isProduct: item.isProduct,
        ),
        restaurantId: order.vendorId,
        restaurantName: order.restaurantName,
        type: item.type,
      );
      if (item.quantity > 1) {
        cart.updateQuantity(item.itemId, item.quantity, type: item.type);
      }
    }
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
  }

  Future<void> _rateOrder(OrderModel order) async {
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _RateOrderSheet(order: order),
    );
    if (submitted == true) {
      await _refreshOrder();
      _showSnack('Thanks for your feedback!');
    }
  }

  Widget _buildActions(OrderModel order, Color accent) {
    final canReorder = order.status == 'delivered' ||
        order.status == 'cancelled' ||
        order.status == 'rejected';
    if (!order.canCancel && !order.canRate && !canReorder) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        children: [
          if (order.canRate)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ElevatedButton.icon(
                onPressed: _isActing ? null : () => _rateOrder(order),
                icon: const Icon(Icons.star_rounded, color: Colors.white, size: 18),
                label: const Text('Rate this Order',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: accent,
                  minimumSize: const Size(double.infinity, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          if (canReorder)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: OutlinedButton.icon(
                onPressed: _isActing ? null : () => _reorder(order),
                icon: Icon(Icons.replay_rounded, color: accent, size: 18),
                label: Text('Reorder',
                    style: TextStyle(color: accent, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: accent),
                  minimumSize: const Size(double.infinity, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          if (order.canCancel)
            OutlinedButton.icon(
              onPressed: _isActing ? null : () => _cancelOrder(order),
              icon: _isActing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.redAccent),
                    )
                  : const Icon(Icons.cancel_outlined, color: Colors.redAccent, size: 18),
              label: const Text('Cancel Order',
                  style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.redAccent),
                minimumSize: const Size(double.infinity, 46),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _fetchLatestOrder() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final orders = await OrderService.instance.getMyOrders();
      if (orders.isNotEmpty && mounted) {
        setState(() {
          _currentOrder = orders.first;
          _isLoading = false;
        });
      } else if (mounted) {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load order details. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final Color jdkartOrange = const Color(0xFFF97316);
    final order = _currentOrder;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Order Details', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : _error != null && order == null
              ? AppErrorState(message: _error!, onRetry: _fetchLatestOrder)
              : order == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        const Text('No order found', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          style: ElevatedButton.styleFrom(backgroundColor: jdkartOrange),
                          child: const Text('Go Back', style: TextStyle(color: Colors.white)),
                        )
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Order Status Header Card
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    order.orderNumber,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                ),
                                _statusChip(order.status),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Placed on ${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}',
                              style: TextStyle(color: Colors.grey[600], fontSize: 13),
                            ),
                            const SizedBox(height: 14),
                            if (_isTrackable(order.status))
                              ElevatedButton.icon(
                                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TrackingScreen(order: order, orderId: order.id))),
                                icon: const Icon(Icons.two_wheeler_rounded, color: Colors.white, size: 18),
                                label: const Text('Track Order Live', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: jdkartOrange,
                                  minimumSize: const Size(double.infinity, 44),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              )
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Restaurant & Delivery Address Card
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
                            Row(
                              children: [
                                Icon(Icons.storefront_rounded, size: 18, color: jdkartOrange),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    order.restaurantName.isNotEmpty ? order.restaurantName : 'JDKart Partner',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                ),
                              ],
                            ),
                            const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1)),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.location_on_outlined, size: 18, color: Colors.grey),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    order.deliveryAddress.isNotEmpty
                                        ? order.deliveryAddress
                                        : 'Delivery address not available',
                                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Items List Card
                      const Text('Items in Order', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            ...order.items.map((i) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6.0),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('${i.quantity}x ${i.name}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                                      Text(formatPrice(i.price * i.quantity), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    ],
                                  ),
                                )),
                            const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(height: 1)),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Item Total', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                                Text(formatPrice(order.totalAmount), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            if (order.deliveryFee > 0) ...[
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Delivery Fee', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                                  Text(formatPrice(order.deliveryFee), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ],
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _isPrepaid(order) ? 'Total Amount Paid' : 'Amount to Pay',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                                ),
                                Text(
                                  formatPrice(order.finalAmount),
                                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: jdkartOrange),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      _buildActions(order, jdkartOrange),
                    ],
                  ),
                ),
    );
  }
}

class _RateOrderSheet extends StatefulWidget {
  final OrderModel order;

  const _RateOrderSheet({required this.order});

  @override
  State<_RateOrderSheet> createState() => _RateOrderSheetState();
}

class _RateOrderSheetState extends State<_RateOrderSheet> {
  int _vendorRating = 5;
  int _deliveryRating = 5;
  final _vendorReview = TextEditingController();
  final _deliveryReview = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _vendorReview.dispose();
    _deliveryReview.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await OrderService.instance.rateOrder(
        widget.order,
        vendorRating: _vendorRating,
        vendorReview: _vendorReview.text.trim(),
        deliveryRating: _deliveryRating,
        deliveryReview: _deliveryReview.text.trim(),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Failed to submit review'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Widget _stars(int value, ValueChanged<int> onChanged) {
    return Row(
      children: List.generate(5, (i) {
        final star = i + 1;
        return IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: _submitting ? null : () => setState(() => onChanged(star)),
          icon: Icon(
            star <= value ? Icons.star_rounded : Icons.star_border_rounded,
            color: const Color(0xFFF59E0B),
            size: 32,
          ),
        );
      }),
    );
  }

  InputDecoration _fieldDecoration(String hint) => InputDecoration(
        hintText: hint,
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      );

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Rate your order',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 16),
            Text('How was ${order.restaurantName}?',
                style: const TextStyle(fontWeight: FontWeight.w700)),
            _stars(_vendorRating, (v) => _vendorRating = v),
            TextField(
              controller: _vendorReview,
              maxLines: 2,
              decoration: _fieldDecoration('Tell us about the food (optional)'),
            ),
            if (order.deliveryAgentName.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('How was ${order.deliveryAgentName}\'s delivery?',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              _stars(_deliveryRating, (v) => _deliveryRating = v),
              TextField(
                controller: _deliveryReview,
                maxLines: 2,
                decoration: _fieldDecoration('Delivery feedback (optional)'),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF97316),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Submit Review',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
