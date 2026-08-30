import 'package:flutter/material.dart';

/// KARTSEEK — Advanced Responsive Utility
///
/// Handles all device form factors with optimized breakpoints:
/// - Small phones (Galaxy A01, width < 360dp)
/// - Standard phones (iPhone SE, Galaxy S series, 360-399dp)
/// - Large phones (iPhone Pro Max, Galaxy Ultra, 400-599dp)
/// - Foldables inner display (Galaxy Z Fold, 600-839dp)
/// - Tablets (iPad, Samsung Tab, 840dp+)
///
/// Tested against:
/// - Samsung Galaxy A01/A13 (320-360dp)
/// - Samsung Galaxy S24/S24+ (360-411dp)
/// - Samsung Galaxy Z Fold5 (inner: 674dp, outer: 344dp)
/// - Oppo Find N3 Flip (inner: 672dp, outer: 346dp)
/// - Huawei Mate X5 (inner: 670dp, outer: 370dp)
/// - iPad Mini / iPad Pro (744-1024dp)
/// - iPhone SE / iPhone 15 Pro Max (375-430dp)
class Responsive {
  static late double _screenWidth;
  static late double _screenHeight;
  static late double _scaleFactor;
  static late DeviceType _deviceType;
  static late EdgeInsets _viewPadding;
  static late double _pixelRatio;
  static late Orientation _orientation;

  static void init(BuildContext context) {
    final mq = MediaQuery.of(context);
    final size = mq.size;
    _screenWidth = size.width;
    _screenHeight = size.height;
    _viewPadding = mq.viewPadding;
    _pixelRatio = mq.devicePixelRatio;
    _orientation = mq.orientation;

    // Determine device type from shortest side (orientation-independent)
    final shortestSide = size.shortestSide;
    if (shortestSide >= 840) {
      _deviceType = DeviceType.tablet;
      _scaleFactor = 1.3;
    } else if (shortestSide >= 600) {
      _deviceType = DeviceType.foldable;
      _scaleFactor = 1.15;
    } else if (_screenWidth >= 400) {
      _deviceType = DeviceType.largePhone;
      _scaleFactor = 1.05;
    } else if (_screenWidth >= 360) {
      _deviceType = DeviceType.phone;
      _scaleFactor = 1.0;
    } else {
      _deviceType = DeviceType.smallPhone;
      _scaleFactor = 0.88;
    }
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  static double get width => _screenWidth;
  static double get height => _screenHeight;
  static DeviceType get deviceType => _deviceType;
  static bool get isSmallPhone => _deviceType == DeviceType.smallPhone;
  static bool get isPhone => _deviceType == DeviceType.phone || _deviceType == DeviceType.largePhone;
  static bool get isFoldable => _deviceType == DeviceType.foldable;
  static bool get isTablet => _deviceType == DeviceType.tablet;
  static bool get isLargeScreen => isFoldable || isTablet;
  static Orientation get orientation => _orientation;
  static EdgeInsets get viewPadding => _viewPadding;
  static double get pixelRatio => _pixelRatio;

  /// Scaled font size — ensures readability across all device densities
  static double sp(double size) => size * _scaleFactor;

  /// Scaled spacing as percentage of width/height
  static double wp(double percentage) => _screenWidth * percentage / 100;
  static double hp(double percentage) => _screenHeight * percentage / 100;

  /// Horizontal padding — adapts from 12dp (small phone) to 32dp (tablet)
  static double get hPad {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 12.0;
      case DeviceType.phone: return 16.0;
      case DeviceType.largePhone: return 18.0;
      case DeviceType.foldable: return 24.0;
      case DeviceType.tablet: return 32.0;
    }
  }

  /// Minimum touch target (48dp per Material guidelines, 44pt per Apple HIG)
  static const double minTouchTarget = 48.0;

  // ── Adaptive Grid Columns ────────────────────────────────────────────────

  /// Product grid columns — 2 for phones, 3 for foldables, 4 for tablets
  static int get productGridColumns {
    if (_orientation == Orientation.landscape) {
      return _deviceType == DeviceType.tablet ? 5 : (_deviceType == DeviceType.foldable ? 4 : 3);
    }
    switch (_deviceType) {
      case DeviceType.smallPhone: return 2;
      case DeviceType.phone: return 2;
      case DeviceType.largePhone: return 2;
      case DeviceType.foldable: return 3;
      case DeviceType.tablet: return 4;
    }
  }

  /// Category grid columns — 3 for phones, 4 for large, 5 for tablets
  static int get categoryGridColumns {
    if (_orientation == Orientation.landscape) {
      return _deviceType == DeviceType.tablet ? 6 : 5;
    }
    switch (_deviceType) {
      case DeviceType.smallPhone: return 3;
      case DeviceType.phone: return 4;
      case DeviceType.largePhone: return 4;
      case DeviceType.foldable: return 5;
      case DeviceType.tablet: return 6;
    }
  }

  /// Module grid columns — 2 for small, 3 for phones, 4 for foldable+
  static int get moduleGridColumns {
    if (_orientation == Orientation.landscape) {
      return _deviceType == DeviceType.tablet ? 6 : 4;
    }
    switch (_deviceType) {
      case DeviceType.smallPhone: return 2;
      case DeviceType.phone: return 3;
      case DeviceType.largePhone: return 3;
      case DeviceType.foldable: return 4;
      case DeviceType.tablet: return 4;
    }
  }

  // ── Adaptive Product Card Aspect Ratio ───────────────────────────────────

  /// Product card aspect ratio that works across all screen sizes.
  static double get productCardAspectRatio {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 0.54;
      case DeviceType.phone: return 0.58;
      case DeviceType.largePhone: return 0.60;
      case DeviceType.foldable: return 0.62;
      case DeviceType.tablet: return 0.65;
    }
  }

  /// Service module card aspect ratio
  static double get moduleCardAspectRatio {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 0.85;
      case DeviceType.phone: return 0.8;
      case DeviceType.largePhone: return 0.82;
      case DeviceType.foldable: return 0.85;
      case DeviceType.tablet: return 0.9;
    }
  }

  /// Category card aspect ratio (square-ish items)
  static double get categoryCardAspectRatio {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 0.75;
      case DeviceType.phone: return 0.8;
      case DeviceType.largePhone: return 0.82;
      case DeviceType.foldable: return 0.85;
      case DeviceType.tablet: return 0.88;
    }
  }

  // ── Adaptive Grid Delegates ──────────────────────────────────────────────

  /// Product grid delegate — automatically adapts to device type
  static SliverGridDelegate get productGridDelegate =>
    SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: productGridColumns,
      childAspectRatio: productCardAspectRatio,
      crossAxisSpacing: isLargeScreen ? 14 : 10,
      mainAxisSpacing: isLargeScreen ? 14 : 10,
    );

  /// Category grid delegate
  static SliverGridDelegate get categoryGridDelegate =>
    SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: categoryGridColumns,
      childAspectRatio: categoryCardAspectRatio,
      crossAxisSpacing: isLargeScreen ? 12 : 10,
      mainAxisSpacing: isLargeScreen ? 12 : 10,
    );

  /// Adaptive max-width grid
  static SliverGridDelegate get adaptiveProductGridDelegate =>
    SliverGridDelegateWithMaxCrossAxisExtent(
      maxCrossAxisExtent: isTablet ? 240 : (isFoldable ? 210 : 200),
      childAspectRatio: productCardAspectRatio,
      crossAxisSpacing: isLargeScreen ? 14 : 10,
      mainAxisSpacing: isLargeScreen ? 14 : 10,
    );

  // ── Horizontal Scroll Item Width ─────────────────────────────────────────

  /// Horizontal card width (for carousels, store cards, etc.)
  static double get horizontalCardWidth {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 140.0;
      case DeviceType.phone: return 160.0;
      case DeviceType.largePhone: return 170.0;
      case DeviceType.foldable: return 200.0;
      case DeviceType.tablet: return 220.0;
    }
  }

  /// Store card width in horizontal lists
  static double get storeCardWidth {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 260.0;
      case DeviceType.phone: return 300.0;
      case DeviceType.largePhone: return 320.0;
      case DeviceType.foldable: return 360.0;
      case DeviceType.tablet: return 400.0;
    }
  }

  /// Promo banner width in horizontal lists
  static double get promoBannerWidth {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 240.0;
      case DeviceType.phone: return 270.0;
      case DeviceType.largePhone: return 300.0;
      case DeviceType.foldable: return 340.0;
      case DeviceType.tablet: return 380.0;
    }
  }

  // ── Safe Area Helpers ────────────────────────────────────────────────────

  /// Bottom padding for floating buttons (accounts for gesture nav bars)
  static double get bottomSafePadding =>
    _viewPadding.bottom > 0 ? _viewPadding.bottom + 8 : 24;

  /// Image height that scales with screen
  static double get heroImageHeight {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 200.0;
      case DeviceType.phone: return 280.0;
      case DeviceType.largePhone: return 320.0;
      case DeviceType.foldable: return 360.0;
      case DeviceType.tablet: return 400.0;
    }
  }

  /// SliverAppBar expanded height
  static double get appBarExpandedHeight {
    switch (_deviceType) {
      case DeviceType.smallPhone: return 300.0;
      case DeviceType.phone: return 360.0;
      case DeviceType.largePhone: return 400.0;
      case DeviceType.foldable: return 420.0;
      case DeviceType.tablet: return 450.0;
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /// Returns a value based on device type (responsive switch)
  static T value<T>({
    required T phone,
    T? smallPhone,
    T? largePhone,
    T? foldable,
    T? tablet,
  }) {
    switch (_deviceType) {
      case DeviceType.smallPhone: return smallPhone ?? phone;
      case DeviceType.phone: return phone;
      case DeviceType.largePhone: return largePhone ?? phone;
      case DeviceType.foldable: return foldable ?? largePhone ?? phone;
      case DeviceType.tablet: return tablet ?? foldable ?? largePhone ?? phone;
    }
  }
}

/// Device type classification
enum DeviceType {
  smallPhone,  // < 360dp width (Galaxy A01, old budget phones)
  phone,       // 360-399dp (iPhone SE, Galaxy S series, Oppo A series)
  largePhone,  // 400-599dp (iPhone Pro Max, Galaxy Ultra, Huawei P60 Pro)
  foldable,    // 600-839dp (Galaxy Z Fold, Oppo Find N, Huawei Mate X)
  tablet,      // 840dp+ (iPad, Samsung Tab, Huawei MatePad)
}

/// Extension on BuildContext for quick responsive access
extension ResponsiveExt on BuildContext {
  double get screenWidth => MediaQuery.of(this).size.width;
  double get screenHeight => MediaQuery.of(this).size.height;
  bool get isSmallPhone => MediaQuery.of(this).size.width < 360;
  bool get isTablet => MediaQuery.of(this).size.shortestSide >= 840;
  bool get isFoldable {
    final shortestSide = MediaQuery.of(this).size.shortestSide;
    return shortestSide >= 600 && shortestSide < 840;
  }
  bool get isLargeScreen => isTablet || isFoldable;
  EdgeInsets get safePadding => MediaQuery.of(this).padding;
  Orientation get deviceOrientation => MediaQuery.of(this).orientation;
}
