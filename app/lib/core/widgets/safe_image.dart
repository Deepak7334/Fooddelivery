import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';

class SafeImage extends StatelessWidget {
  final String? image;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final IconData placeholderIcon;
  final Color? placeholderColor;
  final Color? iconColor;

  /// Decode the bitmap at this device-pixel width instead of full resolution,
  /// so long scrolling lists don't stall on huge image decodes.
  final int? decodeWidth;

  const SafeImage({
    Key? key,
    required this.image,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholderIcon = Icons.fastfood_rounded,
    this.placeholderColor,
    this.iconColor,
    this.decodeWidth,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget imageWidget = _buildImage(context);

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: imageWidget,
      );
    }
    return imageWidget;
  }

  Widget _buildImage(BuildContext context) {
    final raw = (image ?? '').trim();
    if (raw.isEmpty) {
      return _buildPlaceholder();
    }

    // 1. Data URI base64 (e.g. data:image/webp;base64,...)
    if (raw.startsWith('data:image')) {
      try {
        final commaIdx = raw.indexOf(',');
        final base64String = commaIdx != -1 ? raw.substring(commaIdx + 1) : raw;
        final Uint8List bytes = base64Decode(base64String);
        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          cacheWidth: decodeWidth,
          errorBuilder: (_, __, ___) => _buildPlaceholder(),
        );
      } catch (_) {
        return _buildPlaceholder();
      }
    }

    // 2. Network URL (http/https)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return Image.network(
        raw,
        width: width,
        height: height,
        fit: fit,
        cacheWidth: decodeWidth,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return _buildLoadingShimmer();
        },
        errorBuilder: (_, __, ___) => _buildPlaceholder(),
      );
    }

    // 3. Local Asset
    if (raw.startsWith('assets/')) {
      return Image.asset(
        raw,
        width: width,
        height: height,
        fit: fit,
        cacheWidth: decodeWidth,
        errorBuilder: (_, __, ___) => _buildPlaceholder(),
      );
    }

    // Fallback if raw string doesn't match known patterns
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: placeholderColor ?? const Color(0xFFFFF7ED), // warm orange-50
      alignment: Alignment.center,
      child: Icon(
        placeholderIcon,
        color: iconColor ?? const Color(0xFFF97316),
        size: (width != null && height != null)
            ? (width! < height! ? width! * 0.4 : height! * 0.4).clamp(16.0, 48.0)
            : 32,
      ),
    );
  }

  Widget _buildLoadingShimmer() {
    return Container(
      width: width,
      height: height,
      color: const Color(0xFFF1F5F9), // slate-100
      alignment: Alignment.center,
      child: const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF97316)),
        ),
      ),
    );
  }
}
