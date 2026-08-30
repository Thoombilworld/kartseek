import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';

/// Checkout Success — Order placed confirmation with animation.
class CheckoutSuccessScreen extends StatelessWidget {
  const CheckoutSuccessScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(child: Padding(padding: const EdgeInsets.all(32), child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 100, height: 100,
            decoration: BoxDecoration(color: AppTheme.successGreen.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: const Icon(Icons.check_circle, size: 64, color: AppTheme.successGreen)),
          const SizedBox(height: 28),
          const Text('Order Placed!', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          Text('Your order #KS-2026-78432 has been placed successfully.\nYou will receive a confirmation shortly.', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, color: Colors.grey.shade600, height: 1.5)),
          const SizedBox(height: 32),
          Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(16)),
            child: Row(children: [
              Icon(Icons.local_shipping_outlined, color: Colors.green.shade700, size: 24),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Estimated Delivery', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.green.shade700)),
                const SizedBox(height: 2),
                const Text('May 31 — June 2, 2026', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              ])),
            ])),
          const SizedBox(height: 40),
          SizedBox(width: double.infinity, height: 52, child: ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, AppRouter.orderDetail, arguments: 'KS-2026-78432'),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
            child: const Text('Track Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, height: 52, child: OutlinedButton(
            onPressed: () => Navigator.pushNamedAndRemoveUntil(context, AppRouter.home, (_) => false),
            style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), side: BorderSide(color: Colors.grey.shade300)),
            child: const Text('Continue Shopping', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)))),
        ],
      ))),
    );
  }
}
