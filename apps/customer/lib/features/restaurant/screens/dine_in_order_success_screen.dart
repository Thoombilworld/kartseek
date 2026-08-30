import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Dine-in Order Success Screen — shown after a successful dine-in order placement.
class DineInOrderSuccessScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const DineInOrderSuccessScreen({super.key, this.args});

  @override
  State<DineInOrderSuccessScreen> createState() => _DineInOrderSuccessScreenState();
}

class _DineInOrderSuccessScreenState extends State<DineInOrderSuccessScreen>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _slideController;
  late Animation<double> _scaleAnim;
  late Animation<double> _slideAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _slideController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));

    _scaleAnim = CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut);
    _slideAnim = CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic);
    _fadeAnim  = CurvedAnimation(parent: _slideController, curve: Curves.easeIn);

    _scaleController.forward();
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _slideController.forward();
    });
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = widget.args ?? {};
    final orderId = args['orderId'] as String? ?? 'DI-2026-0001';
    final table = args['table'] as String? ?? 'Auto-assigned';
    final total = args['total'] as int? ?? 0;
    final items = args['items'] as int? ?? 0;
    final restaurant = args['restaurant'] as String? ?? 'Restaurant';
    final payment = args['paymentMethod'] as String? ?? 'online';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const SizedBox(height: 24),

                    // Animated check icon
                    ScaleTransition(
                      scale: _scaleAnim,
                      child: Container(
                        width: 110, height: 110,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF16A34A), Color(0xFF4ADE80)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: const Color(0xFF16A34A).withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 8))],
                        ),
                        child: const Icon(Icons.restaurant, color: Colors.white, size: 52),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Title
                    FadeTransition(
                      opacity: _fadeAnim,
                      child: SlideTransition(
                        position: Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(_slideAnim),
                        child: Column(children: [
                          const Text('🎉 Dine-in Order Placed!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.black87)),
                          const SizedBox(height: 8),
                          Text('Your order has been sent to $restaurant.\nSit back, the chef is being notified!', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5)),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Order card
                    FadeTransition(
                      opacity: _fadeAnim,
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12)],
                        ),
                        child: Column(children: [
                          _SuccessRow(icon: Icons.confirmation_number_outlined, label: 'Order ID', value: orderId, valueColor: AppTheme.restaurantColor),
                          const Divider(height: 20),
                          _SuccessRow(icon: Icons.store_outlined, label: 'Restaurant', value: restaurant),
                          const Divider(height: 20),
                          _SuccessRow(icon: Icons.table_restaurant, label: 'Table', value: table),
                          const Divider(height: 20),
                          _SuccessRow(icon: Icons.shopping_bag_outlined, label: 'Items', value: '$items item${items > 1 ? 's' : ''}'),
                          const Divider(height: 20),
                          _SuccessRow(
                            icon: Icons.payment,
                            label: 'Payment',
                            value: payment == 'pay_at_restaurant' ? 'Pay at Restaurant' : payment == 'wallet' ? 'Wallet' : 'Online Payment',
                          ),
                          const Divider(height: 20),
                          _SuccessRow(icon: Icons.currency_rupee, label: 'Total', value: '${RegionService.instance.currentCountry.currencySymbol} $total', valueColor: const Color(0xFF16A34A)),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Status timeline
                    FadeTransition(
                      opacity: _fadeAnim,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Icon(Icons.timeline, color: Colors.green.shade700, size: 18),
                            const SizedBox(width: 8),
                            Text('Order Status', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.green.shade800)),
                          ]),
                          const SizedBox(height: 12),
                          const _StatusStep(step: 1, label: 'Order Placed', done: true),
                          const _StatusStep(step: 2, label: 'Waiting for restaurant confirmation', done: false),
                          const _StatusStep(step: 3, label: 'Restaurant accepted', done: false),
                          const _StatusStep(step: 4, label: 'Food being prepared', done: false),
                          const _StatusStep(step: 5, label: 'Ready to serve', done: false, isLast: true),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Info tip
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.orange.shade200)),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Icon(Icons.lightbulb_outline, color: Colors.orange.shade700, size: 18),
                        const SizedBox(width: 10),
                        Expanded(child: Text('Keep this screen open to track your order status in real-time. You\'ll be notified when the food is ready to serve!', style: TextStyle(fontSize: 12, color: Colors.orange.shade800, height: 1.5))),
                      ]),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                ElevatedButton(
                  onPressed: () => Navigator.pushNamed(context, AppRouter.dineInTracking, arguments: args),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.restaurantColor,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('Track My Order', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(context, AppRouter.restaurant, (r) => r.settings.name == AppRouter.home),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.restaurantColor,
                    side: const BorderSide(color: AppTheme.restaurantColor),
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Back to Restaurant', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuccessRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;
  const _SuccessRow({required this.icon, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 16, color: Colors.grey.shade400),
      const SizedBox(width: 10),
      Expanded(child: Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500))),
      Flexible(child: Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? Colors.black87), textAlign: TextAlign.right)),
    ]);
  }
}

class _StatusStep extends StatelessWidget {
  final int step;
  final String label;
  final bool done;
  final bool isLast;
  const _StatusStep({required this.step, required this.label, required this.done, this.isLast = false});

  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Column(children: [
        Container(
          width: 22, height: 22,
          decoration: BoxDecoration(
            color: done ? Colors.green.shade600 : Colors.white,
            border: Border.all(color: done ? Colors.green.shade600 : Colors.grey.shade300, width: 2),
            shape: BoxShape.circle,
          ),
          child: done ? const Icon(Icons.check, size: 12, color: Colors.white) : Center(child: Text('$step', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800))),
        ),
        if (!isLast) Container(width: 2, height: 24, color: done ? Colors.green.shade300 : Colors.grey.shade200),
      ]),
      const SizedBox(width: 10),
      Padding(
        padding: const EdgeInsets.only(top: 3),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: done ? FontWeight.w700 : FontWeight.normal, color: done ? Colors.green.shade800 : Colors.grey.shade500)),
      ),
    ]);
  }
}
