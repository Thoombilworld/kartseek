import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Takeaway Order Success Screen — shown after order is successfully placed.
class TakeawayOrderSuccessScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const TakeawayOrderSuccessScreen({super.key, this.args});

  @override
  State<TakeawayOrderSuccessScreen> createState() => _TakeawayOrderSuccessScreenState();
}

class _TakeawayOrderSuccessScreenState extends State<TakeawayOrderSuccessScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _scale = CurvedAnimation(parent: _controller, curve: Curves.elasticOut);
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _orderId => (widget.args?['orderId'] as String?) ?? 'TKW-98741';
  String get _restaurant => (widget.args?['restaurant'] as String?) ?? 'The Grand Biryani House';
  String get _pickupTime => (widget.args?['pickupTime'] as String?) ?? 'ASAP (~20-25 min)';
  int get _total => (widget.args?['total'] as int?) ?? 1180;
  String get _paymentMethod => (widget.args?['paymentMethod'] as String?) ?? 'online';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: FadeTransition(
                  opacity: _fade,
                  child: Column(
                    children: [
                      const SizedBox(height: 20),
                      // Success Animation
                      ScaleTransition(
                        scale: _scale,
                        child: Container(
                          width: 120, height: 120,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF9333EA)]),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.check_circle_outline, color: Colors.white, size: 64),
                        ),
                      ),
                      const SizedBox(height: 24),

                      const Text('Order Placed! 🎉', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.black87)),
                      const SizedBox(height: 8),
                      Text('Your takeaway order has been sent to $_restaurant',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5)),
                      const SizedBox(height: 24),

                      // Order ID Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.purple.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.purple.shade200),
                        ),
                        child: Row(children: [
                          Container(
                            width: 48, height: 48,
                            decoration: BoxDecoration(color: const Color(0xFF7C3AED).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                            child: const Icon(Icons.receipt_long, color: Color(0xFF7C3AED), size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            const Text('Order ID', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600)),
                            Text(_orderId, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF7C3AED))),
                          ])),
                          GestureDetector(
                            onTap: () { Clipboard.setData(ClipboardData(text: _orderId)); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order ID copied!'), behavior: SnackBarBehavior.floating, backgroundColor: Color(0xFF7C3AED))); },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(border: Border.all(color: const Color(0xFF7C3AED)), borderRadius: BorderRadius.circular(8)),
                              child: const Text('Copy', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF7C3AED))),
                            ),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 16),

                      // Pickup Details
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8)]),
                        child: Column(children: [
                          _detailRow(Icons.location_on, 'Pickup From', _restaurant),
                          Divider(color: Colors.grey.shade100, height: 16),
                          _detailRow(Icons.timer_outlined, 'Pickup Time', _pickupTime),
                          Divider(color: Colors.grey.shade100, height: 16),
                          _detailRow(Icons.payment, 'Payment', _paymentMethod == 'online' ? 'Paid Online ✓' : 'Cash at Restaurant'),
                          Divider(color: Colors.grey.shade100, height: 16),
                          _detailRow(Icons.currency_rupee, 'Amount', '${RegionService.instance.currentCountry.currencySymbol} $_total', bold: true),
                        ]),
                      ),
                      const SizedBox(height: 16),

                      // Status Timeline Preview
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('What happens next?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                            const SizedBox(height: 12),
                            _timelineStep('Order Sent to Restaurant', 'Waiting for restaurant to accept', isActive: true),
                            _timelineStep('Order Accepted', 'Restaurant will confirm shortly', isActive: false),
                            _timelineStep('Preparing Your Food', 'Chef is preparing your order', isActive: false),
                            _timelineStep('Ready for Pickup', 'Head to the restaurant to collect', isActive: false),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Restaurant location hint
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.orange.shade200)),
                        child: Row(children: [
                          Icon(Icons.info_outline, color: Colors.orange.shade700, size: 18),
                          const SizedBox(width: 10),
                          Expanded(child: Text(
                            'You\'ll receive a notification when your order is ready for pickup. Please carry a valid ID.',
                            style: TextStyle(fontSize: 12, color: Colors.orange.shade800, fontWeight: FontWeight.w600),
                          )),
                        ]),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ),

            // Action buttons
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, AppRouter.takeawayTracking, arguments: {'orderId': _orderId}),
                  icon: const Icon(Icons.track_changes),
                  label: const Text('Track My Order', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(context, AppRouter.restaurant, (r) => r.isFirst),
                  icon: const Icon(Icons.home_outlined, size: 18),
                  label: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: Colors.grey.shade300),
                    foregroundColor: Colors.grey.shade700,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value, {bool bold = false}) {
    return Row(children: [
      Icon(icon, size: 16, color: Colors.grey.shade400),
      const SizedBox(width: 10),
      Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
      const Spacer(),
      Text(value, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.w900 : FontWeight.w700, color: bold ? AppTheme.restaurantColor : Colors.black87)),
    ]);
  }

  Widget _timelineStep(String title, String subtitle, {required bool isActive}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(
            width: 20, height: 20,
            decoration: BoxDecoration(
              color: isActive ? const Color(0xFF7C3AED) : Colors.grey.shade200,
              shape: BoxShape.circle,
            ),
            child: Icon(isActive ? Icons.circle : Icons.circle_outlined, size: 10, color: isActive ? Colors.white : Colors.grey.shade400),
          ),
          if (title != 'Ready for Pickup')
            Container(width: 2, height: 28, color: Colors.grey.shade200, margin: const EdgeInsets.symmetric(vertical: 2)),
        ]),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: isActive ? Colors.black87 : Colors.grey.shade500)),
          Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ])),
        if (isActive) Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(6)),
          child: Text('Now', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.purple.shade700)),
        ),
      ]),
    );
  }
}
