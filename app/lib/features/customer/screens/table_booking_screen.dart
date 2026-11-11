import 'package:flutter/material.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../services/auth_service.dart';
import '../../../services/booking_service.dart';
import '../../auth/screens/login_screen.dart';
import 'booking_confirmation_screen.dart';
import 'my_bookings_screen.dart';

class TableBookingScreen extends StatefulWidget {
  final String? restaurantId;
  final String? restaurantName;
  final String? restaurantAddress;

  const TableBookingScreen({
    Key? key,
    this.restaurantId,
    this.restaurantName,
    this.restaurantAddress,
  }) : super(key: key);

  @override
  _TableBookingScreenState createState() => _TableBookingScreenState();
}

class _TableBookingScreenState extends State<TableBookingScreen> {
  DateTime _selectedDate = DateTime.now();
  int _guestsCount = 2;
  int? _selectedTableNumber;
  String _selectedSlot = '';

  List<AvailableTable> _tables = [];
  bool _isLoadingTables = false;
  String? _tablesError;
  bool _isSubmitting = false;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  final Color jdkartOrange = const Color(0xFFF97316);

  @override
  void initState() {
    super.initState();
    final user = AuthService.instance.currentUser;
    if (user != null) {
      _nameController.text = user.name;
      _phoneController.text = user.phone;
    }
    if (widget.restaurantId == null || widget.restaurantId!.isEmpty) {
      _tablesError = 'Open a restaurant to reserve its table.';
    } else {
      _loadAvailability();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String get _displayName {
    if (widget.restaurantName != null && widget.restaurantName!.isNotEmpty) {
      return widget.restaurantName!;
    }
    return 'this restaurant';
  }

  String get _displayLocation {
    if (widget.restaurantAddress != null &&
        widget.restaurantAddress!.isNotEmpty) {
      return widget.restaurantAddress!;
    }
    return '';
  }

  String get _dateStr =>
      '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

  List<AvailableTable> get _tablesForGuests =>
      _tables.where((t) => t.maxGuests >= _guestsCount).toList();

  AvailableTable? get _selectedTable {
    final number = _selectedTableNumber;
    if (number == null) return null;
    final matches = _tables.where((t) => t.number == number);
    return matches.isEmpty ? null : matches.first;
  }

  Future<void> _loadAvailability() async {
    final restId = widget.restaurantId;
    if (restId == null || restId.isEmpty) return;

    setState(() {
      _isLoadingTables = true;
      _tablesError = null;
    });

    try {
      final tables =
          await BookingService.instance.getAvailableTables(restId, _dateStr);
      if (!mounted) return;
      setState(() {
        _tables = tables;
        _isLoadingTables = false;
        _syncSelection();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingTables = false;
        _tablesError = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoadingTables = false;
        _tablesError = 'Could not check table availability. Please try again.';
      });
    }
  }

  void _syncSelection() {
    final options = _tablesForGuests;
    if (_selectedTableNumber == null ||
        !options.any((t) => t.number == _selectedTableNumber)) {
      _selectedTableNumber = options.isEmpty ? null : options.first.number;
    }

    final slots = _selectedTable?.slots ?? [];
    if (!slots.contains(_selectedSlot)) {
      _selectedSlot = slots.isEmpty ? '' : slots.first;
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
      _loadAvailability();
    }
  }

  void _showSnack(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? Colors.redAccent : const Color(0xFF16A34A),
      ),
    );
  }

  Future<bool> _ensureLoggedIn() async {
    if (AuthService.instance.isAuthenticated) return true;
    final loggedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen(popOnSuccess: true)),
    );
    if (loggedIn == true && mounted) {
      final user = AuthService.instance.currentUser;
      if (user != null) {
        if (_nameController.text.trim().isEmpty) _nameController.text = user.name;
        if (_phoneController.text.trim().isEmpty) {
          _phoneController.text = user.phone;
        }
      }
      setState(() {});
      return true;
    }
    return false;
  }

  Future<void> _reviewAndSubmit() async {
    if (!await _ensureLoggedIn()) return;

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final table = _selectedTable;

    if (name.isEmpty) {
      _showSnack('Please enter your name.', error: true);
      return;
    }
    if (phone.isEmpty) {
      _showSnack('Please enter your contact phone number.', error: true);
      return;
    }
    if (table == null || _selectedSlot.isEmpty) {
      _showSnack('Select an available table and time slot first.', error: true);
      return;
    }

    final confirmed = await _showReviewSheet(
      name: name,
      phone: phone,
      table: table,
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isSubmitting = true);

    final result = await BookingService.instance.createBooking(
      restaurantId: widget.restaurantId!,
      tableNumber: table.number,
      timeSlot: _selectedSlot,
      partySize: _guestsCount,
      customerName: name,
      phone: phone,
      notes: _notesController.text.trim(),
      date: _dateStr,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result['success'] == true) {
      final booking = result['booking'] is Map
          ? Map<String, dynamic>.from(result['booking'] as Map)
          : <String, dynamic>{};
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => BookingConfirmationScreen(
            booking: booking.isEmpty
                ? {
                    'restaurantId': widget.restaurantId,
                    'tableNumber': table.number,
                    'timeSlot': _selectedSlot,
                    'partySize': _guestsCount,
                    'date': _dateStr,
                    'status': 'pending',
                  }
                : booking,
            restaurantName: _displayName,
            restaurantAddress: _displayLocation,
            message: result['message']?.toString() ??
                'The restaurant will confirm your table shortly.',
          ),
        ),
      );
    } else {
      _showSnack(
        result['message'] ?? 'Failed to book the table. Please try again.',
        error: true,
      );
      if (result['message']?.toString().toLowerCase().contains('slot') ==
          true) {
        _loadAvailability();
      }
    }
  }

  Future<bool?> _showReviewSheet({
    required String name,
    required String phone,
    required AvailableTable table,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Review your reservation',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
              ),
              const SizedBox(height: 4),
              Text(
                'Check the details before sending the request.',
                style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              _reviewRow(Icons.restaurant_rounded, 'Restaurant', _displayName),
              if (_displayLocation.isNotEmpty)
                _reviewRow(Icons.location_on_outlined, 'Location',
                    _displayLocation),
              _reviewRow(Icons.calendar_today_rounded, 'Date',
                  '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}'),
              _reviewRow(Icons.access_time_rounded, 'Time',
                  AvailableTable.formatSlot(_selectedSlot)),
              _reviewRow(Icons.group_outlined, 'Guests', '$_guestsCount people'),
              _reviewRow(Icons.table_bar_rounded, 'Table',
                  'Table ${table.number} (up to ${table.maxGuests} guests)'),
              _reviewRow(Icons.person_outline_rounded, 'Name', name),
              _reviewRow(Icons.call_outlined, 'Phone', phone),
              if (_notesController.text.trim().isNotEmpty)
                _reviewRow(Icons.notes_rounded, 'Notes',
                    _notesController.text.trim()),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: jdkartOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Confirm Reservation',
                      style: TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 14.5)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey[700],
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Go back and edit',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _reviewRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: jdkartOrange),
          const SizedBox(width: 8),
          SizedBox(
            width: 74,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Book a Table',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          IconButton(
            tooltip: 'My reservations',
            icon: const Icon(Icons.list_alt_rounded, color: Colors.black54),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Icon(Icons.table_restaurant_rounded,
                          color: jdkartOrange, size: 28),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _displayName,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (_displayLocation.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined,
                                  size: 14, color: Colors.grey),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  _displayLocation,
                                  style: TextStyle(
                                      color: Colors.grey[600], fontSize: 12.5),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (!AuthService.instance.isAuthenticated) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.lock_outline_rounded,
                        color: jdkartOrange, size: 20),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Log in to confirm your table reservation.',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                    TextButton(
                      onPressed: _ensureLoggedIn,
                      style: TextButton.styleFrom(foregroundColor: jdkartOrange),
                      child: const Text('Log in',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            const Text('Reservation Date',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today_rounded,
                            color: jdkartOrange, size: 18),
                        const SizedBox(width: 10),
                        Text(
                          '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ],
                    ),
                    const Icon(Icons.keyboard_arrow_down_rounded,
                        color: Colors.grey),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            const Text('Number of Guests',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(12, (i) {
                  final count = i + 1;
                  final isSel = _guestsCount == count;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text('$count ${count == 1 ? "Person" : "People"}'),
                      selected: isSel,
                      selectedColor: jdkartOrange,
                      labelStyle: TextStyle(
                        color: isSel ? Colors.white : Colors.black87,
                        fontWeight: FontWeight.bold,
                      ),
                      onSelected: (val) {
                        if (val) {
                          setState(() {
                            _guestsCount = count;
                            _syncSelection();
                          });
                        }
                      },
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 20),

            if (_isLoadingTables)
              _sectionCard(
                child: Row(
                  children: [
                    SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: jdkartOrange),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text('Checking live table availability…',
                          style: TextStyle(color: Colors.grey[700])),
                    ),
                  ],
                ),
              )
            else if (_tablesError != null)
              AppErrorState(message: _tablesError!, onRetry: _loadAvailability)
            else ...[
              _availabilitySection(),
            ],

            const SizedBox(height: 20),
            const Text('Contact Information',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Your Name *',
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number *',
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notesController,
                    decoration: const InputDecoration(
                      labelText: 'Special Requests / Notes (Optional)',
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting || _selectedTable == null
                    ? null
                    : _reviewAndSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: jdkartOrange,
                  disabledBackgroundColor: jdkartOrange.withValues(alpha: 0.45),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Text(
                        'Review & Reserve',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _sectionCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: child,
    );
  }

  Widget _availabilitySection() {
    final options = _tablesForGuests;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Available Tables',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            TextButton.icon(
              onPressed: _loadAvailability,
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Refresh'),
              style: TextButton.styleFrom(
                  foregroundColor: jdkartOrange,
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(60, 30)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (options.isEmpty)
          _sectionCard(
            child: Row(
              children: [
                Icon(Icons.event_busy_rounded, color: Colors.grey[600], size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'No table fits $_guestsCount guests on this date. '
                    'Try fewer guests or another day.',
                    style: TextStyle(color: Colors.grey[700], fontSize: 13.5),
                  ),
                ),
              ],
            ),
          )
        else ...[
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: options.map((table) {
              final isSel = _selectedTableNumber == table.number;
              return ChoiceChip(
                label: Text('Table ${table.number} • up to ${table.maxGuests}'),
                selected: isSel,
                selectedColor: jdkartOrange,
                labelStyle: TextStyle(
                  color: isSel ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
                onSelected: (val) {
                  if (val) {
                    setState(() {
                      _selectedTableNumber = table.number;
                      _selectedSlot =
                          table.slots.isEmpty ? '' : table.slots.first;
                    });
                  }
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          const Text('Select Time Slot',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          if ((_selectedTable?.slots ?? []).isEmpty)
            _sectionCard(
              child: Text('This table is fully booked for the selected date.',
                  style: TextStyle(color: Colors.grey[700], fontSize: 13.5)),
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: (_selectedTable?.slots ?? []).map((slot) {
                final isSel = _selectedSlot == slot;
                return ChoiceChip(
                  label: Text(AvailableTable.formatSlot(slot)),
                  selected: isSel,
                  selectedColor: jdkartOrange,
                  labelStyle: TextStyle(
                    color: isSel ? Colors.white : Colors.black87,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                  onSelected: (val) {
                    if (val) setState(() => _selectedSlot = slot);
                  },
                );
              }).toList(),
            ),
        ],
      ],
    );
  }
}
