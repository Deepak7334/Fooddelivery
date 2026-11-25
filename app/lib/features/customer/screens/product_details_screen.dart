import 'package:flutter/material.dart';
import '../../../models/product_model.dart';
import '../../../core/utils/cart_actions.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/safe_image.dart';
import 'cart_screen.dart';

class ProductDetailsScreen extends StatefulWidget {
  final FoodItemModel? foodItem;
  final bool vendorIsOpen;

  const ProductDetailsScreen({
    Key? key,
    this.foodItem,
    this.vendorIsOpen = true,
  }) : super(key: key);

  @override
  State<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends State<ProductDetailsScreen> {
  static const Color jdkartOrange = Color(0xFFF97316);

  ItemVariant? _selectedVariant;
  final List<ItemAddOn> _selectedAddOns = [];
  String _spiceLevel = '';
  int _quantity = 1;
  int _activeImageIndex = 0;

  @override
  void initState() {
    super.initState();
    final food = widget.foodItem;
    if (food != null) {
      if (food.variants.isNotEmpty) {
        _selectedVariant = food.variants.firstWhere(
          (v) => v.inStock,
          orElse: () => food.variants.first,
        );
      }
      if (food.spiceLevels.isNotEmpty) {
        _spiceLevel = food.spiceLevels.first;
      }
    }
  }

  num get _basePrice =>
      _selectedVariant?.effectivePrice ?? widget.foodItem!.effectiveBasePrice;

  num get _originalPrice =>
      _selectedVariant?.price ?? widget.foodItem!.price;

  num get _addOnsPrice =>
      _selectedAddOns.fold<num>(0, (sum, a) => sum + a.price);

  num get _unitPrice => _basePrice + _addOnsPrice;

  int get _maxStock {
    if (_selectedVariant != null && _selectedVariant!.stock > 0) {
      return _selectedVariant!.stock;
    }
    if (widget.foodItem != null && widget.foodItem!.stock > 0) {
      return widget.foodItem!.stock;
    }
    return 99;
  }

  bool get _canPurchase {
    final food = widget.foodItem!;
    if (!widget.vendorIsOpen) return false;
    if (!food.isAvailable || food.isOutOfStock) return false;
    if (_selectedVariant != null && !_selectedVariant!.inStock) return false;
    return true;
  }

  void _toggleAddOn(ItemAddOn addon) {
    setState(() {
      final exists = _selectedAddOns.any((a) => a.name == addon.name);
      if (exists) {
        _selectedAddOns.removeWhere((a) => a.name == addon.name);
      } else {
        _selectedAddOns.add(addon);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final food = widget.foodItem;

    if (food == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Product Details')),
        body: const Center(child: Text('No product selected')),
      );
    }

    final gallery = food.galleryImages;
    final activeImage = gallery.isNotEmpty
        ? gallery[_activeImageIndex.clamp(0, gallery.length - 1)]
        : food.image;
    final hasDiscount = _originalPrice > 0 && _basePrice < _originalPrice;
    final discountPercent = hasDiscount
        ? (((_originalPrice - _basePrice) / _originalPrice) * 100).round()
        : 0;
    final availableAddOns = food.addOns;
    final canOrder = _canPurchase;
    final unavailableReason = !widget.vendorIsOpen
        ? '${food.restaurantName.isNotEmpty ? food.restaurantName : "This vendor"} is currently closed'
        : (food.isOutOfStock ||
                (_selectedVariant != null && !_selectedVariant!.inStock)
            ? 'Currently out of stock / unavailable'
            : null);

    return Scaffold(
      backgroundColor: Colors.white,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Image
            Stack(
              children: [
                SafeImage(
                  image: activeImage,
                  height: 320,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.4),
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.25),
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                  ),
                ),
                if (food.freeDelivery)
                  Positioned(
                    bottom: 14,
                    left: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF15803D),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.local_shipping_outlined,
                              color: Colors.white, size: 14),
                          SizedBox(width: 5),
                          Text(
                            'FREE DELIVERY',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),

            // Multi-image gallery thumbnails
            if (gallery.length > 1)
              SizedBox(
                height: 76,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(22, 12, 22, 0),
                  scrollDirection: Axis.horizontal,
                  itemCount: gallery.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (_, idx) {
                    final selected = idx == _activeImageIndex;
                    return GestureDetector(
                      onTap: () => setState(() => _activeImageIndex = idx),
                      child: Container(
                        width: 64,
                        height: 64,
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: selected
                                ? jdkartOrange
                                : const Color(0xFFE2E8F0),
                            width: selected ? 2 : 1,
                          ),
                        ),
                        child: SafeImage(
                          image: gallery[idx],
                          width: 60,
                          height: 60,
                          borderRadius: BorderRadius.circular(8),
                          fit: BoxFit.cover,
                        ),
                      ),
                    );
                  },
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (unavailableReason != null) ...[
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: Color(0xFFB91C1C), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              unavailableReason,
                              style: const TextStyle(
                                color: Color(0xFFB91C1C),
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  if (food.brand.isNotEmpty) ...[
                    Text(
                      food.brand.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: jdkartOrange,
                      ),
                    ),
                    const SizedBox(height: 4),
                  ],

                  // Item Name & Veg/Non-veg indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          food.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          border: Border.all(
                              color: food.isVeg ? Colors.green : Colors.red,
                              width: 1.5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: food.isVeg ? Colors.green : Colors.red,
                            shape: BoxShape.circle,
                          ),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Vendor & Category
                  Row(
                    children: [
                      const Icon(Icons.storefront_rounded,
                          size: 16, color: jdkartOrange),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          food.restaurantName.isNotEmpty
                              ? food.restaurantName
                              : 'JDKart Partner',
                          style: const TextStyle(
                            fontSize: 14,
                            color: jdkartOrange,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (food.category.isNotEmpty) ...[
                        const Text(' • ', style: TextStyle(color: Colors.grey)),
                        Text(
                          food.category,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Pricing Row
                  Row(
                    children: [
                      Text(
                        formatPrice(_unitPrice),
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      if (hasDiscount) ...[
                        const SizedBox(width: 10),
                        Text(
                          formatPrice(_originalPrice + _addOnsPrice),
                          style: const TextStyle(
                            fontSize: 16,
                            color: Colors.grey,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF16A34A),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            food.offer.isNotEmpty
                                ? food.offer
                                : '$discountPercent% OFF',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ] else if (food.offer.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: jdkartOrange),
                          ),
                          child: Text(
                            food.offer,
                            style: const TextStyle(
                              color: jdkartOrange,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF267E3E),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star,
                                color: Colors.white, size: 14),
                            const SizedBox(width: 3),
                            Text(
                              food.rating.toStringAsFixed(1),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_selectedVariant != null || food.unit.isNotEmpty || food.totalRatings > 0) ...[
                    const SizedBox(height: 6),
                    Text(
                      [
                        if (_selectedVariant != null)
                          'Selected: ${_selectedVariant!.label}'
                        else if (food.unit.isNotEmpty)
                          'Pack: ${food.unit}',
                        if (food.totalRatings > 0)
                          '${food.totalRatings} Ratings',
                      ].join('  •  '),
                      style: const TextStyle(
                          fontSize: 12.5, color: Color(0xFF64748B)),
                    ),
                  ],

                  // Variants Selector (Sizes / Weights)
                  if (food.variants.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Divider(height: 1),
                    const SizedBox(height: 16),
                    Text(
                      food.isProduct ? 'Select Pack / Size' : 'Choose Size',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: food.variants.map((v) {
                        final isSelected =
                            _selectedVariant?.label == v.label;
                        return ChoiceChip(
                          label: Text(
                            v.inStock
                                ? '${v.label} • ${formatPrice(v.effectivePrice)}'
                                : '${v.label} (Out of stock)',
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFFFFF7ED),
                          backgroundColor: Colors.white,
                          side: BorderSide(
                            color: !v.inStock
                                ? const Color(0xFFE2E8F0)
                                : (isSelected
                                    ? jdkartOrange
                                    : const Color(0xFFCBD5E1)),
                            width: isSelected ? 1.6 : 1,
                          ),
                          labelStyle: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: !v.inStock
                                ? Colors.grey
                                : (isSelected ? jdkartOrange : Colors.black87),
                          ),
                          onSelected: v.inStock
                              ? (_) => setState(() {
                                    _selectedVariant = v;
                                    if (v.stock > 0 && _quantity > v.stock) {
                                      _quantity = v.stock;
                                    }
                                  })
                              : null,
                        );
                      }).toList(),
                    ),
                  ],

                  // Add-Ons
                  if (availableAddOns.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Divider(height: 1),
                    const SizedBox(height: 16),
                    const Text(
                      'Add-ons (Optional)',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    ...availableAddOns.map((addon) {
                      final isChecked =
                          _selectedAddOns.any((a) => a.name == addon.name);
                      return CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        activeColor: jdkartOrange,
                        value: isChecked,
                        onChanged: addon.isAvailable
                            ? (_) => _toggleAddOn(addon)
                            : null,
                        title: Text(
                          addon.isAvailable
                              ? addon.name
                              : '${addon.name} (Unavailable)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: addon.isAvailable
                                ? const Color(0xFF1E293B)
                                : Colors.grey,
                          ),
                        ),
                        secondary: Text(
                          '+ ${formatPrice(addon.price)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13.5,
                            color: addon.isAvailable
                                ? jdkartOrange
                                : Colors.grey,
                          ),
                        ),
                      );
                    }),
                  ],

                  // Spice Levels
                  if (food.spiceLevels.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Divider(height: 1),
                    const SizedBox(height: 16),
                    const Text(
                      'Spice Level',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: food.spiceLevels.map((lvl) {
                        final isSelected = _spiceLevel == lvl;
                        return ChoiceChip(
                          label: Text(lvl),
                          selected: isSelected,
                          selectedColor: const Color(0xFFFFF7ED),
                          side: BorderSide(
                            color: isSelected
                                ? jdkartOrange
                                : const Color(0xFFCBD5E1),
                          ),
                          labelStyle: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: isSelected ? jdkartOrange : Colors.black87,
                          ),
                          onSelected: (_) =>
                              setState(() => _spiceLevel = lvl),
                        );
                      }).toList(),
                    ),
                  ],

                  // Quantity selector
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Quantity',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: jdkartOrange.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: _quantity > 1
                                  ? () => setState(() => _quantity--)
                                  : null,
                              icon: const Icon(Icons.remove,
                                  size: 18, color: jdkartOrange),
                            ),
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8),
                              child: Text(
                                '$_quantity',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                  color: jdkartOrange,
                                ),
                              ),
                            ),
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: _quantity < _maxStock
                                  ? () => setState(() => _quantity++)
                                  : null,
                              icon: const Icon(Icons.add,
                                  size: 18, color: jdkartOrange),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),
                  const Divider(height: 1),
                  const SizedBox(height: 18),

                  const Text('About this item',
                      style:
                          TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    food.description.isNotEmpty
                        ? food.description
                        : food.isProduct
                            ? 'Quality ${food.name} from ${food.restaurantName.isNotEmpty ? food.restaurantName : "a JDKart partner store"}, delivered to your door.'
                            : 'Authentic ${food.name} prepared fresh with top quality ingredients by ${food.restaurantName.isNotEmpty ? food.restaurantName : "our chefs"} on JDKart.',
                    style: TextStyle(
                        color: Colors.grey[700], height: 1.5, fontSize: 14),
                  ),

                  // Grocery / Product Specifications
                  if (food.ingredients.isNotEmpty ||
                      food.nutritionalInfo.isNotEmpty ||
                      food.storageInstructions.isNotEmpty ||
                      food.mfgDate != null ||
                      food.expiryDate != null) ...[
                    const SizedBox(height: 20),
                    const Text('Specifications',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        children: [
                          if (food.ingredients.isNotEmpty)
                            _buildSpecRow('Ingredients', food.ingredients),
                          if (food.nutritionalInfo.isNotEmpty)
                            _buildSpecRow(
                                'Nutrition', food.nutritionalInfo),
                          if (food.storageInstructions.isNotEmpty)
                            _buildSpecRow(
                                'Storage', food.storageInstructions),
                          if (food.mfgDate != null)
                            _buildSpecRow('Mfg Date',
                                '${food.mfgDate!.day}/${food.mfgDate!.month}/${food.mfgDate!.year}'),
                          if (food.expiryDate != null)
                            _buildSpecRow('Expiry Date',
                                '${food.expiryDate!.day}/${food.expiryDate!.month}/${food.expiryDate!.year}'),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Quality Badges
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildBadge(Icons.shield_outlined,
                            food.isProduct ? 'Quality Checked' : 'Hygienic'),
                        _buildBadge(
                          food.isProduct
                              ? Icons.local_shipping_outlined
                              : Icons.timer_outlined,
                          food.freeDelivery
                              ? 'Free Delivery'
                              : (food.isProduct
                                  ? 'Fast Delivery'
                                  : (food.preparationTime.isNotEmpty
                                      ? food.preparationTime
                                      : 'Fresh Cooked')),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: canOrder
                      ? () => _addToCart(context, food, goToCart: false)
                      : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: jdkartOrange,
                    backgroundColor: canOrder
                        ? const Color(0xFFFFF7ED)
                        : const Color(0xFFF1F5F9),
                    side: BorderSide(
                      color: canOrder
                          ? jdkartOrange.withValues(alpha: 0.4)
                          : const Color(0xFFCBD5E1),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('ADD',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: canOrder
                      ? () => _addToCart(context, food, goToCart: true)
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: jdkartOrange,
                    disabledBackgroundColor: const Color(0xFFCBD5E1),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    canOrder
                        ? '${food.isProduct ? 'Buy' : 'Order'} • ${formatPrice(_unitPrice * _quantity)}'
                        : (!widget.vendorIsOpen
                            ? 'Vendor Closed'
                            : 'Unavailable'),
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
                color: Color(0xFF475569),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF1E293B)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _addToCart(BuildContext context, FoodItemModel food,
      {required bool goToCart}) async {
    if (food.restaurantId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This item is not available from a vendor right now.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }
    final variantLabel = _selectedVariant?.label ?? '';
    final added = await addToCart(
      context,
      food,
      vendorId: food.restaurantId,
      vendorName:
          food.restaurantName.isNotEmpty ? food.restaurantName : 'JDKart Partner',
      type: food.isProduct ? 'product' : 'food',
      vendorIsOpen: widget.vendorIsOpen,
      quantity: _quantity,
      variantName: variantLabel,
      addOns: List<ItemAddOn>.from(_selectedAddOns),
      spiceLevel: _spiceLevel,
      computedPrice: _unitPrice,
      basePrice: _basePrice,
    );
    if (!added || !context.mounted) return;

    if (goToCart) {
      Navigator.push(
          context, MaterialPageRoute(builder: (_) => const CartScreen()));
      return;
    }

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added "${food.name}" to cart!'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
        backgroundColor: jdkartOrange,
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: Colors.white,
          onPressed: () {
            Navigator.push(
                context, MaterialPageRoute(builder: (_) => const CartScreen()));
          },
        ),
      ),
    );
  }

  Widget _buildBadge(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF64748B)),
        const SizedBox(width: 4),
        Text(label,
            style: const TextStyle(
                color: Color(0xFF475569),
                fontSize: 12,
                fontWeight: FontWeight.w600)),
      ],
    );
  }
}
