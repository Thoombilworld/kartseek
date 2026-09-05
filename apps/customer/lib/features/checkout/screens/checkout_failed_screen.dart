import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';

/// Checkout Failed Screen — payment failure with retry option.
class CheckoutFailedScreen extends StatelessWidget {
  final String? orderId;
  const CheckoutFailedScreen({super.key, this.orderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(child: Padding(padding: const EdgeInsets.all(32), child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 100, height: 100,
            decoration: BoxDecoration(color: Colors.red.shade50, shape: BoxShape.circle),
            child: Icon(Icons.close, size: 56, color: Colors.red.shade600)),
          const SizedBox(height: 28),
          const Text('Payment Failed', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          Text('Your payment could not be processed.\nPlease try again or use a different method.', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, color: Colors.grey.shade600, height: 1.5)),
          const SizedBox(height: 32),
          Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(16)),
            child: Row(children: [
              Icon(Icons.info_outline, color: Colors.red.shade700, size: 22),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('No amount was deducted', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.red.shade700)),
                const SizedBox(height: 2),
                Text('If debited, refund will be processed in 5-7 business days', style: TextStyle(fontSize: 12, color: Colors.red.shade600)),
              ])),
            ])),
          const SizedBox(height: 40),
          SizedBox(width: double.infinity, height: 52, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
            child: const Text('Retry Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, height: 52, child: OutlinedButton(
            onPressed: () => Navigator.pushNamedAndRemoveUntil(context, AppRouter.home, (_) => false),
            style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), side: BorderSide(color: Colors.grey.shade300)),
            child: const Text('Go to Home', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)))),
        ],
      ))),
    );
  }
}
