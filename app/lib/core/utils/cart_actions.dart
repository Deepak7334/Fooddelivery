import 'package:flutter/material.dart';

import '../../models/product_model.dart';
import '../../services/cart_service.dart';

/// Adds an item to the cart, enforcing availability/open checks and asking
/// before replacing a cart from another restaurant or store.
/// Returns true when the item was added.
Future<bool> addToCart(
  BuildContext context,
  FoodItemModel item, {
  required String vendorId,
  required String vendorName,
  String type = 'food',
  bool vendorIsOpen = true,
  int quantity = 1,
  String variantName = '',
  List<ItemAddOn> addOns = const [],
  String spiceLevel = '',
  num? computedPrice,
  num? basePrice,
  String specialInstructions = '',
}) async {
  if (!vendorIsOpen) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${vendorName.isNotEmpty ? vendorName : "This vendor"} is currently closed.',
        ),
        backgroundColor: Colors.redAccent,
      ),
    );
    return false;
  }

  if (!item.isAvailable || item.isOutOfStock) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('"${item.name}" is currently out of stock or unavailable.'),
        backgroundColor: Colors.redAccent,
      ),
    );
    return false;
  }

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

  return cart.addItem(
    item,
    restaurantId: vendorId,
    restaurantName: vendorName,
    type: type,
    quantity: quantity,
    variantName: variantName,
    addOns: addOns,
    spiceLevel: spiceLevel,
    computedPrice: computedPrice,
    basePrice: basePrice,
    specialInstructions: specialInstructions,
  );
}
