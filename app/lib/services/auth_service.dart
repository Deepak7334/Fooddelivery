import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../models/user_model.dart';
import 'push_service.dart';

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  UserModel? _currentUser;
  String? _token;

  UserModel? get currentUser => _currentUser;
  String? get token => _token;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  /// Load cached user and token on app launch
  Future<void> loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('foodhub_token');
      final userJson = prefs.getString('foodhub_user');
      if (userJson != null) {
        _currentUser = UserModel.fromJson(jsonDecode(userJson));
      }
    } catch (_) {}
  }

  Future<void> _saveSession(String token, UserModel user) async {
    _token = token;
    _currentUser = user;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('foodhub_token', token);
      await prefs.setString('foodhub_user', jsonEncode(user.toJson()));
    } catch (_) {}
  }

  /// Send 6-digit OTP to user's email via backend API
  Future<Map<String, dynamic>> sendEmailOtp(String email) async {
    try {
      final data = await ApiClient.instance
          .post(ApiConstants.sendEmailOtp, {'email': email.trim()});
      final ok = data is Map && data['success'] == true;
      return {
        'success': ok,
        'message': data is Map && data['message'] != null
            ? data['message'].toString()
            : (ok ? 'OTP sent successfully' : 'Failed to send OTP'),
      };
    } on ApiException catch (e) {
      return {'success': false, 'message': e.message};
    }
  }

  /// Verify 6-digit OTP via backend API
  Future<Map<String, dynamic>> verifyEmailOtp({
    required String email,
    required String otp,
    String name = '',
  }) async {
    try {
      final data = await ApiClient.instance
          .post(ApiConstants.verifyEmailOtp, {
        'email': email.trim(),
        'otp': otp.trim(),
        if (name.isNotEmpty) 'name': name.trim(),
      });

      if (data is Map && data['success'] == true) {
        final token = (data['token'] ?? '').toString();
        final user = UserModel.fromJson(Map<String, dynamic>.from(data['user'] ?? {
          'email': email,
          'name': name.isNotEmpty ? name : email.split('@')[0],
          'role': 'customer',
        }));
        if (token.isEmpty) {
          return {'success': false, 'message': 'Login failed: server returned no session token'};
        }
        await _saveSession(token, user);
        return {
          'success': true,
          'message': data['message'] ?? 'Login successful',
          'user': user,
        };
      }
      return {
        'success': false,
        'message': data is Map && data['message'] != null
            ? data['message'].toString()
            : 'Invalid verification code',
      };
    } on ApiException catch (e) {
      return {'success': false, 'message': e.message};
    }
  }

  /// Google Login: backend verifies the real Firebase/Google ID token and
  /// issues the app session token. A session is only ever saved from a
  /// backend-issued token.
  Future<Map<String, dynamic>> firebaseLogin({
    required String idToken,
    required String name,
    String loginProvider = 'google',
  }) async {
    try {
      final data = await ApiClient.instance.post(ApiConstants.firebaseLogin, {
        'idToken': idToken,
        'name': name,
        'loginProvider': loginProvider,
      });

      if (data is Map && data['success'] == true) {
        final token = (data['token'] ?? '').toString();
        if (token.isEmpty) {
          return {'success': false, 'message': 'Google login failed: server returned no session token'};
        }
        final user = UserModel.fromJson(Map<String, dynamic>.from(data['user'] ?? {}));
        await _saveSession(token, user);
        return {
          'success': true,
          'user': user,
        };
      }
      return {
        'success': false,
        'message': data is Map && data['message'] != null
            ? data['message'].toString()
            : 'Google authentication failed',
      };
    } on ApiException catch (e) {
      return {'success': false, 'message': e.message};
    }
  }

  /// Direct Google Sign-In helper. Requires a real Google ID token verified
  /// by the backend; there is no local-only session fallback, because a
  /// session the backend does not know about cannot load orders or addresses.
  Future<Map<String, dynamic>> completeGoogleSignIn({
    required String email,
    required String name,
    String? idToken,
  }) async {
    if (idToken == null || idToken.isEmpty) {
      return {
        'success': false,
        'message':
            'Google could not verify $email. Please try again or use Email OTP login.',
      };
    }
    return firebaseLogin(idToken: idToken, name: name);
  }

  /// Pull the authoritative profile from the backend. Silently keeps the
  /// cached user when the request fails, so offline launches still work.
  Future<UserModel?> refreshProfile() async {
    if (!isAuthenticated) return null;
    try {
      final data = await ApiClient.instance.get(ApiConstants.me, auth: true);
      if (data is Map && data['user'] is Map) {
        final user =
            UserModel.fromJson(Map<String, dynamic>.from(data['user']));
        _currentUser = user;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('foodhub_user', jsonEncode(user.toJson()));
        return user;
      }
    } catch (e) {
      debugPrint('Profile refresh failed: $e');
    }
    return _currentUser;
  }

  /// Save profile edits on the server, then update the local cache.
  Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? phone,
    String? address,
  }) async {
    if (!isAuthenticated) {
      return {'success': false, 'message': 'Please log in first.'};
    }
    try {
      final data = await ApiClient.instance.put(ApiConstants.profile, body: {
        if (name != null) 'name': name,
        if (phone != null) 'phone': phone,
        if (address != null) 'address': address,
      }, auth: true);

      if (data is Map && data['success'] == true && data['user'] is Map) {
        final user =
            UserModel.fromJson(Map<String, dynamic>.from(data['user']));
        _currentUser = user;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('foodhub_user', jsonEncode(user.toJson()));
        return {'success': true, 'message': 'Profile updated'};
      }
      return {
        'success': false,
        'message': data is Map && data['message'] != null
            ? data['message'].toString()
            : 'Could not update your profile. Please try again.',
      };
    } on ApiException catch (e) {
      return {'success': false, 'message': e.message};
    }
  }

  /// Log out and clear session
  Future<void> logout() async {
    await PushService.instance.unregister();
    await clearSession();
  }

  /// Drop the local session without calling the backend. Used when the server
  /// has already rejected the token (401), so the token is no longer valid.
  Future<void> clearSession() async {
    _token = null;
    _currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('foodhub_token');
      await prefs.remove('foodhub_user');
    } catch (_) {}
  }
}
