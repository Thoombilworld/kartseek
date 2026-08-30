import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Pill-shaped status chip with module-aware coloring.
class OrderStatusChip extends StatelessWidget {
  final SellerOrderStatus status;
  const OrderStatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.displayLabel,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  Color _colorFor(SellerOrderStatus s) {
    if (s == SellerOrderStatus.delivered || s == SellerOrderStatus.completed) return SellerTheme.successGreen;
    if (s == SellerOrderStatus.cancelled || s == SellerOrderStatus.refunded) return SellerTheme.errorRed;
    if (s == SellerOrderStatus.pending) return SellerTheme.warningAmber;
    if (s == SellerOrderStatus.outForDelivery || s == SellerOrderStatus.pickedUp) return SellerTheme.infoBlue;
    return SellerTheme.primary;
  }
}
