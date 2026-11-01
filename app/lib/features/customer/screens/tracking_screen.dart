import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../models/order_model.dart';
import '../../../services/order_service.dart';

class TrackingScreen extends StatefulWidget {
  final OrderModel? order;
  final String? orderId;

  const TrackingScreen({Key? key, this.order, this.orderId}) : super(key: key);

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  static const Duration _pollInterval = Duration(seconds: 20);

  OrderModel? _order;
  bool _isLoading = false;
  String? _error;
  Timer? _pollTimer;
  final Color jdkartOrange = const Color(0xFFF97316);

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    final id = widget.order?.id ?? widget.orderId;
    if (id != null && id.isNotEmpty) {
      _fetchOrderDetails(id);
    }
    _pollTimer = Timer.periodic(_pollInterval, (_) => _pollIfActive());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  bool _isTerminal(String status) {
    final s = status.toLowerCase();
    return s == 'delivered' || s == 'cancelled';
  }

  void _pollIfActive() {
    final id = _order?.id ?? widget.orderId;
    if (id == null || id.isEmpty || !mounted) return;
    if (_isTerminal(_order?.status ?? '')) {
      _pollTimer?.cancel();
      return;
    }
    _fetchOrderDetails(id, silent: true);
  }

  Future<void> _fetchOrderDetails(String orderId, {bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    try {
      final fresh = await OrderService.instance.getOrderById(orderId);
      if (!mounted) return;
      setState(() {
        if (fresh != null) _order = fresh;
        _error = null;
        _isLoading = false;
      });
      if (_isTerminal(_order?.status ?? '')) _pollTimer?.cancel();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        // Only take over the screen if nothing was ever loaded; poll
        // failures keep the last known state visible without spamming.
        if (!silent && _order == null) _error = e.message;
      });
      if (!silent && _order != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  int _getStepIndex(String status) {
    final s = status.toLowerCase();
    if (s == 'delivered') return 4;
    if (s.contains('out') || s.contains('way') || s.contains('driver') || s.contains('pickup') || s.contains('customer')) return 3;
    if (s.contains('prepar') || s == 'accepted') return 2;
    if (s == 'cancelled') return -1;
    return 1; // pending / placed
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final status = order?.status ?? 'pending';
    final stepIndex = _getStepIndex(status);
    final restaurantName = order != null && order.restaurantName.isNotEmpty ? order.restaurantName : 'Restaurant';
    final deliveryAddress = order != null && order.deliveryAddress.isNotEmpty ? order.deliveryAddress : 'Your Location';
    final orderNum = order != null ? (order.id.length > 8 ? order.id.substring(order.id.length - 8).toUpperCase() : order.id) : 'LIVE';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Track Order #$orderNum',
          style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.black),
            onPressed: () {
              final id = order?.id ?? widget.orderId;
              if (id != null) _fetchOrderDetails(id);
            },
          )
        ],
      ),
      body: _error != null && order == null
          ? AppErrorState(
              message: _error!,
              onRetry: () {
                final id = widget.order?.id ?? widget.orderId;
                if (id != null) _fetchOrderDetails(id);
              },
            )
          : _isLoading && order == null
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
              : Column(
              children: [
                // Delivery Route Banner / Visual Map Simulation
                Container(
                  height: 240,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
                  ),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: CustomPaint(
                          painter: _MapGridPainter(),
                        ),
                      ),
                      // Floating ETA / Status Pill
                      Positioned(
                        top: 16,
                        left: 20,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2)),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                stepIndex == 4 ? Icons.check_circle_rounded : Icons.directions_bike_rounded,
                                color: stepIndex == 4 ? const Color(0xFF16A34A) : jdkartOrange,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                stepIndex == 4 ? 'Order Delivered' : 'Status: ${status.replaceAll('_', ' ').toUpperCase()}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Restaurant Pin
                      Positioned(
                        top: 70,
                        left: 40,
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: const BoxDecoration(
                                color: Color(0xFF1E293B),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 18),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                              ),
                              child: Text(
                                restaurantName,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                maxLines: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Delivery Destination Pin
                      Positioned(
                        bottom: 30,
                        right: 40,
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: const BoxDecoration(
                                color: Color(0xFF16A34A),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.home_rounded, color: Colors.white, size: 18),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                              ),
                              child: const Text('Your Address', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // OTP Display Banner (if available)
                if (order != null && order.deliveryOTP.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.verified_user_rounded, color: Color(0xFF2563EB), size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Delivery Verification OTP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E3A8A))),
                              Text('Share with delivery agent: ${order.deliveryOTP}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF1D4ED8))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                // Delivery Agent info (if assigned)
                if (order != null && order.deliveryAgentName.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          radius: 18,
                          backgroundColor: Color(0xFFF97316),
                          child: Icon(Icons.two_wheeler_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(order.deliveryAgentName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const Text('Your Delivery Partner', style: TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ),
                        if (order.deliveryAgentPhone.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
                            child: const Icon(Icons.phone, color: Color(0xFF15803D), size: 18),
                          ),
                      ],
                    ),
                  ),

                // Order Status Steps
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      const Text('Delivery Status', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 20),
                      if (stepIndex == -1)
                        _buildStatusStep(Icons.cancel_rounded, 'Order Cancelled', 'This order was cancelled', true, isLast: true, isError: true)
                      else ...[
                        _buildStatusStep(
                          Icons.receipt_long_rounded,
                          'Order Placed & Confirmed',
                          'Restaurant has received your order',
                          stepIndex >= 1,
                          isCurrent: stepIndex == 1,
                        ),
                        _buildStatusStep(
                          Icons.soup_kitchen_rounded,
                          'Food is Being Prepared',
                          'Freshly cooking at $restaurantName',
                          stepIndex >= 2,
                          isCurrent: stepIndex == 2,
                        ),
                        _buildStatusStep(
                          Icons.delivery_dining_rounded,
                          'Out for Delivery',
                          'Delivery partner is on the way to $deliveryAddress',
                          stepIndex >= 3,
                          isCurrent: stepIndex == 3,
                        ),
                        _buildStatusStep(
                          Icons.home_rounded,
                          'Delivered',
                          'Enjoy your hot meal!',
                          stepIndex >= 4,
                          isCurrent: stepIndex == 4,
                          isLast: true,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatusStep(
    IconData icon,
    String title,
    String subtitle,
    bool isCompleted, {
    bool isCurrent = false,
    bool isLast = false,
    bool isError = false,
  }) {
    final activeColor = isError ? Colors.red : (isCompleted ? const Color(0xFF16A34A) : Colors.grey[300]!);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isCompleted ? activeColor : Colors.grey[200],
                shape: BoxShape.circle,
                border: isCurrent ? Border.all(color: activeColor.withOpacity(0.3), width: 4) : null,
              ),
              child: Icon(icon, color: isCompleted ? Colors.white : Colors.grey[500], size: 16),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 44,
                color: isCompleted ? activeColor : Colors.grey[200],
              )
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
                  fontSize: 15,
                  color: isCompleted ? const Color(0xFF0F172A) : Colors.grey[500],
                ),
              ),
              const SizedBox(height: 3),
              Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12.5)),
              const SizedBox(height: 18),
            ],
          ),
        )
      ],
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Paint linePaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = 1.5;

    final Paint roadPaint = Paint()
      ..color = Colors.white.withOpacity(0.8)
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    final Paint routePaint = Paint()
      ..color = const Color(0xFFF97316).withOpacity(0.7)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(Offset(0, size.height * 0.35), Offset(size.width, size.height * 0.35), linePaint);
    canvas.drawLine(Offset(0, size.height * 0.7), Offset(size.width, size.height * 0.7), linePaint);
    canvas.drawLine(Offset(size.width * 0.3, 0), Offset(size.width * 0.3, size.height), linePaint);
    canvas.drawLine(Offset(size.width * 0.65, 0), Offset(size.width * 0.65, size.height), linePaint);

    final Path path = Path();
    path.moveTo(50, 90);
    path.lineTo(size.width * 0.45, 120);
    path.lineTo(size.width * 0.75, size.height * 0.65);
    path.lineTo(size.width - 50, size.height - 50);

    canvas.drawPath(path, roadPaint);
    canvas.drawPath(path, routePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
