import 'dart:async';
import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Dine-in Order Tracking Screen — real-time status updates for dine-in orders.
class DineInOrderTrackingScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const DineInOrderTrackingScreen({super.key, this.args});

  @override
  State<DineInOrderTrackingScreen> createState() => _DineInOrderTrackingScreenState();
}

class _DineInOrderTrackingScreenState extends State<DineInOrderTrackingScreen> {
  int _currentStep = 0; // 0=placed, 1=accepted, 2=table_assigned, 3=preparing, 4=ready, 5=served
  Timer? _demoTimer;

  static const _steps = [
    _TrackStep('dine_in_created',    'Order Placed',              'Your dine-in order has been placed successfully.',             Icons.check_circle_outline,       Color(0xFF10B981)),
    _TrackStep('restaurant_pending', 'Waiting for Confirmation',  'Restaurant is reviewing your order.',                          Icons.hourglass_top,              Color(0xFFF59E0B)),
    _TrackStep('restaurant_accepted','Restaurant Accepted',       'Your order has been accepted! Get ready to dine.',             Icons.thumb_up_outlined,          Color(0xFF3B82F6)),
    _TrackStep('table_assigned',     'Table Assigned',            'Your table has been assigned. Please proceed.',                Icons.table_restaurant,           Color(0xFF8B5CF6)),
    _TrackStep('preparing',          'Food Being Prepared',       'Our chefs are preparing your delicious meal!',                 Icons.soup_kitchen,               Color(0xFFEA580C)),
    _TrackStep('ready_to_serve',     'Ready to Serve! 🍽️',       'Your food is ready! A server will bring it to you shortly.',   Icons.dining,                     Color(0xFF16A34A)),
    _TrackStep('served',             'Food Served',               'Enjoy your meal! Please let us know if you need anything.',   Icons.star_outline,               Color(0xFF16A34A)),
  ];

  @override
  void initState() {
    super.initState();
    // Simulate real-time status progression for demo
    _demoTimer = Timer.periodic(const Duration(seconds: 4), (t) {
      if (!mounted) { t.cancel(); return; }
      if (_currentStep < _steps.length - 1) {
        setState(() => _currentStep++);
      } else {
        t.cancel();
      }
    });
  }

  @override
  void dispose() {
    _demoTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = widget.args ?? {};
    final orderId = args['orderId'] as String? ?? 'DI-2026-0001';
    final table = args['table'] as String? ?? 'Auto-assigned';
    final total = args['total'] as int? ?? 0;
    final currentStepData = _steps[_currentStep];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Order Tracking', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87)),
          Text(orderId, style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.normal)),
        ]),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.support_agent, size: 16),
            label: const Text('Support', style: TextStyle(fontSize: 12)),
            onPressed: () => Navigator.pushNamed(context, '/restaurant/help'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Live status header
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: currentStepData.color.withValues(alpha: 0.12)),
            child: Column(children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                child: Icon(currentStepData.icon, key: ValueKey(_currentStep), size: 52, color: currentStepData.color),
              ),
              const SizedBox(height: 12),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: Text(currentStepData.label, key: ValueKey('label$_currentStep'), style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: currentStepData.color)),
              ),
              const SizedBox(height: 6),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: Text(currentStepData.description, key: ValueKey('desc$_currentStep'), textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.5)),
              ),
              if (_currentStep < _steps.length - 1) ...[
                const SizedBox(height: 10),
                SizedBox(
                  height: 3,
                  child: LinearProgressIndicator(
                    value: (_currentStep + 1) / _steps.length,
                    backgroundColor: Colors.grey.shade200,
                    color: currentStepData.color,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ],
            ]),
          ),

          // Order info strip
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(children: [
              _OrderChip(icon: Icons.table_restaurant, label: table),
              const SizedBox(width: 10),
              _OrderChip(icon: Icons.currency_rupee, label: '${RegionService.instance.currentCountry.currencySymbol} $total'),
              const Spacer(),
              if (_currentStep == 5) // ready to serve
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: Colors.green.shade600, borderRadius: BorderRadius.circular(8)),
                  child: const Text('🍽️ READY!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                ),
            ]),
          ),
          Divider(color: Colors.grey.shade100, height: 1),

          // Step timeline
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Timeline
                  ..._steps.asMap().entries.map((e) {
                    final i = e.key;
                    final step = e.value;
                    final isDone = i < _currentStep;
                    final isCurrent = i == _currentStep;
                    final isLast = i == _steps.length - 1;
                    return _TimelineRow(step: step, isDone: isDone, isCurrent: isCurrent, isLast: isLast, index: i);
                  }),
                  const SizedBox(height: 24),

                  // Restaurant contact card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Restaurant Contact', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 12),
                      Row(children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.restaurant, color: AppTheme.restaurantColor, size: 20),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('The Grand Biryani House', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          Text('12 MG Road, Bengaluru', style: TextStyle(fontSize: 12, color: Colors.black54)),
                        ])),
                        IconButton(
                          onPressed: () => Navigator.pushNamed(context, '/restaurant/chat', arguments: {'restaurantName': 'The Grand Biryani House'}),
                          icon: const Icon(Icons.phone, color: AppTheme.restaurantColor),
                          style: IconButton.styleFrom(backgroundColor: Colors.orange.shade50, shape: const CircleBorder()),
                        ),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 14),

                  // Order items summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Your Order', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 12),
                      ...[
                        ('Chicken Biryani ×2', '${RegionService.instance.currentCountry.currencySymbol} 598'),
                        ('Mutton Biryani ×1', '${RegionService.instance.currentCountry.currencySymbol} 349'),
                        ('Butter Naan ×3', '${RegionService.instance.currentCountry.currencySymbol} 135'),
                        ('Raita ×1', '${RegionService.instance.currentCountry.currencySymbol} 49'),
                      ].map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Flexible(child: Text(item.$1, style: const TextStyle(fontSize: 13))),
                          Text(item.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                        ]),
                      )),
                    ]),
                  ),
                ],
              ),
            ),
          ),

          // CTA when served
          if (_currentStep >= 5)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -4))],
              ),
              child: SafeArea(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, AppRouter.restaurantOrderHistory),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.restaurantColor, foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                    child: const Text('View Order History', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                  const SizedBox(height: 4),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class _TrackStep {
  final String status;
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  const _TrackStep(this.status, this.label, this.description, this.icon, this.color);
}

class _TimelineRow extends StatelessWidget {
  final _TrackStep step;
  final bool isDone;
  final bool isCurrent;
  final bool isLast;
  final int index;
  const _TimelineRow({required this.step, required this.isDone, required this.isCurrent, required this.isLast, required this.index});

  @override
  Widget build(BuildContext context) {
    final color = isDone ? Colors.green.shade600 : isCurrent ? step.color : Colors.grey.shade300;
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Column(children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 400),
          width: 34, height: 34,
          decoration: BoxDecoration(
            color: isDone ? Colors.green.shade600 : isCurrent ? step.color : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(child: isDone
              ? const Icon(Icons.check, size: 16, color: Colors.white)
              : Icon(step.icon, size: 16, color: isCurrent ? Colors.white : Colors.grey.shade400)),
        ),
        if (!isLast)
          AnimatedContainer(
            duration: const Duration(milliseconds: 400),
            width: 2, height: 40,
            color: isDone ? Colors.green.shade300 : Colors.grey.shade200,
          ),
      ]),
      const SizedBox(width: 14),
      Expanded(
        child: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(step.label, style: TextStyle(fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600, fontSize: 14, color: isCurrent ? step.color : (isDone ? Colors.black87 : Colors.grey.shade500))),
            if (isCurrent) ...[
              const SizedBox(height: 3),
              Text(step.description, style: TextStyle(fontSize: 11, color: Colors.grey.shade600, height: 1.4)),
            ],
            if (!isLast) const SizedBox(height: 6),
          ]),
        ),
      ),
    ]);
  }
}

class _OrderChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _OrderChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: Colors.grey.shade600),
        const SizedBox(width: 4),
        Flexible(child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade700), overflow: TextOverflow.ellipsis)),
      ]),
    );
  }
}
