import 'dart:typed_data';
import 'package:flutter/material.dart';

/// KARTSEEK — Unified Image Loader with Automatic Fallbacks
///
/// Handles network and local assets with robust error boundaries to prevent
/// red screens or broken layouts. Prevents loading known invalid domains like
/// unsplash.com (used in local development mock data) and falls back to clean,
/// high-fidelity generated placeholders (no asset files required).
class KartseekImage extends StatelessWidget {
  final String? url;
  final bool isBanner;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const KartseekImage({
    super.key,
    required this.url,
    this.isBanner = false,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  /// Returns true if the given URL should not be fetched over the network.
  /// Blocks known placeholder / dev-only domains that return undecodable images.
  static bool _isUrlInvalid(String? url) {
    if (url == null || url.isEmpty) return true;
    if (url.contains('unsplash.com')) return true;
    if (url.contains('placeholder.com')) return true;
    if (url.contains('via.placeholder')) return true;
    if (url.contains('picsum.photos')) return true;
    return false;
  }

  /// Generate a placeholder widget instead of trying to load missing asset files.
  static Widget placeholder({bool isBanner = false, double? width, double? height}) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isBanner
              ? [const Color(0xFF1E293B), const Color(0xFF334155)]
              : [const Color(0xFFF1F5F9), const Color(0xFFE2E8F0)],
        ),
      ),
      child: Center(
        child: Icon(
          isBanner ? Icons.image_outlined : Icons.inventory_2_outlined,
          size: isBanner ? 40 : 32,
          color: isBanner ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
        ),
      ),
    );
  }

  /// Helper to generate a robust [DecorationImage] with error fallbacks.
  /// Uses a 1x1 transparent image as fallback instead of a missing asset file.
  static DecorationImage decoration({
    required String? url,
    bool isBanner = false,
    BoxFit fit = BoxFit.cover,
    ColorFilter? colorFilter,
  }) {
    // Always return transparent pixel for invalid/dev URLs
    if (_isUrlInvalid(url)) {
      return DecorationImage(
        image: MemoryImage(_transparentPixel),
        fit: fit,
        colorFilter: colorFilter,
      );
    }

    return DecorationImage(
      image: NetworkImage(url!),
      fit: fit,
      colorFilter: colorFilter,
      onError: (error, stackTrace) {
        debugPrint('[KartseekImage] ⚠️ Failed to load decoration image "$url": $error');
      },
    );
  }

  /// 1x1 transparent PNG pixel — used as a safe in-memory fallback image.
  static final _transparentPixel = Uint8List.fromList(const [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // RGBA
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT
    0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
    0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, // IEND
    0x60, 0x82,
  ]);

  @override
  Widget build(BuildContext context) {
    if (_isUrlInvalid(url)) {
      return _wrap(placeholder(isBanner: isBanner, width: width, height: height));
    }

    return _wrap(
      Image.network(
        url!,
        width: width,
        height: height,
        fit: fit,
        gaplessPlayback: true,
        errorBuilder: (context, error, stackTrace) {
          debugPrint('[KartseekImage] ⚠️ Failed to load "$url": $error');
          return placeholder(isBanner: isBanner, width: width, height: height);
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            width: width,
            height: height,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFF1F5F9),
                  Color(0xFFE2E8F0),
                  Color(0xFFF1F5F9),
                ],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                          loadingProgress.expectedTotalBytes!
                      : null,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _wrap(Widget child) {
    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}
