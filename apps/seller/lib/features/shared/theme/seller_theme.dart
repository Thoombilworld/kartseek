import 'package:flutter/material.dart';

/// KARTSEEK Seller App — Seller Theme Constants
///
/// Deep violet/indigo palette — distinct from:
///  - Customer app: green/teal primary
///  - Partner app: deep orange primary
class SellerTheme {
  SellerTheme._();

  // ── Brand Colors ──────────────────────────────────────────────────────────
  static const Color primary      = Color(0xFF6C3FC8); // Deep violet
  static const Color primaryLight = Color(0xFFF3EEFF);
  static const Color primaryDark  = Color(0xFF4A1FA8);
  static const Color accent       = Color(0xFF00C9A7); // Teal accent
  static const Color surface      = Color(0xFFF8F7FC);
  static const Color card         = Colors.white;
  static const Color textPrimary  = Color(0xFF0F172A);
  static const Color textSecondary= Color(0xFF64748B);
  static const Color textMuted    = Color(0xFF94A3B8);
  static const Color border       = Color(0xFFE2E8F0);
  static const Color successGreen = Color(0xFF22C55E);
  static const Color errorRed     = Color(0xFFEF4444);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color infoBlue     = Color(0xFF3B82F6);

  // ── Module-specific accent colors ─────────────────────────────────────────
  static const Color marketplace  = Color(0xFF6C3FC8);
  static const Color grocery      = Color(0xFF22C55E);
  static const Color restaurant   = Color(0xFFEF4444);
  static const Color pharmacy     = Color(0xFF3B82F6);
  static const Color doctor       = Color(0xFF0EA5E9);
  static const Color hotel        = Color(0xFFF59E0B);
  static const Color taxiVendor   = Color(0xFFEAB308);

  // ── Gradients ─────────────────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF6C3FC8), Color(0xFF9B59F5)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );
  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );
  static const LinearGradient earningsGradient = LinearGradient(
    colors: [Color(0xFF1B5E20), Color(0xFF43A047)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );

  /// Returns module color for a given [SellerRole] value string.
  static Color moduleColor(String roleValue) {
    switch (roleValue) {
      case 'marketplace_seller': return marketplace;
      case 'grocery_seller':     return grocery;
      case 'restaurant_owner':   return restaurant;
      case 'pharmacy_seller':    return pharmacy;
      case 'doctor':             return doctor;
      case 'hotel_owner':        return hotel;
      case 'taxi_vendor':        return taxiVendor;
      default:                   return primary;
    }
  }

  // ── Box Decorations ───────────────────────────────────────────────────────
  static BoxDecoration cardDecoration({Color? color}) => BoxDecoration(
    color: color ?? card,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: border, width: 1),
  );

  static BoxDecoration elevatedCard({Color? color}) => BoxDecoration(
    color: color ?? card,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4))],
  );

  static BoxDecoration gradientCard(LinearGradient gradient) => BoxDecoration(
    gradient: gradient,
    borderRadius: BorderRadius.circular(20),
    boxShadow: [BoxShadow(color: gradient.colors.first.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
  );

  // ── Status color helper ───────────────────────────────────────────────────
  static Color statusColor(String status) {
    final s = status.toLowerCase();
    if (s.contains('delivered') || s.contains('approved') || s.contains('verified') || s.contains('active')) return successGreen;
    if (s.contains('cancelled') || s.contains('rejected') || s.contains('failed')) return errorRed;
    if (s.contains('pending') || s.contains('review') || s.contains('waiting')) return warningAmber;
    if (s.contains('preparing') || s.contains('processing') || s.contains('confirmed')) return infoBlue;
    return textMuted;
  }

  // ── MaterialTheme helper ──────────────────────────────────────────────────
  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    primaryColor: primary,
    scaffoldBackgroundColor: surface,
    fontFamily: 'Inter',
    colorScheme: const ColorScheme.light(
      primary: primary,
      secondary: accent,
      surface: card,
      error: errorRed,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      backgroundColor: Colors.white,
      foregroundColor: textPrimary,
      centerTitle: false,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14),
      ),
    ),
    cardTheme: CardThemeData(
      color: card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: border, width: 1),
      ),
    ),
  );
}
