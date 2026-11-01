import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'api_exception.dart';

/// Shared HTTP client for all backend calls.
///
/// - reuses one pooled HttpClient across the app
/// - injects the Bearer token for `auth: true` requests
/// - retries transient network/5xx failures once (covers Render cold starts)
/// - throws [ApiException] with a user-presentable message on failure
class ApiClient {
  ApiClient._internal();

  static final ApiClient instance = ApiClient._internal();

  /// Wired up in main() to avoid a core -> services import cycle.
  static String? Function()? tokenProvider;

  static const Duration _responseTimeout = Duration(seconds: 15);
  static const int _maxAttempts = 2;

  final HttpClient _http = HttpClient()
    ..connectionTimeout = const Duration(seconds: 10);

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

  Future<dynamic> _request(String method, String url,
      {Map<String, dynamic>? body, bool auth = false}) async {
    for (var attempt = 1; attempt <= _maxAttempts; attempt++) {
      try {
        final uri = Uri.parse(url);
        final request = switch (method) {
          'GET' => await _http.getUrl(uri),
          'POST' => await _http.postUrl(uri),
          'PUT' => await _http.putUrl(uri),
          'PATCH' => await _http.patchUrl(uri),
          'DELETE' => await _http.deleteUrl(uri),
          _ => throw ArgumentError('Unsupported HTTP method: $method'),
        };

        request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
        if (auth) {
          final token = tokenProvider?.call();
          if (token != null && token.isNotEmpty) {
            request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
          }
        }
        if (body != null) {
          request.add(utf8.encode(jsonEncode(body)));
        }

        final response = await request.close().timeout(_responseTimeout);
        final responseBody =
            await response.transform(utf8.decoder).join().timeout(_responseTimeout);
        dynamic data;
        if (responseBody.isNotEmpty) {
          try {
            data = jsonDecode(responseBody);
          } on FormatException {
            data = null;
          }
        }

        if (response.statusCode == 401) {
          throw const ApiException(
              'Session expired. Please log in again.',
              statusCode: 401);
        }
        if (response.statusCode >= 400) {
          final serverMessage =
              data is Map && data['message'] != null ? data['message'].toString() : null;
          if (response.statusCode >= 500 && attempt < _maxAttempts) {
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
      } on SocketException {
        if (attempt >= _maxAttempts) throw _offline();
      } on TimeoutException {
        if (attempt >= _maxAttempts) {
          throw const ApiException(
              'The server took too long to respond. Please try again.',
              isNetworkError: true);
        }
      } on HttpException {
        if (attempt >= _maxAttempts) throw _offline();
      } on OSError {
        if (attempt >= _maxAttempts) throw _offline();
      }
      await _backoff(attempt);
    }
    throw _offline();
  }

  static Future<void> _backoff(int attempt) =>
      Future<void>.delayed(Duration(milliseconds: 400 * attempt));

  static ApiException _offline() => const ApiException(
      'No internet connection. Check your network and try again.',
      isNetworkError: true);
}
