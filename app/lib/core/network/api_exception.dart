/// Error thrown when an API request fails, carrying a user-presentable message.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final bool isNetworkError;

  const ApiException(
    this.message, {
    this.statusCode,
    this.isNetworkError = false,
  });

  bool get isAuthError => statusCode == 401 || statusCode == 403;

  @override
  String toString() => message;
}
