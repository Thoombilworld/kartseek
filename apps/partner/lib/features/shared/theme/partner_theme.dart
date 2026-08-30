import 'package:flutter/material.dart';

/// KARTSEEK Partner App — Partner Theme Constants
class PartnerTheme {
  PartnerTheme._();

  // ── Brand Colors ─────────────────────────────────────────────────────
  static const Color primary = Color(0xFFE65100);
  static const Color primaryLight = Color(0xFFFFF3E0);
  static const Color primaryDark = Color(0xFFBF360C);
  static const Color accent = Color(0xFF00BFA5);
  static const Color surface = Color(0xFFF8FAFC);
  static const Color card = Colors.white;
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color border = Color(0xFFE2E8F0);
  static const Color onlineGreen = Color(0xFF22C55E);
  static const Color offlineRed = Color(0xFFEF4444);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color infoBlue = Color(0xFF3B82F6);

  // ── Taxi / Delivery Colors ──────────────────────────────────────────
  static const Color taxiColor = Color(0xFFEAB308);
  static const Color deliveryColor = Color(0xFF8B5CF6);

  // ── Status Colors ───────────────────────────────────────────────────
  static Color statusColor(String status) {
    if (status.contains('completed') || status.contains('delivered') || status.contains('approved')) return onlineGreen;
    if (status.contains('cancelled') || status.contains('rejected') || status.contains('failed')) return offlineRed;
    if (status.contains('pending') || status.contains('review')) return warningAmber;
    if (status.contains('online') || status.contains('accepted')) return infoBlue;
    return textMuted;
  }

  // ── Gradients ───────────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFE65100), Color(0xFFFF8F00)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );

  static const LinearGradient earningsGradient = LinearGradient(
    colors: [Color(0xFF1B5E20), Color(0xFF43A047)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topLeft, end: Alignment.bottomRight,
  );

  // ── Box Decoration ──────────────────────────────────────────────────
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
}
