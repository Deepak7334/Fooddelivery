import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/widgets/safe_image.dart';
import '../../../models/product_model.dart';
import '../../../models/restaurant_model.dart';
import '../../../services/booking_service.dart';
import '../../../services/restaurant_service.dart';
import 'restaurant_details_screen.dart';

class TableBookingDetailsScreen extends StatefulWidget {
  final RestaurantModel restaurant;

  const TableBookingDetailsScreen({Key? key, required this.restaurant})
      : super(key: key);

  @override
  _TableBookingDetailsScreenState createState() =>
      _TableBookingDetailsScreenState();
}

class _TableBookingDetailsScreenState extends State<TableBookingDetailsScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);

  late RestaurantModel _restaurant = widget.restaurant;
  List<FoodItemModel> _menu = [];
  bool _isLoadingMenu = true;

  DateTime _selectedDate = DateTime.now();
  List<AvailableTable> _tables = [];
  bool _isLoadingTables = true;
  String? _tablesError;

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    _loadAvailability();
  }

  String get _dateStr =>
      '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

  Future<void> _loadRestaurant() async {
    setState(() => _isLoadingMenu = true);
    try {
      final details = await RestaurantService.instance
          .getRestaurantDetails(_restaurant.id);
      if (!mounted) return;
      setState(() {
        if (details.restaurant != null) _restaurant = details.restaurant!;
        _menu = details.menu;
        _isLoadingMenu = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingMenu = false);
    }
  }

  Future<void> _loadAvailability() async {
    setState(() {
      _isLoadingTables = true;
      _tablesError = null;
    });
    try {
      final tables = await BookingService.instance
          .getAvailableTables(_restaurant.id, _dateStr);
      if (!mounted) return;
      setState(() {
        _tables = tables;
        _isLoadingTables = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingTables = false;
        _tablesError = e is ApiException
            ? e.message
            : 'Could not check table availability right now.';
      });
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

  void _viewFullMenu() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RestaurantDetailsScreen(
          restaurantId: _restaurant.id,
          restaurantName: _restaurant.name,
          restaurantImage: _restaurant.image,
          restaurantCuisine: _restaurant.cuisine.join(' • '),
          restaurantRating: _restaurant.rating.toStringAsFixed(1),
          restaurantDeliveryTime: _restaurant.deliveryTime,
          restaurantDeliveryFee: '₹${_restaurant.deliveryFee}',
        ),
      ),
    );
  }

  Future<void> _call() async {
    final phone = _restaurant.phone.trim();
    if (phone.isEmpty) return;
    try {
      await launchUrl(Uri(scheme: 'tel', path: phone),
          mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  List<String> get _galleryImages {
    final images = <String>[];
    for (final raw in [_restaurant.coverImage, _restaurant.image]) {
      final value = raw.trim();
      if (value.isNotEmpty && !images.contains(value)) images.add(value);
    }
    return images;
  }

  int get _totalFreeSlots =>
      _tables.fold<int>(0, (sum, table) => sum + table.slots.length);

  @override
  Widget build(BuildContext context) {
    final cover = _restaurant.coverImage.trim().isNotEmpty
        ? _restaurant.coverImage
        : _restaurant.image;
    final cuisine = _restaurant.cuisine.where((c) => c.trim().isNotEmpty);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: jdkartOrange,
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  SafeImage(
                    image: cover,
                    fit: BoxFit.cover,
                    placeholderIcon: Icons.restaurant_rounded,
                    iconColor: Colors.white,
                    placeholderColor: jdkartOrange,
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.45),
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.82),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 18,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.table_restaurant_rounded,
                                  color: Colors.white, size: 12),
                              SizedBox(width: 4),
                              Text(
                                'TABLE RESERVATION',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _restaurant.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        if (cuisine.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            cuisine.join(' • '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 12.5),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 980),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildInfoCard(),
                      const SizedBox(height: 16),
                      if (_restaurant.description.trim().isNotEmpty) ...[
                        _sectionTitle('About'),
                        _buildCard(
                          child: Text(
                            _restaurant.description,
                            style: const TextStyle(
                              fontSize: 13.5,
                              height: 1.45,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      _sectionTitle('Availability & seating'),
                      _buildAvailabilityCard(),
                      const SizedBox(height: 16),
                      _sectionTitle('Menu preview'),
                      _buildMenuPreview(),
                      const SizedBox(height: 16),
                      if (_galleryImages.length > 1) ...[
                        _sectionTitle('Gallery'),
                        SizedBox(
                          height: 120,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            physics: const BouncingScrollPhysics(),
                            itemCount: _galleryImages.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 10),
                            itemBuilder: (context, index) => SafeImage(
                              image: _galleryImages[index],
                              width: 180,
                              height: 120,
                              borderRadius: BorderRadius.circular(12),
                              placeholderIcon: Icons.photo_rounded,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      _sectionTitle('Ratings & reviews'),
                      _buildReviewsCard(),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 15.5,
          fontWeight: FontWeight.w900,
          color: Color(0xFF1E293B),
        ),
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: child,
    );
  }

  Widget _buildInfoCard() {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF267E3E),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _restaurant.rating.toStringAsFixed(1),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 2),
                    const Icon(Icons.star, color: Colors.white, size: 11),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _restaurant.totalRatings > 0
                    ? '${_restaurant.totalRatings} ratings'
                    : 'New on JDKart',
                style: const TextStyle(
                    color: Color(0xFF64748B), fontSize: 12),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _restaurant.isOpen
                      ? const Color(0xFFF0FDF4)
                      : const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _restaurant.isOpen ? 'Open now' : 'Currently closed',
                  style: TextStyle(
                    color: _restaurant.isOpen
                        ? const Color(0xFF15803D)
                        : const Color(0xFFB91C1C),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_outlined,
                  size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  [_restaurant.address, _restaurant.city]
                          .where((s) => s.trim().isNotEmpty)
                          .join(', ')
                          .isEmpty
                      ? 'Address available at the restaurant'
                      : [_restaurant.address, _restaurant.city]
                          .where((s) => s.trim().isNotEmpty)
                          .join(', '),
                  style: const TextStyle(
                      color: Color(0xFF475569), fontSize: 12.5, height: 1.4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.payments_outlined,
                  size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                'Minimum order ₹${_restaurant.minOrder}',
                style:
                    const TextStyle(color: Color(0xFF475569), fontSize: 12.5),
              ),
            ],
          ),
          if (_restaurant.phone.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.call_outlined,
                    size: 16, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    _restaurant.phone,
                    style: const TextStyle(
                        color: Color(0xFF475569), fontSize: 12.5),
                  ),
                ),
                TextButton(
                  onPressed: _call,
                  style: TextButton.styleFrom(
                    foregroundColor: jdkartOrange,
                    minimumSize: const Size(0, 30),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: const Text('Call',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAvailabilityCard() {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13.5),
                ),
              ),
              TextButton.icon(
                onPressed: _pickDate,
                icon: const Icon(Icons.calendar_today_rounded, size: 15),
                label: const Text('Change date'),
                style: TextButton.styleFrom(
                  foregroundColor: jdkartOrange,
                  minimumSize: const Size(0, 30),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  textStyle: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (_isLoadingTables)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Color(0xFFF97316)),
                  ),
                  SizedBox(width: 10),
                  Text('Checking live table availability…',
                      style: TextStyle(fontSize: 12.5)),
                ],
              ),
            )
          else if (_tablesError != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_tablesError!,
                    style: const TextStyle(
                        color: Color(0xFFB91C1C), fontSize: 12.5)),
                const SizedBox(height: 6),
                TextButton(
                  onPressed: _loadAvailability,
                  style: TextButton.styleFrom(
                    foregroundColor: jdkartOrange,
                    minimumSize: const Size(0, 30),
                    padding: EdgeInsets.zero,
                  ),
                  child: const Text('Retry',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ],
            )
          else if (_tables.isEmpty)
            const Text(
              'No tables are available for this date. Try another date.',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 12.5),
            )
          else ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _tables
                  .map((table) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.table_bar_rounded,
                                size: 14, color: Color(0xFF15803D)),
                            const SizedBox(width: 5),
                            Text(
                              'Table ${table.number} · up to ${table.maxGuests} guests · ${table.slots.length} slots',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF166534),
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
            Text(
              '$_totalFreeSlots time slots free — confirmed live by the restaurant.',
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11.5),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuPreview() {
    if (_isLoadingMenu) {
      return _buildCard(
        child: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Color(0xFFF97316)),
            ),
            const SizedBox(width: 10),
            Text('Loading menu…',
                style: TextStyle(color: Colors.grey[700], fontSize: 12.5)),
          ],
        ),
      );
    }
    if (_menu.isEmpty) {
      return _buildCard(
        child: Text(
          'The restaurant has not published a menu yet.',
          style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
        ),
      );
    }

    final preview = _menu.take(6).toList();
    return Column(
      children: [
        _buildCard(
          child: Column(
            children: [
              for (var i = 0; i < preview.length; i++) ...[
                if (i > 0) const Divider(height: 18),
                _menuRow(preview[i]),
              ],
            ],
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: _viewFullMenu,
            icon: const Icon(Icons.arrow_forward_rounded, size: 16),
            label: Text(
              'View full menu (${_menu.length})',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            style: TextButton.styleFrom(foregroundColor: jdkartOrange),
          ),
        ),
      ],
    );
  }

  Widget _menuRow(FoodItemModel item) {
    final price = item.discountedPrice ?? item.price;
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(3),
            border: Border.all(
                color: item.isVeg ? Colors.green : Colors.red, width: 1.4),
          ),
          child: Center(
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: item.isVeg ? Colors.green : Colors.red,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            item.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '₹$price',
          style: const TextStyle(
              fontWeight: FontWeight.w800, fontSize: 12.5),
        ),
      ],
    );
  }

  Widget _buildReviewsCard() {
    if (_restaurant.totalRatings == 0) {
      return _buildCard(
        child: Text(
          'No customer ratings yet. Be one of the first to dine here.',
          style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
        ),
      );
    }
    return _buildCard(
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _restaurant.rating.toStringAsFixed(1),
                style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1E293B)),
              ),
              Row(
                children: List.generate(5, (index) {
                  final filled = index < _restaurant.rating.round();
                  return Icon(
                    filled ? Icons.star_rounded : Icons.star_border_rounded,
                    size: 15,
                    color: const Color(0xFFF59E0B),
                  );
                }),
              ),
            ],
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Text(
              'Based on ${_restaurant.totalRatings} verified customer ${_restaurant.totalRatings == 1 ? 'rating' : 'ratings'}.',
              style: const TextStyle(
                  color: Color(0xFF64748B), fontSize: 12.5, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
