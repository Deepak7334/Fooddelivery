import 'package:flutter/material.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../../core/widgets/safe_image.dart';
import '../../../models/restaurant_model.dart';
import '../../../services/booking_service.dart';
import '../../../services/location_service.dart';
import 'my_bookings_screen.dart';
import 'restaurant_details_screen.dart';
import 'select_location_screen.dart';
import 'table_booking_details_screen.dart';
import 'table_booking_screen.dart';
import '../../../core/utils/format.dart';
import '../../../core/network/api_client.dart';

class TableBookingDiscoveryScreen extends StatefulWidget {
  const TableBookingDiscoveryScreen({Key? key}) : super(key: key);

  @override
  State<TableBookingDiscoveryScreen> createState() =>
      _TableBookingDiscoveryScreenState();
}

class _TableBookingDiscoveryScreenState
    extends State<TableBookingDiscoveryScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);
  final TextEditingController _searchController = TextEditingController();

  String _search = '';
  String? _cuisineFilter;
  String _priceFilter = 'all';
  String _sortBy = 'popular';
  bool _onlyAvailableToday = false;

  List<RestaurantModel> _restaurants = [];
  Map<String, List<AvailableTable>?> _availability = {};
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    LocationService.instance.init().then((_) {
      if (mounted) setState(() {});
    });
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String get _todayStr {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await LocationService.instance.init();
      final restaurants = await BookingService.instance.getBookableRestaurants(
        lat: LocationService.instance.activeLat,
        lng: LocationService.instance.activeLng,
      );
      final availability =
          await Future.wait(restaurants.map((r) => _safeAvailability(r.id)));
      if (!mounted) return;
      setState(() {
        _restaurants = restaurants;
        _availability = {
          for (var i = 0; i < restaurants.length; i++)
            restaurants[i].id: availability[i],
        };
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiException
            ? e.message
            : 'Could not load restaurants. Please try again.';
        _isLoading = false;
      });
    }
  }

  Future<List<AvailableTable>?> _safeAvailability(String restaurantId) async {
    if (restaurantId.isEmpty) return null;
    try {
      return await BookingService.instance
          .getAvailableTables(restaurantId, _todayStr);
    } catch (_) {
      return null;
    }
  }

  int? _freeTables(RestaurantModel restaurant) =>
      _availability.containsKey(restaurant.id)
          ? _availability[restaurant.id]?.length
          : null;

  List<String> get _cuisineOptions {
    final set = <String>{};
    for (final r in _restaurants) {
      for (final c in r.cuisine) {
        final value = c.trim();
        if (value.isNotEmpty) set.add(value);
      }
    }
    final list = set.toList()..sort();
    return list;
  }

  List<RestaurantModel> get _filteredRestaurants {
    List<RestaurantModel> list = [..._restaurants];
    final query = _search.trim().toLowerCase();

    if (query.isNotEmpty) {
      list = list.where((r) {
        return r.name.toLowerCase().contains(query) ||
            r.address.toLowerCase().contains(query) ||
            r.city.toLowerCase().contains(query) ||
            r.cuisine.any((c) => c.toLowerCase().contains(query));
      }).toList();
    }

    final cuisine = _cuisineFilter;
    if (cuisine != null) {
      list = list.where((r) {
        return r.cuisine.any(
            (c) => c.trim().toLowerCase() == cuisine.toLowerCase());
      }).toList();
    }

    switch (_priceFilter) {
      case 'under200':
        list = list.where((r) => r.minOrder <= 200).toList();
        break;
      case '200to400':
        list = list
            .where((r) => r.minOrder > 200 && r.minOrder <= 400)
            .toList();
        break;
      case 'above400':
        list = list.where((r) => r.minOrder > 400).toList();
        break;
    }

    if (_onlyAvailableToday) {
      list = list.where((r) => (_freeTables(r) ?? 0) > 0).toList();
    }

    switch (_sortBy) {
      case 'rating':
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case 'price':
        list.sort((a, b) => a.minOrder.compareTo(b.minOrder));
        break;
      default:
        list.sort((a, b) {
          final byRatings = b.totalRatings.compareTo(a.totalRatings);
          return byRatings != 0 ? byRatings : b.rating.compareTo(a.rating);
        });
    }
    return list;
  }

  Future<void> _changeLocation() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SelectLocationScreen()),
    );
    if (result != null && result is Map<String, dynamic> && mounted) {
      await _load();
    }
  }

  void _openDetails(RestaurantModel restaurant) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TableBookingDetailsScreen(restaurant: restaurant),
      ),
    );
  }

  String _availabilityLabel(RestaurantModel restaurant) {
    final free = _freeTables(restaurant);
    if (free == null) return 'Live availability unavailable';
    if (free == 0) return 'No tables available today';
    return '$free ${free == 1 ? 'table' : 'tables'} free today';
  }

  Color _availabilityColor(RestaurantModel restaurant) {
    final free = _freeTables(restaurant);
    if (free == null) return const Color(0xFF64748B);
    if (free == 0) return const Color(0xFFDC2626);
    return const Color(0xFF15803D);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1E293B)),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Book a Table',
              style: TextStyle(
                color: Color(0xFF1E293B),
                fontWeight: FontWeight.w900,
                fontSize: 19,
              ),
            ),
            Text(
              'Discover & reserve restaurants near you',
              style: TextStyle(color: Colors.grey, fontSize: 11.5),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'My reservations',
            icon: const Icon(Icons.list_alt_rounded, color: Color(0xFF1E293B)),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : _error != null && _restaurants.isEmpty
              ? AppErrorState(message: _error!, onRetry: () { ApiClient.instance.clearCache(); _load(); })
              : Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 980),
                    child: RefreshIndicator(
                      onRefresh: () { ApiClient.instance.clearCache(); return _load(); },
                      color: jdkartOrange,
                      child: CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(
                            parent: BouncingScrollPhysics()),
                        slivers: [
                          SliverToBoxAdapter(child: _buildLocationBar()),
                          SliverToBoxAdapter(child: _buildSearchBar()),
                          SliverToBoxAdapter(child: _buildFilterBar()),
                          SliverToBoxAdapter(child: _buildCountRow()),
                          if (_filteredRestaurants.isEmpty)
                            SliverToBoxAdapter(child: _buildEmptyState())
                          else
                            SliverPadding(
                              padding:
                                  const EdgeInsets.fromLTRB(16, 0, 16, 120),
                              sliver: SliverList(
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) {
                                    final restaurant =
                                        _filteredRestaurants[index];
                                    return _buildRestaurantCard(restaurant);
                                  },
                                  childCount: _filteredRestaurants.length,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }

  Widget _buildLocationBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Icon(Icons.location_on_rounded, size: 18, color: jdkartOrange),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                LocationService.instance.isLocationSet
                    ? LocationService.instance.selectedAddress
                    : 'Set your location to see nearby tables',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF334155),
                ),
              ),
            ),
            TextButton(
              onPressed: _changeLocation,
              style: TextButton.styleFrom(
                foregroundColor: jdkartOrange,
                minimumSize: const Size(0, 30),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: const Text('Change',
                  style:
                      TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (value) => setState(() => _search = value),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            prefixIcon:
                const Icon(Icons.search_rounded, color: Colors.grey, size: 22),
            suffixIcon: _search.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18, color: Colors.grey),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _search = '');
                    },
                  )
                : null,
            hintText: 'Search restaurants, cuisines or areas...',
            hintStyle: TextStyle(color: Colors.grey[500], fontSize: 13.5),
            border: InputBorder.none,
          ),
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    final cuisines = _cuisineOptions;
    return SizedBox(
      height: 42,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        physics: const BouncingScrollPhysics(),
        children: [
          _filterChip(
            icon: Icons.event_available_rounded,
            label: 'Available today',
            selected: _onlyAvailableToday,
            onTap: () =>
                setState(() => _onlyAvailableToday = !_onlyAvailableToday),
          ),
          const SizedBox(width: 8),
          for (final cuisine in cuisines) ...[
            _filterChip(
              label: cuisine,
              selected: _cuisineFilter == cuisine,
              onTap: () => setState(() {
                _cuisineFilter = _cuisineFilter == cuisine ? null : cuisine;
              }),
            ),
            const SizedBox(width: 8),
          ],
          _filterChip(
            label: 'Under ₹200',
            selected: _priceFilter == 'under200',
            onTap: () => setState(() {
              _priceFilter = _priceFilter == 'under200' ? 'all' : 'under200';
            }),
          ),
          const SizedBox(width: 8),
          _filterChip(
            label: '₹200–400',
            selected: _priceFilter == '200to400',
            onTap: () => setState(() {
              _priceFilter = _priceFilter == '200to400' ? 'all' : '200to400';
            }),
          ),
          const SizedBox(width: 8),
          _filterChip(
            label: '₹400+',
            selected: _priceFilter == 'above400',
            onTap: () => setState(() {
              _priceFilter = _priceFilter == 'above400' ? 'all' : 'above400';
            }),
          ),
        ],
      ),
    );
  }

  Widget _filterChip({
    IconData? icon,
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFFFF7ED) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? jdkartOrange : const Color(0xFFE2E8F0),
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon,
                  size: 14,
                  color: selected ? jdkartOrange : const Color(0xFF475569)),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected ? jdkartOrange : const Color(0xFF334155),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountRow() {
    final count = _filteredRestaurants.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '$count ${count == 1 ? 'restaurant' : 'restaurants'}',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 14,
              color: Color(0xFF1E293B),
            ),
          ),
          PopupMenuButton<String>(
            initialValue: _sortBy,
            onSelected: (value) => setState(() => _sortBy = value),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.sort_rounded,
                      size: 16, color: Color(0xFF334155)),
                  const SizedBox(width: 4),
                  Text(
                    _sortBy == 'rating'
                        ? 'Top rated'
                        : _sortBy == 'price'
                            ? 'Price'
                            : 'Popular',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'popular', child: Text('Most popular')),
              PopupMenuItem(value: 'rating', child: Text('Top rated')),
              PopupMenuItem(
                  value: 'price', child: Text('Price: low to high')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final hasFilters = _search.trim().isNotEmpty ||
        _cuisineFilter != null ||
        _priceFilter != 'all' ||
        _onlyAvailableToday;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 28),
      child: Column(
        children: [
          Icon(Icons.table_restaurant_outlined,
              size: 54, color: Colors.grey[400]),
          const SizedBox(height: 12),
          Text(
            _restaurants.isEmpty
                ? 'No restaurants take reservations in your area yet'
                : 'No restaurants match your filters',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 6),
          Text(
            _restaurants.isEmpty
                ? 'Try changing your delivery location and check again.'
                : 'Try clearing the search or filters to see all restaurants.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
          if (hasFilters) ...[
            const SizedBox(height: 14),
            OutlinedButton(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _search = '';
                  _cuisineFilter = null;
                  _priceFilter = 'all';
                  _onlyAvailableToday = false;
                  _sortBy = 'popular';
                });
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: jdkartOrange,
                side: BorderSide(color: jdkartOrange),
              ),
              child: const Text('Clear filters'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRestaurantCard(RestaurantModel restaurant) {
    final image =
        restaurant.coverImage.isNotEmpty ? restaurant.coverImage : restaurant.image;
    final cuisines = restaurant.cuisine.where((c) => c.trim().isNotEmpty).toList();
    final free = _freeTables(restaurant);

    return GestureDetector(
      onTap: () => _openDetails(restaurant),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                SafeImage(
                  image: image,
                  height: 150,
                  width: double.infinity,
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(18)),
                  fit: BoxFit.cover,
                  placeholderIcon: Icons.restaurant_rounded,
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.62),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.table_restaurant_rounded,
                            color: Colors.white, size: 12),
                        SizedBox(width: 4),
                        Text(
                          'TABLE BOOKING',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
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
                          restaurant.rating.toStringAsFixed(1),
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 2),
                        const Icon(Icons.star, color: Colors.white, size: 11),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          restaurant.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      if (restaurant.totalRatings > 0)
                        Text(
                          '${restaurant.totalRatings} ratings',
                          style: const TextStyle(
                              color: Color(0xFF64748B), fontSize: 11.5),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 14, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          restaurant.address.isNotEmpty
                              ? restaurant.address
                              : restaurant.city,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: Color(0xFF64748B), fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  if (cuisines.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: cuisines
                          .take(3)
                          .map((c) => Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                      color: const Color(0xFFE2E8F0)),
                                ),
                                child: Text(
                                  c,
                                  style: const TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF475569)),
                                ),
                              ))
                          .toList(),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 12,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        'Min order ${formatPrice(restaurant.minOrder)}',
                        style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF334155)),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.event_seat_rounded,
                              size: 13, color: _availabilityColor(restaurant)),
                          const SizedBox(width: 4),
                          Text(
                            _availabilityLabel(restaurant),
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: _availabilityColor(restaurant),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => RestaurantDetailsScreen(
                                restaurantId: restaurant.id,
                                restaurantName: restaurant.name,
                                restaurantImage: restaurant.image,
                                restaurantCuisine: cuisines.join(' • '),
                                restaurantRating:
                                    restaurant.rating.toStringAsFixed(1),
                                restaurantDeliveryTime:
                                    restaurant.deliveryTime,
                                restaurantDeliveryFee:
                                    formatPrice(restaurant.deliveryFee),
                              ),
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: jdkartOrange,
                            side: BorderSide(
                                color: jdkartOrange.withValues(alpha: 0.7)),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(9)),
                          ),
                          child: const Text('View Menu',
                              style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w800)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => TableBookingScreen(
                                restaurantId: restaurant.id,
                                restaurantName: restaurant.name,
                                restaurantAddress: restaurant.address,
                              ),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: jdkartOrange,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(9)),
                          ),
                          child: const Text('Reserve Table',
                              style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w800)),
                        ),
                      ),
                    ],
                  ),
                  if (free == 0 && _availability[restaurant.id] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'No tables available for today — try another date.',
                        style: TextStyle(
                            color: Colors.grey[600], fontSize: 11.5),
                      ),
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
