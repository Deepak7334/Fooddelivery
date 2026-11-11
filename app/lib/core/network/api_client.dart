import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_exception.dart';

/// Shared HTTP client for all backend calls.
///
/// - works on mobile and Flutter web (package:http)
/// - injects the Bearer token for `auth: true` requests
/// - retries transient failures only for idempotent requests
/// - throws [ApiException] with a user-presentable message on failure
class ApiClient {
  ApiClient._internal();

  static final ApiClient instance = ApiClient._internal();

  /// Wired up in main() to avoid a core -> services import cycle.
  static String? Function()? tokenProvider;

  /// Called once when an authenticated request returns 401, so the app can
  /// clear the stale session and send the user back to login.
  static void Function()? onUnauthorized;

  static const Duration _responseTimeout = Duration(seconds: 20);
  static const int _maxAttempts = 2;

  final http.Client _client = http.Client();

  Future<dynamic> get(String url, {bool auth = false}) =>
      _request('GET', url, auth: auth);

  Future<dynamic> post(String url, Map<String, dynamic> body,
          {bool auth = false}) =>
      _request('POST', url, body: body, auth: auth);

  Future<dynamic> put(String url, {Map<String, dynamic>? body, bool auth = false}) =>
      _request('PUT', url, body: body, auth: auth);

  Future<dynamic> patch(String url, {Map<String, dynamic>? body, bool auth = false}) =>
      _request('PATCH', url, body: body, auth: auth);

  Future<dynamic> delete(String url, {bool auth = false}) =>
      _request('DELETE', url, auth: auth);

  /// Only methods that are safe to repeat may be retried. Repeating a POST
  /// after a timeout can create a second order/booking on the server.
  static bool _isIdempotent(String method) =>
      method == 'GET' || method == 'PUT' || method == 'DELETE';

  Future<dynamic> _request(String method, String url,
      {Map<String, dynamic>? body, bool auth = false}) async {
    final uri = Uri.parse(url);
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = tokenProvider?.call();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    final encodedBody = body != null ? jsonEncode(body) : null;

    for (var attempt = 1; attempt <= _maxAttempts; attempt++) {
      try {
        final response = await _send(method, uri, headers, encodedBody)
            .timeout(_responseTimeout);
        final responseBody = utf8.decode(response.bodyBytes);
        dynamic data;
        if (responseBody.isNotEmpty) {
          try {
            data = jsonDecode(responseBody);
          } on FormatException {
            data = null;
          }
        }

        if (response.statusCode == 401) {
          if (auth) {
            onUnauthorized?.call();
            throw const ApiException(
                'Session expired. Please log in again.',
                statusCode: 401);
          }
          final loginMessage =
              data is Map && data['message'] != null ? data['message'].toString() : null;
          throw ApiException(
            loginMessage ?? 'We could not verify those details. Please try again.',
            statusCode: 401,
          );
        }
        if (response.statusCode >= 400) {
          final serverMessage =
              data is Map && data['message'] != null ? data['message'].toString() : null;
          if (response.statusCode >= 500 &&
              _isIdempotent(method) &&
              attempt < _maxAttempts) {
            await _backoff(attempt);
            continue;
          }
          throw ApiException(
            serverMessage ?? 'Something went wrong, please try again.',
            statusCode: response.statusCode,
          );
        }
        return data;
      } on ApiException {
        rethrow;
      } on TimeoutException {
        if (!_isIdempotent(method) || attempt >= _maxAttempts) {
          throw const ApiException(
              'The server took too long to respond. Please try again.',
              isNetworkError: true);
        }
      } on http.ClientException {
        if (!_isIdempotent(method) || attempt >= _maxAttempts) throw _offline();
      } catch (_) {
        if (!_isIdempotent(method) || attempt >= _maxAttempts) throw _offline();
      }
      await _backoff(attempt);
    }
    throw _offline();
  }

  Future<http.Response> _send(
    String method,
    Uri uri,
    Map<String, String> headers,
    String? body,
  ) {
    switch (method) {
      case 'GET':
        return _client.get(uri, headers: headers);
      case 'POST':
        return _client.post(uri, headers: headers, body: body);
      case 'PUT':
        return _client.put(uri, headers: headers, body: body);
      case 'PATCH':
        return _client.patch(uri, headers: headers, body: body);
      case 'DELETE':
        return _client.delete(uri, headers: headers, body: body);
      default:
        throw ArgumentError('Unsupported HTTP method: $method');
    }
  }

  static Future<void> _backoff(int attempt) =>
      Future<void>.delayed(Duration(milliseconds: 400 * attempt));

  static ApiException _offline() => const ApiException(
      'No internet connection. Check your network and try again.',
      isNetworkError: true);
}
