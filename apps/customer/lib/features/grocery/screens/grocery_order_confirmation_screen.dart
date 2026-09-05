import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Order Confirmation Screen — Post-checkout success with confetti.
class GroceryOrderConfirmationScreen extends StatefulWidget {
  final String? orderId;
  const GroceryOrderConfirmationScreen({super.key, this.orderId});
  @override
  State<GroceryOrderConfirmationScreen> createState() => _GroceryOrderConfirmationScreenState();
}

class _GroceryOrderConfirmationScreenState extends State<GroceryOrderConfirmationScreen> with TickerProviderStateMixin {
  static const _groceryColor = AppTheme.groceryColor;
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _scaleAnimation = CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut);
    _scaleController.forward();
  }

  @override
  void dispose() { _scaleController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Success icon
              ScaleTransition(
                scale: _scaleAnimation,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: _groceryColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle, color: _groceryColor, size: 60),
                ),
              ),
              const SizedBox(height: 24),

              const Text('🎉', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 12),

              const Text('Order Placed!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(
                'Your order #${widget.orderId ?? 'GRC-2847'} has been placed successfully.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
              ),

              const SizedBox(height: 24),

              // Order details card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    _infoRow('Order ID', '#${widget.orderId ?? 'GRC-2847'}'),
                    const Divider(height: 16),
                    _infoRow('Estimated Delivery', '30 - 45 min'),
                    const Divider(height: 16),
                    _infoRow('Payment', 'KARTSEEK Wallet'),
                    const Divider(height: 16),
                    _infoRow('Total', '${RegionService.instance.currentCountry.currencySymbol} 550', isBold: true),
                  ],
                ),
              ),

              const Spacer(),

              // Actions
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: () {
                    // Navigate to tracking
                  },
                  icon: const Icon(Icons.local_shipping, size: 18),
                  label: const Text('Track Order', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _groceryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton(
                  onPressed: () {
                    // Navigate back to grocery home
                    Navigator.popUntil(context, (route) => route.isFirst);
                  },
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: Colors.grey.shade300),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text('Continue Shopping', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: isBold ? FontWeight.w900 : FontWeight.w700, color: isBold ? _groceryColor : Colors.grey.shade800)),
      ],
    );
  }
}
