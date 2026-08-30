import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Dine-In Management — Floor plan & live table status.
class RestaurantDineInManagementScreen extends StatefulWidget {
  const RestaurantDineInManagementScreen({super.key});
  @override
  State<RestaurantDineInManagementScreen> createState() => _State();
}

class _State extends State<RestaurantDineInManagementScreen> {
  final _tables = [
    {'number': 1, 'seats': 2, 'status': 'available', 'guest': ''},
    {'number': 2, 'seats': 4, 'status': 'occupied', 'guest': 'Sarah K.'},
    {'number': 3, 'seats': 4, 'status': 'occupied', 'guest': 'John M.'},
    {'number': 4, 'seats': 6, 'status': 'reserved', 'guest': 'Priya S. — 7:30 PM'},
    {'number': 5, 'seats': 2, 'status': 'available', 'guest': ''},
    {'number': 6, 'seats': 8, 'status': 'occupied', 'guest': 'David L.'},
    {'number': 7, 'seats': 4, 'status': 'cleaning', 'guest': ''},
    {'number': 8, 'seats': 2, 'status': 'available', 'guest': ''},
    {'number': 9, 'seats': 6, 'status': 'reserved', 'guest': 'Alice W. — 8:00 PM'},
    {'number': 10, 'seats': 4, 'status': 'available', 'guest': ''},
  ];

  Color _statusColor(String s) => s == 'available' ? Colors.green : s == 'occupied' ? Colors.red : s == 'reserved' ? Colors.blue : Colors.orange;
  IconData _statusIcon(String s) => s == 'available' ? Icons.check_circle_outline : s == 'occupied' ? Icons.person : s == 'reserved' ? Icons.event_seat : Icons.cleaning_services;

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final avail = _tables.where((t) => t['status'] == 'available').length;
    final occ = _tables.where((t) => t['status'] == 'occupied').length;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Dine-In Management', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Summary
        Row(children: [
          _summaryChip('$avail Available', Colors.green),
          const SizedBox(width: 8),
          _summaryChip('$occ Occupied', Colors.red),
          const SizedBox(width: 8),
          _summaryChip('${_tables.where((t) => t['status'] == 'reserved').length} Reserved', Colors.blue),
        ]),
        const SizedBox(height: 16),
        // Table grid
        GridView.builder(
          shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 1.5, crossAxisSpacing: 10, mainAxisSpacing: 10),
          itemCount: _tables.length,
          itemBuilder: (_, i) {
            final t = _tables[i];
            final status = t['status'] as String;
            final sc = _statusColor(status);
            return GestureDetector(
              onTap: () => _showTableActions(t),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: sc.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(14), border: Border.all(color: sc.withValues(alpha: 0.3))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Row(children: [
                    Text('T${t['number']}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: sc)),
                    const Spacer(),
                    Icon(_statusIcon(status), color: sc, size: 18),
                  ]),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${t['seats']} seats', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    if ((t['guest'] as String).isNotEmpty) Text(t['guest'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: sc), overflow: TextOverflow.ellipsis),
                    Text(status.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: sc, letterSpacing: 0.5)),
                  ]),
                ]),
              ),
            );
          },
        ),
      ]),
    );
  }

  Widget _summaryChip(String label, Color col) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(color: col.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
    child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: col)),
  );

  void _showTableActions(Map<String, Object> t) {
    showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Table ${t['number']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          Text('${t['seats']} seats • ${(t['status'] as String).toUpperCase()}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          const SizedBox(height: 16),
          if (t['status'] == 'available') ...[
            _actionBtn('Seat Guests', Icons.person_add, Colors.green, () => Navigator.pop(ctx)),
            _actionBtn('Mark Reserved', Icons.event_seat, Colors.blue, () => Navigator.pop(ctx)),
          ],
          if (t['status'] == 'occupied') ...[
            _actionBtn('View Order', Icons.receipt, SellerTheme.restaurant, () => Navigator.pop(ctx)),
            _actionBtn('Generate Bill', Icons.receipt_long, Colors.blue, () => Navigator.pop(ctx)),
            _actionBtn('Clear Table', Icons.cleaning_services, Colors.orange, () => Navigator.pop(ctx)),
          ],
          if (t['status'] == 'reserved') _actionBtn('Seat Guest', Icons.person_add, Colors.green, () => Navigator.pop(ctx)),
          if (t['status'] == 'cleaning') _actionBtn('Mark Available', Icons.check_circle, Colors.green, () => Navigator.pop(ctx)),
        ]),
      ),
    );
  }

  Widget _actionBtn(String label, IconData icon, Color col, VoidCallback onTap) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: SizedBox(width: double.infinity, height: 44, child: OutlinedButton.icon(
      onPressed: onTap, icon: Icon(icon, color: col, size: 18),
      label: Text(label, style: TextStyle(color: col, fontWeight: FontWeight.w700)),
      style: OutlinedButton.styleFrom(side: BorderSide(color: col.withValues(alpha: 0.3)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
    )),
  );
}
