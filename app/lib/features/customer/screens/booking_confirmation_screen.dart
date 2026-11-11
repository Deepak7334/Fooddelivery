import 'package:flutter/material.dart';

import '../../../services/booking_service.dart';
import 'my_bookings_screen.dart';

class BookingConfirmationScreen extends StatelessWidget {
  final Map<String, dynamic> booking;
  final String restaurantName;
  final String restaurantAddress;
  final String message;

  const BookingConfirmationScreen({
    Key? key,
    required this.booking,
    required this.restaurantName,
    this.restaurantAddress = '',
    this.message = '',
  }) : super(key: key);

  static const Color jdkartOrange = Color(0xFFF97316);

  String get _status => (booking['status'] ?? 'pending').toString();

  String get _statusLabel {
    return switch (_status) {
      'confirmed' => 'Confirmed',
      'rejected' => 'Rejected',
      'cancelled' => 'Cancelled',
      _ => 'Awaiting confirmation',
    };
  }

  Color get _statusColor {
    return switch (_status) {
      'confirmed' => const Color(0xFF15803D),
      'rejected' => const Color(0xFFB91C1C),
      'cancelled' => const Color(0xFF64748B),
      _ => const Color(0xFFB45309),
    };
  }

  Color get _statusBg {
    return switch (_status) {
      'confirmed' => const Color(0xFFF0FDF4),
      'rejected' => const Color(0xFFFEF2F2),
      'cancelled' => const Color(0xFFF1F5F9),
      _ => const Color(0xFFFFFBEB),
    };
  }

  String get _dateLabel {
    final raw = (booking['date'] ?? '').toString();
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw.isEmpty ? '—' : raw;
    final local = parsed.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  String get _slotLabel {
    final raw = (booking['timeSlot'] ?? '').toString();
    if (raw.isEmpty) return '—';
    return AvailableTable.formatSlot(raw);
  }

  @override
  Widget build(BuildContext context) {
    final partySize = booking['partySize'];
    final tableNumber = booking['tableNumber'];
    final code = BookingService.displayCode(booking);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 74,
                      height: 74,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF0FDF4),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_rounded,
                          color: Color(0xFF16A34A), size: 42),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Center(
                    child: Text(
                      'Reservation request sent',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      message.isNotEmpty
                          ? message
                          : 'The restaurant will review and confirm your table shortly.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 13,
                          height: 1.4),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Booking ID',
                                style: TextStyle(
                                    color: Color(0xFF64748B),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _statusBg,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                _statusLabel,
                                style: TextStyle(
                                  color: _statusColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          code,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const Divider(height: 26),
                        _detailRow(Icons.restaurant_rounded, 'Restaurant',
                            restaurantName),
                        if (restaurantAddress.trim().isNotEmpty)
                          _detailRow(Icons.location_on_outlined, 'Location',
                              restaurantAddress),
                        _detailRow(Icons.calendar_today_rounded, 'Date',
                            _dateLabel),
                        _detailRow(Icons.access_time_rounded, 'Time',
                            _slotLabel),
                        _detailRow(
                            Icons.group_outlined,
                            'Guests',
                            partySize == null
                                ? '—'
                                : '$partySize ${partySize == 1 ? 'person' : 'people'}'),
                        if (tableNumber != null)
                          _detailRow(Icons.table_bar_rounded, 'Table',
                              'Table $tableNumber'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFED7AA)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline_rounded,
                            size: 18, color: jdkartOrange),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Save your booking ID. You can track the status anytime under My Reservations.',
                            style: TextStyle(
                                fontSize: 12,
                                height: 1.4,
                                color: Color(0xFF7C2D12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const MyBookingsScreen()),
                      ),
                      icon: const Icon(Icons.list_alt_rounded, size: 18),
                      label: const Text('View My Reservations',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: jdkartOrange,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.popUntil(
                          context, (route) => route.isFirst),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF334155),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      child: const Text('Back to Home',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: jdkartOrange),
          const SizedBox(width: 8),
          SizedBox(
            width: 78,
            child: Text(
              label,
              style: const TextStyle(
                  color: Color(0xFF64748B), fontSize: 12.5),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 12.5),
            ),
          ),
        ],
      ),
    );
  }
}
