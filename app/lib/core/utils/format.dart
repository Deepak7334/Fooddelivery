/// Formats an amount as rupees, dropping ".0" for whole numbers (₹149, ₹149.50).
String formatPrice(num amount) {
  if (amount == amount.roundToDouble()) return '₹${amount.round()}';
  return '₹${amount.toStringAsFixed(2)}';
}
