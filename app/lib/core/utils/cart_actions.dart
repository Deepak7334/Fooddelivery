import 'package:flutter/material.dart';

import '../../models/product_model.dart';
import '../../services/cart_service.dart';

/// Adds an item to the cart, asking before replacing a cart from another
/// restaurant or store. Returns true when the item was added.
Future<bool> addToCart(
  BuildContext context,
  FoodItemModel item, {
  required String vendorId,
  required String vendorName,
  String type = 'food',
}) async {
  final cart = CartService.instance;

  if (cart.willSwitchVendor(vendorId)) {
    final current = cart.restaurantName ?? 'another vendor';
    final replace = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Start a new cart?'),
        content: Text(
          'Your cart already has items from "$current". Adding this item will clear that cart.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep existing'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Start new cart'),
          ),
        ],
      ),
    );
    if (replace != true) return false;
    cart.clearCart();
  }

  cart.addItem(
    item,
    restaurantId: vendorId,
    restaurantName: vendorName,
    type: type,
  );
  return true;
}
