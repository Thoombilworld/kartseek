import 'package:flutter/material.dart';

/// KARTSEEK Super App — Design System
/// Premium, modern theme using Inter font (loaded via CDN in web/index.html).
class AppTheme {
  AppTheme._();

  // ── Brand Colors ─────────────────────────────────────────────────────────
  static const Color primaryGreen = Color(0xFF16A34A);
  static const Color primaryDark = Color(0xFF0F172A);
  static const Color accentOrange = Color(0xFFF97316);
  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color surfaceWhite = Color(0xFFF8FAFC);
  static const Color cardWhite = Colors.white;
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color borderLight = Color(0xFFE2E8F0);
  // ── Feedback ──────────────────────────────────────────────────────────────
  // Equal to the web's `--color-feedback-*` tokens. `successGreen` was
  // #22C55E (green-500) against the site's emerald-500, and there was no
  // warning token at all — every amber in the app was a literal.
  static const Color errorRed = Color(0xFFEF4444);      // red-500
  static const Color successGreen = Color(0xFF10B981);  // emerald-500
  static const Color warningAmber = Color(0xFFF59E0B);  // amber-500
  static const Color infoBlue = Color(0xFF2563EB);      // blue-600

  /// Page-level tint behind cards — the web's `--color-surface-muted`.
  static const Color surfaceMuted = Color(0xFFF1F5F9);  // slate-100

  // ── Module Colors ────────────────────────────────────────────────────────
  //
  // These are the mobile half of one cross-platform identity. The source of
  // truth is `apps/web/src/styles/design-tokens.json`, surfaced as the
  // `--module-<name>-primary` custom properties in `design-tokens.css`; the
  // values below must stay equal to it, so change both together.
  //
  // Five of the seven had drifted a full step or a whole hue away from the web
  // token — marketplace was blue-500 against the site's blue-600, doctor was
  // violet against indigo, pharmacy cyan against teal, taxi yellow-500 against
  // amber-600, restaurant orange-500 against orange-600 — which is why the apps
  // and the site did not read as the same product.
  static const Color marketplaceColor = Color(0xFF2563EB);  // blue-600
  static const Color groceryColor = Color(0xFF16A34A);      // green-600
  static const Color restaurantColor = Color(0xFFEA580C);   // orange-600
  static const Color doctorColor = Color(0xFF4F46E5);       // indigo-600
  static const Color pharmacyColor = Color(0xFF0D9488);     // teal-600
  static const Color hotelColor = Color(0xFFE11D48);        // rose-600
  static const Color taxiColor = Color(0xFFCA8A04);         // amber-600
  // Partner has no web counterpart — the courier app is mobile-only.
  static const Color partnerColor = Color(0xFFE65100);      // burnt orange

  // ── Font Family ──────────────────────────────────────────────────────────
  static const String fontFamily = 'Inter';

  // ── Text Styles ──────────────────────────────────────────────────────────
  static const TextStyle headingXL = TextStyle(
    fontFamily: fontFamily, fontSize: 28, fontWeight: FontWeight.w900, color: textPrimary, letterSpacing: -0.5, height: 1.2,
  );
  static const TextStyle headingLG = TextStyle(
    fontFamily: fontFamily, fontSize: 22, fontWeight: FontWeight.w800, color: textPrimary, letterSpacing: -0.3,
  );
  static const TextStyle headingMD = TextStyle(
    fontFamily: fontFamily, fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary,
  );
  static const TextStyle headingSM = TextStyle(
    fontFamily: fontFamily, fontSize: 15, fontWeight: FontWeight.w700, color: textPrimary,
  );
  static const TextStyle bodyLG = TextStyle(
    fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w400, color: textSecondary, height: 1.5,
  );
  static const TextStyle bodySM = TextStyle(
    fontFamily: fontFamily, fontSize: 13, fontWeight: FontWeight.w400, color: textSecondary,
  );
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily, fontSize: 11, fontWeight: FontWeight.w600, color: textMuted, letterSpacing: 0.5,
  );
  static const TextStyle buttonText = TextStyle(
    fontFamily: fontFamily, fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 0.3,
  );

  // ── Theme Data ───────────────────────────────────────────────────────────
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryGreen,
    scaffoldBackgroundColor: surfaceWhite,
    fontFamily: fontFamily,
    colorScheme: const ColorScheme.light(
      primary: primaryGreen,
      secondary: accentOrange,
      surface: cardWhite,
      error: errorRed,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      backgroundColor: Colors.white,
      foregroundColor: textPrimary,
      centerTitle: false,
      titleSpacing: 0, // Allow titles to stretch full width — prevents centering issues on Samsung/Huawei
      titleTextStyle: TextStyle(
        fontFamily: fontFamily, fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: borderLight, width: 1),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryGreen,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: buttonText,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF1F5F9),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      hintStyle: const TextStyle(fontFamily: fontFamily, color: textMuted, fontSize: 15),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: primaryGreen,
      unselectedItemColor: textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
  );
}
