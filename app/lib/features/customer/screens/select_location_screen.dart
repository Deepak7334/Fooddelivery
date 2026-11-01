import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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

class _SelectLocationScreenState extends State<SelectLocationScreen> {
  final TextEditingController _searchController = TextEditingController();
  static const Color _jdkartOrange = Color(0xFFF97316);
  static const Color _jdkartSlate = Color(0xFF1E293B);

  List<AddressModel> _savedAddresses = [];
  List<Map<String, dynamic>> _recentSearches = [];
  bool _isLoading = true;
  String? _error;
  bool _isDetectingGps = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadLocationData();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.trim().toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
      return '8.8 km';
    }
    final currentLat = LocationService.instance.selectedLat;
    final currentLng = LocationService.instance.selectedLng;
    final km = LocationService.instance.calculateDistanceKm(currentLat, currentLng, targetLat, targetLng);
    return LocationService.instance.formatDistance(km);
  }

  /// Handle "Use Current Location"
  Future<void> _handleUseCurrentLocation() async {
    setState(() => _isDetectingGps = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Detecting your GPS location...'),
        duration: Duration(seconds: 2),
      ),
    );

    final result = await LocationService.instance.getCurrentLocation();
    if (!mounted) return;
    setState(() => _isDetectingGps = false);

    if (result != null) {
      Navigator.pop(context, result);
    } else {
      // Fallback location for Rohtas
      const fallback = {
        'title': 'Current Location',
        'address': 'Akbarpur, Rohtas, Bihar 821311',
        'lat': LocationService.defaultLat,
        'lng': LocationService.defaultLng,
      };
      await LocationService.instance.setSelectedLocation(
        title: fallback['title'] as String,
        address: fallback['address'] as String,
        lat: fallback['lat'] as double,
        lng: fallback['lng'] as double,
      );
      Navigator.pop(context, fallback);
    }
  }

  /// Handle "Add New Address"
  Future<void> _handleAddNewAddress() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AddressesScreen()),
    );
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

                  // 3. SAVED ADDRESSES Section
                  if (_error != null && _savedAddresses.isEmpty)
                    AppErrorState(message: _error!, onRetry: _loadLocationData)
                  else if (filteredSaved.isNotEmpty) ...[
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
                  if (filteredRecent.isNotEmpty) ...[
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
        border: Border.all(color: const Color(0xFFE2E8F0).withOpacity(0.8), width: 1.0),
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
        border: Border.all(color: const Color(0xFFE2E8F0).withOpacity(0.8), width: 1.0),
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
      ),
    );
  }
}
