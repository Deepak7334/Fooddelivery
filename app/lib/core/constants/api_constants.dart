class ApiConstants {
  static const String baseUrl = 'https://fooddelivery-ryjf.onrender.com/api';

  // Auth endpoints
  static const String sendEmailOtp = '$baseUrl/auth/send-email-otp';
  static const String verifyEmailOtp = '$baseUrl/auth/verify-email-otp';
  static const String firebaseLogin = '$baseUrl/auth/firebase-login';
  static const String login = '$baseUrl/auth/login';
  static const String register = '$baseUrl/auth/register';
  static const String me = '$baseUrl/auth/me';

  // Customer Catalog
  static const String categories = '$baseUrl/customer/categories';
  static const String restaurants = '$baseUrl/customer/restaurants';
  static const String foods = '$baseUrl/customer/foods';
  static const String promo = '$baseUrl/customer/settings/promo';

  // Stores & Products
  static const String stores = '$baseUrl/store/stores';
  static const String products = '$baseUrl/store/products';

  // Checkout & Orders
  static const String checkoutInfo = '$baseUrl/customer/checkout-info';
  static const String orders = '$baseUrl/customer/orders';

  // Addresses & Notifications
  static const String addresses = '$baseUrl/addresses';
  static const String notifications = '$baseUrl/notifications';

  // Table Bookings
  static const String bookings = '$baseUrl/booking/customer/bookings';
  static const String myBookings = '$baseUrl/booking/customer/bookings/mine';
  static const String bookingAvailability = '$baseUrl/booking/availability';
}
