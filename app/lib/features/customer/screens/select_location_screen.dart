import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../../models/address_model.dart';
import '../../../services/address_service.dart';
import '../../../services/location_service.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import 'addresses_screen.dart';

class SelectLocationScreen extends StatefulWidget {
  const SelectLocationScreen({Key? key}) : super(key: key);

  @override
  State<SelectLocationScreen> createState() => _SelectLocationScreenState();
}

class _SelectLocationScreenState extends State<SelectLocationScreen> with WidgetsBindingObserver {
  final TextEditingController _searchController = TextEditingController();
  static const Color _jdkartOrange = Color(0xFFF97316);
  static const Color _jdkartSlate = Color(0xFF1E293B);

  List<AddressModel> _savedAddresses = [];
  List<Map<String, dynamic>> _recentSearches = [];
  bool _isLoading = true;
  String? _error;
  bool _isDetectingGps = false;
  bool _waitingForSettingsReturn = false;
  String _searchQuery = '';
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadLocationData();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.trim().toLowerCase();
        if (_searchQuery.isEmpty) {
          _searchResults = [];
          _isSearching = false;
        }
      });
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed || !_waitingForSettingsReturn) return;
    _waitingForSettingsReturn = false;
    _handleUseCurrentLocation();
  }

  Future<void> _loadLocationData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await LocationService.instance.init();
      final addresses = await AddressService.instance.getAddresses();
      final recent = await LocationService.instance.getRecentlySearched();

      if (mounted) {
        setState(() {
          _savedAddresses = addresses;
          _recentSearches = recent;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load your locations. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  /// Calculate distance from user's current coordinates to target
  String _getDistanceString(double? targetLat, double? targetLng) {
    if (targetLat == null || targetLng == null) {
      return '—';
    }
    final currentLat = LocationService.instance.selectedLat;
    final currentLng = LocationService.instance.selectedLng;
    final km = LocationService.instance.calculateDistanceKm(currentLat, currentLng, targetLat, targetLng);
    return LocationService.instance.formatDistance(km);
  }

  /// Handle "Use Current Location" — always a fresh GPS fix, never a fake fallback.
  Future<void> _handleUseCurrentLocation() async {
    if (_isDetectingGps) return;
    setState(() => _isDetectingGps = true);

    try {
      // 1. Device location (GPS) must be switched on.
      if (!await Geolocator.isLocationServiceEnabled()) {
        if (!mounted) return;
        setState(() => _isDetectingGps = false);
        final turnOn = await _showSettingsDialog(
          title: 'Location is turned off',
          message: 'Turn on location (GPS) so we can detect your exact delivery address.',
          actionLabel: 'Turn On',
        );
        if (turnOn == true) {
          _waitingForSettingsReturn = true;
          await Geolocator.openLocationSettings();
        }
        return;
      }

      // 2. App must hold location permission.
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (!mounted) return;

      if (permission == LocationPermission.deniedForever) {
        setState(() => _isDetectingGps = false);
        final open = await _showSettingsDialog(
          title: 'Location permission needed',
          message: 'Allow location access for JDKart in app settings to detect your address.',
          actionLabel: 'Open Settings',
        );
        if (open == true) {
          _waitingForSettingsReturn = true;
          await Geolocator.openAppSettings();
        }
        return;
      }
      if (permission == LocationPermission.denied) {
        setState(() => _isDetectingGps = false);
        _showGpsMessage('Location permission is required to detect your address.', isError: true);
        return;
      }

      // 3. Fresh high-accuracy fix + reverse geocode.
      _showGpsMessage('Detecting your GPS location...');
      final result = await LocationService.instance.getCurrentLocation();
      if (!mounted) return;
      setState(() => _isDetectingGps = false);

      if (result != null) {
        Navigator.pop(context, result);
      } else {
        _showGpsMessage(
          'Could not get a GPS fix. Keep location on, move near a window and try again.',
          isError: true,
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _isDetectingGps = false);
      _showGpsMessage('Could not detect your location. Please try again.', isError: true);
    }
  }

  Future<bool?> _showSettingsDialog({
    required String title,
    required String message,
    required String actionLabel,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        content: Text(message, style: const TextStyle(fontSize: 13.5, height: 1.4)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Not now', style: TextStyle(color: Color(0xFF64748B))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(actionLabel, style: const TextStyle(color: _jdkartOrange, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  void _showGpsMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? const Color(0xFFB91C1C) : _jdkartSlate,
        duration: Duration(seconds: isError ? 4 : 2),
      ),
    );
  }

  /// Handle "Add New Address"
  Future<void> _handleAddNewAddress() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AddressesScreen()),
    );
    if (!mounted) return;
    _loadLocationData();
  }

  /// Handle "Request Address" via WhatsApp
  Future<void> _handleRequestAddress() async {
    const phone = '917488090510'; // JDKart customer support
    const msg = 'Hi JDKart, I would like to request food delivery service at my address: ';
    final uri = Uri.parse('https://wa.me/$phone?text=${Uri.encodeComponent(msg)}');

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to open WhatsApp. Please contact support at +91 7488090510.')),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch WhatsApp.')),
      );
    }
  }

  /// Select a saved address
  void _selectSavedAddress(AddressModel addr) {
    final lat = addr.latitude ?? LocationService.defaultLat;
    final lng = addr.longitude ?? LocationService.defaultLng;

    LocationService.instance.setSelectedLocation(
      title: addr.label.isNotEmpty ? addr.label : 'Home',
      address: addr.fullAddress,
      lat: lat,
      lng: lng,
    );

    Navigator.pop(context, {
      'title': addr.label,
      'address': addr.fullAddress,
      'lat': lat,
      'lng': lng,
    });
  }

  /// Select a recent search
  void _selectRecentSearch(Map<String, dynamic> item) {
    final lat = (item['lat'] is num) ? (item['lat'] as num).toDouble() : LocationService.defaultLat;
    final lng = (item['lng'] is num) ? (item['lng'] as num).toDouble() : LocationService.defaultLng;
    final title = item['title'] ?? 'Selected Location';
    final address = item['address'] ?? '';

    LocationService.instance.setSelectedLocation(
      title: title,
      address: address,
      lat: lat,
      lng: lng,
    );

    Navigator.pop(context, {
      'title': title,
      'address': address,
      'lat': lat,
      'lng': lng,
    });
  }

  /// Geocode a free-text query into selectable address results.
  Future<void> _performSearch(String query) async {
    final q = query.trim();
    if (q.length < 3) return;

    setState(() {
      _isSearching = true;
      _searchResults = [];
    });

    try {
      final results = await LocationService.instance.searchPlaces(q);
      if (!mounted) return;

      setState(() {
        _searchResults = results;
        _isSearching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      _showGpsMessage(
        e is ApiException ? e.message : 'Could not search that place. Please try again.',
        isError: true,
      );
    }
  }

  void _selectSearchResult(Map<String, dynamic> item) {
    final lat = (item['lat'] as num?)?.toDouble() ?? LocationService.defaultLat;
    final lng = (item['lng'] as num?)?.toDouble() ?? LocationService.defaultLng;

    final address = (item['address'] as String?)?.trim() ?? '';
    final title = (item['title'] as String?)?.trim() ?? 'Selected Location';

    LocationService.instance.setSelectedLocation(
      title: title,
      address: address.isEmpty ? _searchQuery : address,
      lat: lat,
      lng: lng,
    );

    Navigator.pop(context, {
      'title': title,
      'address': address.isEmpty ? _searchQuery : address,
      'lat': lat,
      'lng': lng,
    });
  }

  Widget _buildSearchResultTile(Map<String, dynamic> item) {
    final lat = (item['lat'] as num?)?.toDouble() ?? LocationService.defaultLat;
    final lng = (item['lng'] as num?)?.toDouble() ?? LocationService.defaultLng;
    final address = (item['address'] as String?) ?? '';
    final title = (item['title'] as String?) ?? 'Selected Location';
    final distanceStr = _getDistanceString(lat, lng);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.8), width: 1.0),
      ),
      child: ListTile(
        onTap: () => _selectSearchResult(item),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.location_on_outlined, size: 20, color: _jdkartSlate),
              const SizedBox(height: 3),
              Text(
                distanceStr,
                style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5, color: _jdkartSlate),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(
            address,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 13, height: 1.3),
          ),
        ),
      ),
    );
  }

  IconData _getIconForLabel(String label) {
    switch (label.toUpperCase()) {
      case 'HOME':
        return Icons.home_outlined;
      case 'WORK':
      case 'OFFICE':
        return Icons.work_outline_rounded;
      default:
        return Icons.location_on_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Filter saved addresses based on search query
    final filteredSaved = _savedAddresses.where((a) {
      if (_searchQuery.isEmpty) return true;
      return a.label.toLowerCase().contains(_searchQuery) ||
          a.fullAddress.toLowerCase().contains(_searchQuery);
    }).toList();

    // Filter recent searches based on search query
    final filteredRecent = _recentSearches.where((r) {
      if (_searchQuery.isEmpty) return true;
      final title = (r['title'] ?? '').toString().toLowerCase();
      final address = (r['address'] ?? '').toString().toLowerCase();
      return title.contains(_searchQuery) || address.contains(_searchQuery);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: _jdkartSlate, size: 24),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Select Your Location',
          style: TextStyle(
            color: _jdkartSlate,
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: _jdkartOrange),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Search Box
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                    ),
                    child: TextField(
                      controller: _searchController,
                      textInputAction: TextInputAction.search,
                      onSubmitted: _performSearch,
                      decoration: const InputDecoration(
                        hintText: 'Search an area or address',
                        hintStyle: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 15,
                          fontWeight: FontWeight.w400,
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                        suffixIcon: Icon(Icons.search, color: Color(0xFF64748B), size: 24),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 1b. Geocoded search results
                  if (_searchQuery.isNotEmpty) ...[
                    if (_isSearching)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: CircularProgressIndicator(color: _jdkartOrange),
                        ),
                      )
                    else if (_searchResults.isNotEmpty) ...[
                      const Text(
                        'SEARCH RESULTS',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ..._searchResults.map((p) => _buildSearchResultTile(p)),
                    ] else
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text(
                            'No results for "$_searchQuery". Try a nearby area or landmark.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey[600], fontSize: 13.5),
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                  ],

                  // 2. Three Action Cards
                  Row(
                    children: [
                      // Use Current Location
                      _buildActionCard(
                        icon: Icons.my_location_rounded,
                        iconColor: _jdkartOrange,
                        title: 'Use Current\nLocation',
                        isLoading: _isDetectingGps,
                        onTap: _isDetectingGps ? () {} : _handleUseCurrentLocation,
                      ),
                      const SizedBox(width: 10),

                      // Add New Address
                      _buildActionCard(
                        icon: Icons.add_box_outlined,
                        iconColor: _jdkartOrange,
                        title: 'Add New\nAddress',
                        onTap: _handleAddNewAddress,
                      ),
                      const SizedBox(width: 10),

                      // Request Address
                      _buildActionCard(
                        icon: Icons.chat_bubble_outline_rounded,
                        iconColor: const Color(0xFF25D366),
                        title: 'Request\nAddress',
                        onTap: _handleRequestAddress,
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // 2b. Remove current location (only when one is set)
                  if (LocationService.instance.isLocationSet) ...[
                    _buildRemoveLocationCard(),
                    const SizedBox(height: 20),
                  ],

                  // 3. SAVED ADDRESSES Section
                  if (_searchQuery.isEmpty && _error != null && _savedAddresses.isEmpty)
                    AppErrorState(message: _error!, onRetry: _loadLocationData)
                  else if (_searchQuery.isEmpty && filteredSaved.isNotEmpty) ...[
                    const Text(
                      'SAVED ADDRESSES',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...filteredSaved.map((addr) => _buildSavedAddressTile(addr)),
                    const SizedBox(height: 20),
                  ],

                  // 4. RECENTLY SEARCHED Section
                  if (_searchQuery.isEmpty && filteredRecent.isNotEmpty) ...[
                    const Text(
                      'RECENTLY SEARCHED',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...filteredRecent.map((item) => _buildRecentSearchTile(item)),
                  ],

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    bool isLoading = false,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isLoading)
                  SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: iconColor),
                  )
                else
                  Icon(icon, color: iconColor, size: 24),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _jdkartSlate,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRemoveLocationCard() {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: _removeCurrentLocation,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFECACA), width: 1.2),
          ),
          child: const Row(
            children: [
              Icon(Icons.location_off_outlined, color: Color(0xFFB91C1C), size: 22),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Remove current location',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14.5,
                    color: Color(0xFFB91C1C),
                  ),
                ),
              ),
              Icon(Icons.delete_outline_rounded, color: Color(0xFFB91C1C), size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _removeCurrentLocation() async {
    await LocationService.instance.clearLocation();
    if (!mounted) return;
    Navigator.pop(context, {'cleared': true});
  }

  Widget _buildSavedAddressTile(AddressModel addr) {
    final distanceStr = _getDistanceString(addr.latitude, addr.longitude);
    final labelTitle = addr.label.isNotEmpty
        ? (addr.label[0].toUpperCase() + addr.label.substring(1).toLowerCase())
        : 'Home';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.8), width: 1.0),
      ),
      child: ListTile(
        onTap: () => _selectSavedAddress(addr),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_getIconForLabel(addr.label), size: 20, color: _jdkartSlate),
              const SizedBox(height: 3),
              Text(
                distanceStr,
                style: const TextStyle(
                  fontSize: 10.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        title: Text(
          labelTitle,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 15.5,
            color: _jdkartSlate,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(
            addr.fullAddress,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 13,
              height: 1.3,
            ),
          ),
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Color(0xFF94A3B8)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          onSelected: (val) async {
            if (val == 'select') {
              _selectSavedAddress(addr);
            } else if (val == 'delete') {
              try {
                await AddressService.instance.deleteAddress(addr.id);
                _loadLocationData();
              } on ApiException catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.message), backgroundColor: Colors.redAccent),
                  );
                }
              }
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'select',
              child: Text('Deliver Here'),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Text('Delete Address', style: TextStyle(color: Colors.redAccent)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSearchTile(Map<String, dynamic> item) {
    final double? lat = (item['lat'] is num) ? (item['lat'] as num).toDouble() : null;
    final double? lng = (item['lng'] is num) ? (item['lng'] as num).toDouble() : null;
    final distanceStr = _getDistanceString(lat, lng);
    final title = item['title'] ?? 'Recent Location';
    final address = item['address'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.8), width: 1.0),
      ),
      child: ListTile(
        onTap: () => _selectRecentSearch(item),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.access_time_rounded, size: 20, color: _jdkartSlate),
              const SizedBox(height: 3),
              Text(
                distanceStr,
                style: const TextStyle(
                  fontSize: 10.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 15.5,
            color: _jdkartSlate,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(
            address,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 13,
              height: 1.3,
            ),
          ),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 20),
          tooltip: 'Remove',
          onPressed: () async {
            await LocationService.instance.removeRecentlySearched(item);
            if (!mounted) return;
            final recent = await LocationService.instance.getRecentlySearched();
            if (!mounted) return;
            setState(() => _recentSearches = recent);
          },
        ),
      ),
    );
  }
}
