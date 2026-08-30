import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Returns / Refund Handling Screen.
class RestaurantReturnsScreen extends StatelessWidget {
  const RestaurantReturnsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final returns = [
      {'id': 'RET-221', 'orderId': 'ORD-7698', 'reason': 'Wrong items delivered', 'amount': 'KES 480', 'status': 'Pending', 'date': 'Jul 3, 2026'},
      {'id': 'RET-220', 'orderId': 'ORD-7685', 'reason': 'Food quality issue', 'amount': 'KES 320', 'status': 'Approved', 'date': 'Jul 2, 2026'},
      {'id': 'RET-219', 'orderId': 'ORD-7672', 'reason': 'Missing items', 'amount': 'KES 150', 'status': 'Refunded', 'date': 'Jul 1, 2026'},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Returns & Refunds', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16), itemCount: returns.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final r = returns[i];
          final isPending = r['status'] == 'Pending';
          final statusColor = isPending ? Colors.orange : r['status'] == 'Approved' ? Colors.blue : Colors.green;
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(r['id'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
                const SizedBox(width: 8),
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(r['status'] as String, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: statusColor))),
                const Spacer(),
                Text(r['amount'] as String, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: c)),
              ]),
              const SizedBox(height: 8),
              Text(r['reason'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text('Order: ${r['orderId']} • ${r['date']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              if (isPending) ...[
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: SizedBox(height: 36, child: OutlinedButton(
                    onPressed: () {}, style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    child: const Text('Reject', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w700)),
                  ))),
                  const SizedBox(width: 10),
                  Expanded(flex: 2, child: SizedBox(height: 36, child: ElevatedButton(
                    onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
                    child: const Text('Approve Refund', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ))),
                ]),
              ],
            ]),
          );
        },
      ),
    );
  }
}
