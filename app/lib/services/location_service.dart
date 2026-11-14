import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  static const String _prefSelectedTitle = 'jdkart_selected_loc_title';
  static const String _prefSelectedAddress = 'jdkart_selected_loc_address';
  static const String _prefSelectedLat = 'jdkart_selected_loc_lat';
  static const String _prefSelectedLng = 'jdkart_selected_loc_lng';
  static const String _prefRecentSearches = 'jdkart_recent_searches';
  static const String _prefLocationSet = 'jdkart_location_set';
  static const String _prefLocationVersion = 'jdkart_location_version';

  // Bump this to force a one-time wipe of cached location data on devices
  // that ran an older build (which stored a Rohtas/Akbarpur placeholder as a
  // real selection).
  static const int _currentLocationVersion = 2;

  // Last-resort coordinates for internal calculations only (map centering,
  // distance fallback). Never shown as the customer's chosen location.
  static const double defaultLat = 24.7570;
  static const double defaultLng = 83.9458;

  String selectedTitle = '';
  String selectedAddress = '';
  double selectedLat = defaultLat;
  double selectedLng = defaultLng;

  bool _isInitialized = false;
  bool _locationSet = false;

  /// True once the user (or GPS) has explicitly chosen a location.
  bool get isLocationSet => _locationSet;

  /// Coordinates for nearby filtering. Null until the customer explicitly
  /// picks a location, so a fresh install browses the full catalog instead of
  /// a 5 km slice around the placeholder address.
  double? get activeLat => _locationSet ? selectedLat : null;
  double? get activeLng => _locationSet ? selectedLng : null;

  /// Load cached location on startup
  Future<void> init() async {
    if (_isInitialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();

      // One-time cleanup for installs created before location was opt-in.
      // Older builds saved the Rohtas/Akbarpur placeholder (and a fake
      // "Current Location") as if the customer had chosen it, so existing
      // users kept seeing Akbarpur as their default. Wipe it once and start
      // neutral: no location until the customer picks one.
      final version = prefs.getInt(_prefLocationVersion) ?? 0;
      if (version < _currentLocationVersion) {
        await prefs.remove(_prefSelectedTitle);
        await prefs.remove(_prefSelectedAddress);
        await prefs.remove(_prefSelectedLat);
        await prefs.remove(_prefSelectedLng);
        await prefs.remove(_prefRecentSearches);
        await prefs.setBool(_prefLocationSet, false);
        await prefs.setInt(_prefLocationVersion, _currentLocationVersion);
      }

      final savedTitle = prefs.getString(_prefSelectedTitle) ?? '';
      final savedAddress = prefs.getString(_prefSelectedAddress) ?? '';
      _locationSet = prefs.getBool(_prefLocationSet) ?? false;
      selectedTitle = _locationSet ? savedTitle : '';
      selectedAddress = _locationSet ? savedAddress : '';
      selectedLat = prefs.getDouble(_prefSelectedLat) ?? defaultLat;
      selectedLng = prefs.getDouble(_prefSelectedLng) ?? defaultLng;
      _isInitialized = true;
    } catch (_) {
      _isInitialized = true;
    }
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
    return [];
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

  /// Remove a single entry from the recently searched list by address/title.
  Future<void> removeRecentlySearched(Map<String, dynamic> item) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = await getRecentlySearched();
      list.removeWhere((e) =>
          (e['address'] == item['address'] && item['address'] != null) ||
          (e['title'] == item['title'] && item['title'] != null));
      await prefs.setString(_prefRecentSearches, jsonEncode(list));
    } catch (_) {}
  }

  /// Clear the customer's chosen location so the app returns to showing the
  /// full catalog until they pick a location again.
  Future<void> clearLocation() async {
    selectedTitle = '';
    selectedAddress = '';
    _locationSet = false;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefSelectedTitle);
      await prefs.remove(_prefSelectedAddress);
      await prefs.remove(_prefSelectedLat);
      await prefs.remove(_prefSelectedLng);
      await prefs.setBool(_prefLocationSet, false);
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

  /// Reverse geocode through our backend proxy (works on web), with a
  /// CORS-friendly public fallback if the API is unreachable.
  Future<String?> reverseGeocode(double lat, double lng) async {
    try {
      final data = await ApiClient.instance.get(
        '${ApiConstants.reverseGeocode}?lat=$lat&lng=$lng',
      );
      if (data is Map && data['success'] == true) {
        final parts = <String>[];
        for (final key in ['area', 'district', 'state', 'pincode']) {
          final value = data[key]?.toString().trim() ?? '';
          if (value.isNotEmpty && !parts.contains(value)) parts.add(value);
        }
        if (parts.isNotEmpty) return parts.join(', ');
        final display = data['displayName']?.toString().trim() ?? '';
        if (display.isNotEmpty) return display;
      }
    } catch (_) {}

    try {
      final data = await ApiClient.instance.get(
        '${ApiConstants.placeReverse}?lat=$lat&lon=$lng&limit=1&lang=en',
      );
      if (data is Map) {
        // Photon returns a FeatureCollection, not a bare Feature.
        final features = data['features'];
        final list = features is List
            ? features
            : (data['type'] == 'Feature' ? [data] : const []);
        if (list.isNotEmpty && list.first is Map) {
          final address = _featureAddress(list.first as Map);
          if (address.isNotEmpty) return address;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Forward search for the "Search an area or address" box.
  /// Returns maps with `title`, `address`, `lat` and `lng`.
  Future<List<Map<String, dynamic>>> searchPlaces(String query) async {
    final uri = Uri.parse(ApiConstants.placeSearch).replace(queryParameters: {
      'q': query,
      'limit': '5',
      'lang': 'en',
    });
    final data = await ApiClient.instance.get(uri.toString());
    if (data is! Map) return [];

    final features = data['features'];
    final list = features is List
        ? features
        : (data['type'] == 'Feature' ? [data] : const []);

    final results = <Map<String, dynamic>>[];
    for (final feature in list.whereType<Map>()) {
      final geometry = feature['geometry'];
      if (geometry is! Map) continue;
      final coords = geometry['coordinates'];
      if (coords is! List || coords.length < 2) continue;
      final lng = (coords[0] as num?)?.toDouble();
      final lat = (coords[1] as num?)?.toDouble();
      if (lat == null || lng == null) continue;

      final props = feature['properties'] is Map
          ? Map<String, dynamic>.from(feature['properties'] as Map)
          : <String, dynamic>{};
      results.add({
        'title': _featureTitle(props),
        'address': _featureAddress(feature),
        'lat': lat,
        'lng': lng,
      });
    }
    return results;
  }

  String _featureTitle(Map props) {
    for (final key in ['name', 'city', 'district', 'county', 'state']) {
      final value = props[key]?.toString().trim() ?? '';
      if (value.isNotEmpty) return value;
    }
    return 'Selected Location';
  }

  String _featureAddress(Map feature) {
    final props = feature['properties'] is Map ? feature['properties'] as Map : const {};
    final parts = <String>[];
    for (final key in [
      'name',
      'street',
      'housenumber',
      'locality',
      'district',
      'county',
      'city',
      'state',
      'postcode',
      'country',
    ]) {
      final value = props[key]?.toString().trim() ?? '';
      if (value.isNotEmpty && !parts.contains(value)) parts.add(value);
    }
    return parts.join(', ');
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
      final geocoded = await reverseGeocode(position.latitude, position.longitude);
      if (geocoded != null && geocoded.isNotEmpty) {
        readableAddress = geocoded;
      } else {
        readableAddress =
            'Location (${position.latitude.toStringAsFixed(3)}, ${position.longitude.toStringAsFixed(3)})';
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
