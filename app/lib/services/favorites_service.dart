import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the user's favorite restaurants across launches.
class FavoritesService extends ChangeNotifier {
  FavoritesService._();
  static final FavoritesService instance = FavoritesService._();

  static const String _prefKey = 'jdkart_favorite_restaurants';

  final Set<String> _ids = {};
  bool _loaded = false;

  Set<String> get ids => Set.unmodifiable(_ids);

  bool isFavorite(String restaurantId) => _ids.contains(restaurantId);

  Future<void> load() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          _ids.addAll(decoded.map((e) => e.toString()));
        }
      }
    } catch (_) {}
    _loaded = true;
    notifyListeners();
  }

  Future<void> toggle(String restaurantId) async {
    if (restaurantId.isEmpty) return;
    if (_ids.contains(restaurantId)) {
      _ids.remove(restaurantId);
    } else {
      _ids.add(restaurantId);
    }
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, jsonEncode(_ids.toList()));
    } catch (_) {}
  }
}
