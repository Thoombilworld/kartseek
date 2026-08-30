import 'package:flutter/material.dart';
/// Seller earnings dashboard — daily, weekly, monthly revenue.
class PharmacyEarningsScreen extends StatelessWidget {
  const PharmacyEarningsScreen({super.key});
  @override Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Earnings', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _statCard('Today', 'KES 12,450', '+18%', Colors.green), const SizedBox(height: 10),
        _statCard('This Week', 'KES 78,200', '+12%', Colors.blue), const SizedBox(height: 10),
        _statCard('This Month', 'KES 345,600', '+8%', Colors.purple), const SizedBox(height: 20),
        const Text('Recent Transactions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...[{'order': 'PH-001', 'amount': 450, 'time': '10 min ago'}, {'order': 'PH-002', 'amount': 120, 'time': '25 min ago'}, {'order': 'PH-003', 'amount': 890, 'time': '1 hr ago'}].map((t) =>
          Padding(padding: const EdgeInsets.only(bottom: 8), child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [Text('#${t['order']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)), const Spacer(), Text('KES ${t['amount']}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.green.shade700)), const SizedBox(width: 10), Text('${t['time']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400))])))),
      ]),
    );
  }
  Widget _statCard(String period, String amount, String change, Color color) => Container(padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.7)]), borderRadius: BorderRadius.circular(16)),
    child: Row(children: [Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(period, style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.8))), const SizedBox(height: 4), Text(amount, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white))]), const Spacer(),
      Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
        child: Text(change, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)))]));
}
