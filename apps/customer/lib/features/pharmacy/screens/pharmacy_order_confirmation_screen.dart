import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Order confirmation — success animation, order number, track CTA.
class PharmacyOrderConfirmationScreen extends StatefulWidget {
  final String? orderId;
  const PharmacyOrderConfirmationScreen({super.key, this.orderId});
  @override State<PharmacyOrderConfirmationScreen> createState() => _PharmacyOrderConfirmationScreenState();
}

class _PharmacyOrderConfirmationScreenState extends State<PharmacyOrderConfirmationScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _scaleAnim = Tween<double>(begin: 0.3, end: 1.0).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.elasticOut));
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _animCtrl, curve: const Interval(0.4, 1.0)));
    _animCtrl.forward();
  }

  @override
  void dispose() { _animCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final orderNumber = widget.orderId ?? 'PH-2026-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(flex: 2),
              // Success icon
              ScaleTransition(
                scale: _scaleAnim,
                child: Container(
                  width: 120, height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [Colors.green.shade400, Colors.green.shade600],
                    ),
                    boxShadow: [BoxShadow(color: Colors.green.withValues(alpha: 0.3), blurRadius: 24, offset: const Offset(0, 8))],
                  ),
                  child: const Icon(Icons.check_rounded, color: Colors.white, size: 64),
                ),
              ),
              const SizedBox(height: 32),
              FadeTransition(
                opacity: _fadeAnim,
                child: Column(
                  children: [
                    const Text('Order Placed! 🎉', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.black87)),
                    const SizedBox(height: 12),
                    Text('Your pharmacy order has been confirmed', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
                    const SizedBox(height: 24),
                    // Order info card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          _infoRow('Order Number', orderNumber),
                          const Divider(height: 24),
                          _infoRow('Estimated Delivery', '25–35 min'),
                          const Divider(height: 24),
                          _infoRow('Payment', 'M-Pesa • Paid'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Prescription note
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.amber.shade700, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Prescription medicines will be dispensed after pharmacist verification.',
                              style: TextStyle(fontSize: 12, color: Colors.amber.shade800, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(flex: 3),
              // Action buttons
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: const Text('Track Order'),
                  onPressed: () => Navigator.pushReplacementNamed(context, '/pharmacy/tracking', arguments: orderNumber),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/pharmacy', (r) => r.isFirst),
                child: Text('Continue Shopping', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black87)),
      ],
    );
  }
}
