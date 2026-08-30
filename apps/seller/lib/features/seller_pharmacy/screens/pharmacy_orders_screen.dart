import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Seller pharmacy — Order list with tabs for Pending/Active/Completed.
class PharmacyOrdersScreen extends StatefulWidget {
  const PharmacyOrdersScreen({super.key});
  @override State<PharmacyOrdersScreen> createState() => _PharmacyOrdersScreenState();
}

class _PharmacyOrdersScreenState extends State<PharmacyOrdersScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  @override void initState() { super.initState(); _tab = TabController(length: 4, vsync: this); }
  @override void dispose() { _tab.dispose(); super.dispose(); }

  final _orders = [
    {'id': 'PH-001', 'customer': 'John Doe', 'items': 3, 'total': 450, 'status': 'PENDING', 'time': '5 min ago', 'rx': true},
    {'id': 'PH-002', 'customer': 'Sarah K.', 'items': 1, 'total': 120, 'status': 'CONFIRMED', 'time': '12 min ago', 'rx': false},
    {'id': 'PH-003', 'customer': 'Amit G.', 'items': 5, 'total': 890, 'status': 'PREPARING', 'time': '20 min ago', 'rx': true},
    {'id': 'PH-004', 'customer': 'Priya S.', 'items': 2, 'total': 210, 'status': 'READY', 'time': '35 min ago', 'rx': false},
    {'id': 'PH-005', 'customer': 'Mike R.', 'items': 4, 'total': 1450, 'status': 'DELIVERED', 'time': '1 hr ago', 'rx': true},
    {'id': 'PH-006', 'customer': 'Jane M.', 'items': 1, 'total': 85, 'status': 'CANCELLED', 'time': '2 hr ago', 'rx': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        title: const Text('Pharmacy Orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black87)),
        bottom: TabBar(
          controller: _tab, labelColor: AppTheme.pharmacyColor, unselectedLabelColor: Colors.grey.shade500,
          indicatorColor: AppTheme.pharmacyColor, labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          tabs: [
            Tab(child: Row(mainAxisSize: MainAxisSize.min, children: [const Text('New'), const SizedBox(width: 4), _badge(1)])),
            const Tab(text: 'Active'),
            const Tab(text: 'Completed'),
            const Tab(text: 'Cancelled'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _orderList(_orders.where((o) => o['status'] == 'PENDING').toList()),
          _orderList(_orders.where((o) => ['CONFIRMED', 'PREPARING', 'READY'].contains(o['status'])).toList()),
          _orderList(_orders.where((o) => o['status'] == 'DELIVERED').toList()),
          _orderList(_orders.where((o) => o['status'] == 'CANCELLED').toList()),
        ],
      ),
    );
  }

  Widget _badge(int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(10)),
      child: Text('$count', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
    );
  }

  Widget _orderList(List<Map<String, dynamic>> orders) {
    if (orders.isEmpty) return Center(child: Text('No orders', style: TextStyle(color: Colors.grey.shade400)));
    return ListView.separated(
      padding: const EdgeInsets.all(16), itemCount: orders.length, separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final o = orders[i];
        final statusColors = {'PENDING': Colors.amber, 'CONFIRMED': Colors.blue, 'PREPARING': Colors.purple, 'READY': Colors.teal, 'DELIVERED': Colors.green, 'CANCELLED': Colors.red};
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text('#${o['id']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: (statusColors[o['status']] ?? Colors.grey).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                  child: Text('${o['status']}'.replaceAll('_', ' '), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: statusColors[o['status']] ?? Colors.grey)),
                ),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Icon(Icons.person_outline, size: 14, color: Colors.grey.shade400),
                const SizedBox(width: 4),
                Text('${o['customer']}', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                const Spacer(),
                Text('${o['items']} items • KES ${o['total']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 6),
              Row(children: [
                Text('${o['time']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                if (o['rx'] == true) ...[const SizedBox(width: 8), Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(4)),
                  child: Text('Rx', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.red.shade700)),
                )],
                const Spacer(),
                if (o['status'] == 'PENDING') ...[
                  SizedBox(height: 32, child: ElevatedButton(
                    onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(horizontal: 16)),
                    child: const Text('Accept', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  )),
                  const SizedBox(width: 8),
                  SizedBox(height: 32, child: OutlinedButton(
                    onPressed: () {}, style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(horizontal: 12)),
                    child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  )),
                ],
              ]),
            ],
          ),
        );
      },
    );
  }
}
