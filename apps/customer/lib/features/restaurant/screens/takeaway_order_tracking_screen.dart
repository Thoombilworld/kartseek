import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Takeaway Order Tracking Screen — live status timeline.
/// Shows the full order status lifecycle for takeaway orders.
class TakeawayOrderTrackingScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const TakeawayOrderTrackingScreen({super.key, this.args});

  @override
  State<TakeawayOrderTrackingScreen> createState() =>
      _TakeawayOrderTrackingScreenState();
}

class _TakeawayOrderTrackingScreenState
    extends State<TakeawayOrderTrackingScreen> {
  // Simulate current status index (0-based from list below)
  int _currentStatusIndex = 1; // restaurant_accepted

  String get _orderId => (widget.args?['orderId'] as String?) ?? 'TKW-98741';

  final _statuses = [
    {
      'key': 'takeaway_created',
      'customerLabel': 'Order Placed',
      'desc': 'Your takeaway order has been sent to the restaurant',
      'icon': Icons.receipt_long,
      'time': '06:02 PM',
    },
    {
      'key': 'restaurant_accepted',
      'customerLabel': 'Restaurant Accepted',
      'desc': 'The Grand Biryani House has accepted your order',
      'icon': Icons.check_circle_outline,
      'time': '06:04 PM',
    },
    {
      'key': 'preparing',
      'customerLabel': 'Food is Being Prepared',
      'desc': 'The chef is preparing your fresh food',
      'icon': Icons.soup_kitchen,
      'time': null,
    },
    {
      'key': 'ready_for_pickup',
      'customerLabel': 'Ready for Pickup!',
      'desc': 'Your order is ready. Please head to the restaurant',
      'icon': Icons.notifications_active,
      'time': null,
    },
    {
      'key': 'collected',
      'customerLabel': 'Order Collected',
      'desc': 'You\'ve picked up your order. Enjoy your meal!',
      'icon': Icons.celebration,
      'time': null,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => Navigator.pop(context)),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Takeaway Tracking',
                style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87)),
            Text(_orderId,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('Opening help…'),
                  backgroundColor: AppTheme.restaurantColor,
                  behavior: SnackBarBehavior.floating));
              Navigator.pushNamed(context, '/restaurant/help');
            },
            icon: const Icon(Icons.support_agent, size: 16),
            label: const Text('Help',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            style:
                TextButton.styleFrom(foregroundColor: AppTheme.restaurantColor),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Status Hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                    colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)]),
              ),
              child: Column(children: [
                Icon(_statuses[_currentStatusIndex]['icon'] as IconData,
                    color: Colors.white, size: 48),
                const SizedBox(height: 12),
                Text(_statuses[_currentStatusIndex]['customerLabel'] as String,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                Text(_statuses[_currentStatusIndex]['desc'] as String,
                    textAlign: TextAlign.center,
                    style:
                        const TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 16),
                // Progress bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: (_currentStatusIndex + 1) / _statuses.length,
                    backgroundColor: Colors.white24,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(Colors.white),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 6),
                Text('Step ${_currentStatusIndex + 1} of ${_statuses.length}',
                    style: const TextStyle(
                        color: Colors.white60,
                        fontSize: 11,
                        fontWeight: FontWeight.w600)),
              ]),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Pickup details card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 8)
                        ]),
                    child: Column(children: [
                      Row(children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                              color: Colors.purple.shade50,
                              borderRadius: BorderRadius.circular(12)),
                          child: const Icon(Icons.store,
                              color: Color(0xFF7C3AED), size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              const Text('The Grand Biryani House',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15)),
                              Text('Plot 24, Food Street, Al Olaya District',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500)),
                            ])),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(
                            child: _actionButton(
                                Icons.directions, 'Directions', Colors.blue)),
                        const SizedBox(width: 10),
                        Expanded(
                            child: _actionButton(
                                Icons.phone, 'Call Restaurant', Colors.green)),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 16),

                  // Pickup Time Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(children: [
                      Icon(Icons.timer_outlined,
                          color: Colors.orange.shade700, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            const Text('Estimated Pickup',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.black54)),
                            Text('ASAP (~20-25 min)',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.orange.shade800)),
                          ])),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                            color: Colors.orange.shade100,
                            borderRadius: BorderRadius.circular(8)),
                        child: Text('~18 min left',
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: Colors.orange.shade800)),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 16),

                  // Status Timeline
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Order Timeline',
                            style: TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 15)),
                        const SizedBox(height: 16),
                        ..._statuses.asMap().entries.map((e) {
                          final i = e.key;
                          final s = e.value;
                          final isDone = i < _currentStatusIndex;
                          final isActive = i == _currentStatusIndex;
                          final isFuture = i > _currentStatusIndex;
                          return _timelineRow(
                            icon: s['icon'] as IconData,
                            title: s['customerLabel'] as String,
                            subtitle: s['desc'] as String,
                            time: s['time'] as String?,
                            isDone: isDone,
                            isActive: isActive,
                            isFuture: isFuture,
                            isLast: i == _statuses.length - 1,
                          );
                        }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Order Items Summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200)),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Your Order',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15)),
                                GestureDetector(
                                    onTap: () {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(SnackBar(
                                              content: Text(
                                                  'Viewing order $_orderId…'),
                                              backgroundColor:
                                                  AppTheme.restaurantColor,
                                              behavior:
                                                  SnackBarBehavior.floating));
                                      Navigator.pushNamed(
                                          context, '/restaurant/history');
                                    },
                                    child: const Text('View Details',
                                        style: TextStyle(
                                            fontSize: 13,
                                            color: AppTheme.restaurantColor,
                                            fontWeight: FontWeight.w700))),
                              ]),
                          const SizedBox(height: 10),
                          ...[
                            '2× Chicken Biryani',
                            '1× Paneer Butter Masala',
                            '4× Butter Naan',
                            '2× Gulab Jamun',
                          ].map((item) => Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Row(children: [
                                  Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                          color: Colors.orange.shade300,
                                          shape: BoxShape.circle)),
                                  const SizedBox(width: 8),
                                  Text(item,
                                      style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade700)),
                                ]),
                              )),
                          Divider(color: Colors.grey.shade100, height: 16),
                          Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Total Paid',
                                    style: TextStyle(
                                        color: Colors.grey.shade500,
                                        fontSize: 13)),
                                Text(
                                    '${RegionService.instance.currentCountry.currencySymbol} 1,180',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15)),
                              ]),
                        ]),
                  ),
                  const SizedBox(height: 16),

                  // Cancel button (only available while restaurant_pending)
                  if (_currentStatusIndex == 0)
                    OutlinedButton.icon(
                      onPressed: _showCancelDialog,
                      icon: Icon(Icons.cancel_outlined,
                          color: Colors.red.shade400, size: 18),
                      label: Text('Cancel Order',
                          style: TextStyle(
                              color: Colors.red.shade400,
                              fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.red.shade200),
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),

                  // DEV: Status simulator (remove in production)
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(10)),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('⚙️ Simulate Status (Dev Only)',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: List.generate(
                                  _statuses.length,
                                  (i) => Padding(
                                        padding:
                                            const EdgeInsets.only(right: 6),
                                        child: GestureDetector(
                                          onTap: () => setState(
                                              () => _currentStatusIndex = i),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 10, vertical: 5),
                                            decoration: BoxDecoration(
                                              color: _currentStatusIndex == i
                                                  ? const Color(0xFF7C3AED)
                                                  : Colors.white,
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              border: Border.all(
                                                  color:
                                                      const Color(0xFF7C3AED)),
                                            ),
                                            child: Text('Step ${i + 1}',
                                                style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w700,
                                                    color:
                                                        _currentStatusIndex == i
                                                            ? Colors.white
                                                            : const Color(
                                                                0xFF7C3AED))),
                                          ),
                                        ),
                                      )),
                            ),
                          ),
                        ]),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionButton(IconData icon, String label, MaterialColor color) {
    return GestureDetector(
      onTap: () {
        final messages = {
          'Call': '📞 Connecting to restaurant…',
          'Help': '💬 Opening help center…',
          'Directions': '🗺️ Opening directions to restaurant…',
          'Share': '📤 Sharing your order details…',
        };
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(messages[label] ?? '$label activated'),
            backgroundColor: color.shade700,
            behavior: SnackBarBehavior.floating));
        if (label == 'Call') {
          Navigator.pushNamed(context, '/restaurant/chat',
              arguments: {'restaurantName': 'Restaurant'});
        } else if (label == 'Help') {
          Navigator.pushNamed(context, '/restaurant/help');
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
            color: color.shade50,
            border: Border.all(color: color.shade200),
            borderRadius: BorderRadius.circular(10)),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 16, color: color.shade700),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color.shade700)),
        ]),
      ),
    );
  }

  Widget _timelineRow(
      {required IconData icon,
      required String title,
      required String subtitle,
      String? time,
      required bool isDone,
      required bool isActive,
      required bool isFuture,
      required bool isLast}) {
    final color = isDone
        ? Colors.green
        : (isActive ? const Color(0xFF7C3AED) : Colors.grey.shade300);
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Column(children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
              color: isDone
                  ? Colors.green.shade50
                  : (isActive ? Colors.purple.shade50 : Colors.grey.shade100),
              border: Border.all(color: color, width: isActive ? 2 : 1),
              shape: BoxShape.circle),
          child: Icon(isDone ? Icons.check : icon, size: 16, color: color),
        ),
        if (!isLast)
          Container(
              width: 2,
              height: 40,
              color: isDone ? Colors.green.shade200 : Colors.grey.shade200,
              margin: const EdgeInsets.symmetric(vertical: 3)),
      ]),
      const SizedBox(width: 14),
      Expanded(
        child: Padding(
          padding: const EdgeInsets.only(top: 6),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Flexible(
                  child: Text(title,
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: isFuture
                              ? Colors.grey.shade400
                              : Colors.black87))),
              if (time != null)
                Text(time,
                    style:
                        TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              if (isActive)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                      color: Colors.purple.shade50,
                      borderRadius: BorderRadius.circular(6)),
                  child: Text('Active',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.purple.shade700)),
                ),
            ]),
            const SizedBox(height: 2),
            Text(subtitle,
                style: TextStyle(
                    fontSize: 12,
                    color: isFuture
                        ? Colors.grey.shade300
                        : Colors.grey.shade500)),
            if (!isLast) const SizedBox(height: 12),
          ]),
        ),
      ),
    ]);
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Order?',
            style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text(
            'Are you sure you want to cancel this takeaway order? This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('No, Keep Order')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                foregroundColor: Colors.white),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }
}
