class ApiConstants {
  static const String baseUrl = 'https://fooddelivery-ryjf.onrender.com/api';

  // Auth endpoints
  static const String sendEmailOtp = '$baseUrl/auth/send-email-otp';
  static const String verifyEmailOtp = '$baseUrl/auth/verify-email-otp';
  static const String firebaseLogin = '$baseUrl/auth/firebase-login';
  static const String me = '$baseUrl/auth/me';
  static const String profile = '$baseUrl/auth/profile';

  // Customer catalog
  static const String categories = '$baseUrl/customer/categories';
  static const String restaurants = '$baseUrl/customer/restaurants';
  static const String foods = '$baseUrl/customer/foods';

  // Orders
  static const String orders = '$baseUrl/customer/orders';

  // Addresses & notifications
  static const String addresses = '$baseUrl/addresses';
  static const String notifications = '$baseUrl/notifications';
  static const String saveFcmToken = '$baseUrl/notifications/save-token';
  static const String removeFcmToken = '$baseUrl/notifications/remove-token';

  // Serviceability
  static const String checkServiceability = '$baseUrl/serviceability/check';
  static const String reverseGeocode = '$baseUrl/serviceability/reverse-geocode';

  // CORS-enabled place search (used on mobile and web)
  static const String placeSearch = 'https://photon.komoot.io/api/';
  static const String placeReverse = 'https://photon.komoot.io/reverse';

  // Store & Grocery
  static const String storeTypes = '$baseUrl/store/types';
  static const String stores = '$baseUrl/store/stores';
  static const String storeProducts = '$baseUrl/store/products';

  // Table bookings
  static const String bookings = '$baseUrl/booking/customer/bookings';
  static const String myBookings = '$baseUrl/booking/customer/bookings/mine';
  static const String bookingAvailability = '$baseUrl/booking/availability';
}
