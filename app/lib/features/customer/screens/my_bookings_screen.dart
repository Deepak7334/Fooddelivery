import 'package:flutter/material.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../services/auth_service.dart';
import '../../../services/booking_service.dart';
import '../../auth/screens/login_screen.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({Key? key}) : super(key: key);

  @override
  _MyBookingsScreenState createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<Map<String, dynamic>> _bookings = [];
  bool _isLoading = true;
  String? _error;
  String? _cancellingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final bookings = await BookingService.instance.getMyBookings();
      if (!mounted) return;
      setState(() {
        _bookings = bookings;
        _isLoading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load your reservations. Please try again.';
        _isLoading = false;
      });
    }
  }

  Future<void> _cancel(Map<String, dynamic> booking) async {
    final id = (booking['_id'] ?? booking['id']).toString();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel reservation?'),
        content: const Text(
          'This tells the restaurant you no longer need the table.',
          style: TextStyle(height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep it'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            child: const Text('Cancel table'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _cancellingId = id);
    try {
      await BookingService.instance.cancelBooking(id);
      if (!mounted) return;
      setState(() => _cancellingId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Reservation cancelled.'),
          backgroundColor: Color(0xFF16A34A),
        ),
      );
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _cancellingId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: Colors.redAccent),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _cancellingId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not cancel the reservation. Please try again.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  String _restaurantName(Map<String, dynamic> booking) {
    final restaurant = booking['restaurantId'];
    if (restaurant is Map && restaurant['name'] != null) {
      return restaurant['name'].toString();
    }
    return 'Restaurant';
  }

  String _dateLabel(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    final local = parsed.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  Map<String, dynamic> _statusStyle(String status) {
    return switch (status) {
      'confirmed' => {
          'label': 'Confirmed',
          'color': const Color(0xFF16A34A),
          'bg': const Color(0xFFF0FDF4),
        },
      'rejected' => {
          'label': 'Rejected',
          'color': const Color(0xFFDC2626),
          'bg': const Color(0xFFFEF2F2),
        },
      'cancelled' => {
          'label': 'Cancelled',
          'color': const Color(0xFF64748B),
          'bg': const Color(0xFFF1F5F9),
        },
      _ => {
          'label': 'Awaiting confirmation',
          'color': const Color(0xFFB45309),
          'bg': const Color(0xFFFFFBEB),
        },
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Reservations',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: !AuthService.instance.isAuthenticated
          ? _notLoggedIn()
          : _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? AppErrorState(message: _error!, onRetry: _load)
                  : _bookings.isEmpty
                      ? _empty()
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            itemCount: _bookings.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) =>
                                _bookingCard(_bookings[index]),
                          ),
                        ),
    );
  }

  Widget _notLoggedIn() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_outline_rounded, size: 52, color: Colors.grey[400]),
            const SizedBox(height: 14),
            const Text(
              'Log in to see your table reservations.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: () async {
                final loggedIn = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(popOnSuccess: true),
                  ),
                );
                if (loggedIn == true && mounted) await _load();
              },
              icon: const Icon(Icons.login_rounded),
              label: const Text('Login'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF97316),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _empty() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.22),
        Icon(Icons.table_restaurant_rounded, size: 56, color: Colors.grey[300]),
        const SizedBox(height: 12),
        const Text(
          'No table reservations yet',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 6),
        Text(
          'Book a table from any restaurant page and track it here.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey[600], fontSize: 13.5),
        ),
        const SizedBox(height: 18),
        Center(
          child: TextButton(
            onPressed: _load,
            child: const Text('Refresh'),
          ),
        ),
      ],
    );
  }

  Widget _bookingCard(Map<String, dynamic> booking) {
    final status = (booking['status'] ?? 'pending').toString();
    final style = _statusStyle(status);
    final rawDate = (booking['date'] ?? '').toString();
    final slot = (booking['timeSlot'] ?? '').toString();
    final partySize = booking['partySize'];
    final tableNumber = booking['tableNumber'];
    final notes = (booking['notes'] ?? '').toString();
    final id = (booking['_id'] ?? booking['id']).toString();
    final isCancelling = _cancellingId == id;

    return Container(
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
              Expanded(
                child: Text(
                  _restaurantName(booking),
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: style['bg'] as Color,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  style['label'] as String,
                  style: TextStyle(
                    color: style['color'] as Color,
                    fontSize: 11.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded,
                  size: 15, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(_dateLabel(rawDate),
                  style: const TextStyle(fontSize: 13.5)),
              const SizedBox(width: 14),
              const Icon(Icons.access_time_rounded,
                  size: 15, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  slot.isEmpty ? '-' : AvailableTable.formatSlot(slot),
                  style: const TextStyle(fontSize: 13.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.group_outlined, size: 15, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text('$partySize guests', style: const TextStyle(fontSize: 13.5)),
              if (tableNumber != null) ...[
                const SizedBox(width: 14),
                const Icon(Icons.table_bar_outlined,
                    size: 15, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Text('Table $tableNumber',
                    style: const TextStyle(fontSize: 13.5)),
              ],
            ],
          ),
          if (notes.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Notes: $notes',
              style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
            ),
          ],
          if (status == 'pending') ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(
                onPressed: isCancelling ? null : () => _cancel(booking),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.redAccent,
                  side: const BorderSide(color: Color(0xFFFECACA)),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: isCancelling
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Cancel reservation',
                        style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
