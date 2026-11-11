import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  static const String _prefSelectedTitle = 'jdkart_selected_loc_title';
  static const String _prefSelectedAddress = 'jdkart_selected_loc_address';
  static const String _prefSelectedLat = 'jdkart_selected_loc_lat';
  static const String _prefSelectedLng = 'jdkart_selected_loc_lng';
  static const String _prefRecentSearches = 'jdkart_recent_searches';
  static const String _prefLocationSet = 'jdkart_location_set';

  // Default initial coordinates for Rohtas, Bihar
  static const double defaultLat = 24.7570;
  static const double defaultLng = 83.9458;

  String selectedTitle = 'Home';
  String selectedAddress = 'Akbarpur, Rohtas, Bihar';
  double selectedLat = defaultLat;
  double selectedLng = defaultLng;

  bool _isInitialized = false;
  bool _locationSet = false;

  /// True once the user (or GPS) has explicitly chosen a location.
  bool get isLocationSet => _locationSet;

  /// Load cached location on startup
  Future<void> init() async {
    if (_isInitialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      selectedTitle = prefs.getString(_prefSelectedTitle) ?? 'Home';
      selectedAddress = prefs.getString(_prefSelectedAddress) ?? 'Akbarpur, Rohtas, Bihar';
      selectedLat = prefs.getDouble(_prefSelectedLat) ?? defaultLat;
      selectedLng = prefs.getDouble(_prefSelectedLng) ?? defaultLng;
      _locationSet = prefs.getBool(_prefLocationSet) ?? false;
      _isInitialized = true;
    } catch (_) {
      _isInitialized = true;
    }
  }

  /// Detect the real GPS location once if the user has never set one.
  /// Returns the detected location, or null when a location is already set
  /// or detection is not possible (no permission/service).
  Future<Map<String, dynamic>?> ensureAutoLocation() async {
    if (_locationSet) return null;
    return getCurrentLocation();
  }

  /// Update active location and save
  Future<void> setSelectedLocation({
    required String title,
    required String address,
    required double lat,
    required double lng,
  }) async {
    selectedTitle = title;
    selectedAddress = address;
    selectedLat = lat;
    selectedLng = lng;
    _locationSet = true;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefSelectedTitle, title);
      await prefs.setString(_prefSelectedAddress, address);
      await prefs.setDouble(_prefSelectedLat, lat);
      await prefs.setDouble(_prefSelectedLng, lng);
      await prefs.setBool(_prefLocationSet, true);
    } catch (_) {}

    await addRecentlySearched({
      'title': title,
      'address': address,
      'lat': lat,
      'lng': lng,
    });
  }

  /// Get list of recently searched addresses
  Future<List<Map<String, dynamic>>> getRecentlySearched() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefRecentSearches);
      if (raw != null && raw.isNotEmpty) {
        final List decoded = jsonDecode(raw);
        return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}

    // Default fallback recent searches matching app reference
    return [
      {
        'title': 'Shamana Garden',
        'address': 'Shamana Garden, Wilson Garden, Bengaluru, Karnataka, India',
        'lat': 12.9431,
        'lng': 77.5969,
      },
      {
        'title': 'Akbarpur Market',
        'address': 'Main Market Road, Akbarpur, Rohtas, Bihar 821311',
        'lat': 24.7570,
        'lng': 83.9458,
      },
    ];
  }

  /// Add address to recently searched list (max 6, no duplicates)
  Future<void> addRecentlySearched(Map<String, dynamic> item) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = await getRecentlySearched();

      // Remove existing duplicate by address or title
      list.removeWhere((e) =>
          e['address'] == item['address'] ||
          (e['title'] == item['title'] && e['title'] != 'Current Location'));

      list.insert(0, item);
      if (list.length > 6) {
        list.removeRange(6, list.length);
      }

      await prefs.setString(_prefRecentSearches, jsonEncode(list));
    } catch (_) {}
  }

  /// Calculate distance in kilometers between two GPS points
  double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    final meters = Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
    return meters / 1000.0;
  }

  /// Format distance into clean human-readable string (e.g. 8.8 km, 470 km, 800 m)
  String formatDistance(double km) {
    if (km < 1.0) {
      final meters = (km * 1000).round();
      return '$meters m';
    } else if (km < 10) {
      return '${km.toStringAsFixed(1)} km';
    } else {
      return '${km.round()} km';
    }
  }

  /// Request GPS and reverse-geocode to readable address
  Future<Map<String, dynamic>?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          timeLimit: Duration(seconds: 20),
        ),
      );

      String readableAddress = 'Current GPS Location';
      try {
        final placemarks = await Geocoding().placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          final parts = [
            if (place.subLocality != null && place.subLocality!.isNotEmpty) place.subLocality,
            if (place.locality != null && place.locality!.isNotEmpty) place.locality,
            if (place.subAdministrativeArea != null && place.subAdministrativeArea!.isNotEmpty) place.subAdministrativeArea,
            if (place.administrativeArea != null && place.administrativeArea!.isNotEmpty) place.administrativeArea,
            if (place.postalCode != null && place.postalCode!.isNotEmpty) place.postalCode,
          ].where((e) => e != null).cast<String>().toList();

          if (parts.isNotEmpty) {
            readableAddress = parts.join(', ');
          }
        }
      } catch (_) {
        readableAddress = 'Location (${position.latitude.toStringAsFixed(3)}, ${position.longitude.toStringAsFixed(3)})';
      }

      final result = {
        'title': 'Current Location',
        'address': readableAddress,
        'lat': position.latitude,
        'lng': position.longitude,
      };

      await setSelectedLocation(
        title: result['title'] as String,
        address: result['address'] as String,
        lat: result['lat'] as double,
        lng: result['lng'] as double,
      );

      return result;
    } catch (_) {
      return null;
    }
  }
}
