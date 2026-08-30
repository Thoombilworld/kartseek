import 'package:flutter/material.dart';
/// Payout history — settlement records.
class PharmacyPayoutsScreen extends StatelessWidget {
  const PharmacyPayoutsScreen({super.key});
  @override Widget build(BuildContext context) {
    final payouts = [
      {'date': 'Jul 01, 2026', 'amount': 'KES 45,200', 'status': 'COMPLETED', 'method': 'M-Pesa'},
      {'date': 'Jun 24, 2026', 'amount': 'KES 38,900', 'status': 'COMPLETED', 'method': 'Bank'},
      {'date': 'Jun 17, 2026', 'amount': 'KES 52,100', 'status': 'COMPLETED', 'method': 'M-Pesa'},
      {'date': 'Jun 10, 2026', 'amount': 'KES 12,300', 'status': 'PENDING', 'method': 'Bank'},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Payout History', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: payouts.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) { final p = payouts[i]; final done = p['status'] == 'COMPLETED';
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Container(width: 44, height: 44, decoration: BoxDecoration(color: done ? Colors.green.shade50 : Colors.amber.shade50, shape: BoxShape.circle), child: Icon(done ? Icons.check_circle : Icons.hourglass_top, color: done ? Colors.green : Colors.amber, size: 22)),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p['amount']!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)), Text('${p['date']} • ${p['method']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))])),
              Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: (done ? Colors.green : Colors.amber).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                child: Text(p['status']!, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: done ? Colors.green : Colors.amber.shade700))),
            ]),
          );
        }),
    );
  }
}
