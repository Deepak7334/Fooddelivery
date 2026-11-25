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
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final boxWidth = width;
    final boxHeight = height;
    Widget imageWidget;
    if (boxWidth != null && boxWidth.isFinite) {
      imageWidget = _buildImage(context, _decodeSize(context, boxWidth, boxHeight));
    } else {
      imageWidget = LayoutBuilder(
        builder: (context, constraints) => _buildImage(
          context,
          constraints.hasBoundedWidth
              ? _decodeSize(context, constraints.maxWidth, boxHeight)
              : null,
        ),
      );
    }

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: imageWidget,
      );
    }
    return imageWidget;
  }

  // Decode at the largest on-screen dimension (cover-fit safe) instead of the
  // original resolution, which is far cheaper for thumbnails in lists/grids.
  static int _decodeSize(BuildContext context, double w, double? h) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final side = (h != null && h.isFinite && h > w) ? h : w;
    return (side * dpr).round().clamp(64, 1600);
  }

  static final Map<String, Uint8List> _base64Cache = {};

  static Uint8List _decodeBase64(String raw) {
    final cached = _base64Cache[raw];
    if (cached != null) return cached;
    final commaIdx = raw.indexOf(',');
    final bytes = base64Decode(commaIdx != -1 ? raw.substring(commaIdx + 1) : raw);
    if (_base64Cache.length >= 64) _base64Cache.remove(_base64Cache.keys.first);
    _base64Cache[raw] = bytes;
    return bytes;
  }

  Widget _buildImage(BuildContext context, int? cacheWidth) {
    final raw = (image ?? '').trim();
    if (raw.isEmpty) {
      return _buildPlaceholder();
    }

    // 1. Data URI base64 (e.g. data:image/webp;base64,...)
    if (raw.startsWith('data:image')) {
      try {
        return Image.memory(
          _decodeBase64(raw),
          width: width,
          height: height,
          fit: fit,
          cacheWidth: cacheWidth,
          gaplessPlayback: true,
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
        cacheWidth: cacheWidth,
        gaplessPlayback: true,
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
        cacheWidth: cacheWidth,
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
    );
  }
}
