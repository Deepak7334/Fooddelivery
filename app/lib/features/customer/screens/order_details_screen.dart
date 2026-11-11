import 'package:flutter/material.dart';
import 'tracking_screen.dart';
import '../../../models/order_model.dart';
import '../../../services/order_service.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';

class OrderDetailsScreen extends StatefulWidget {
  final OrderModel? order;

  const OrderDetailsScreen({Key? key, this.order}) : super(key: key);

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  OrderModel? _currentOrder;
  bool _isLoading = false;
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
                                      Text('₹${i.price * i.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    ],
                                  ),
                                )),
                            const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(height: 1)),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _isPrepaid(order) ? 'Total Amount Paid' : 'Amount to Pay',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                                ),
                                Text(
                                  '₹${order.totalAmount}',
                                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: jdkartOrange),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
