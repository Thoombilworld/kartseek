import 'package:flutter/material.dart';
/// Rx handling guidelines for delivery partners.
class PharmacyRxGuidelinesScreen extends StatelessWidget {
  const PharmacyRxGuidelinesScreen({super.key});
  @override Widget build(BuildContext context) {
    final guidelines = [
      {'title': 'Identity Verification', 'body': 'Always verify the recipient\'s identity matches the prescription name before handing over Rx medicines.', 'icon': Icons.badge, 'color': Colors.blue},
      {'title': 'Sealed Packages', 'body': 'Never open or tamper with pharmacy-sealed packages. If the seal is broken, return to pharmacy.', 'icon': Icons.verified_user, 'color': Colors.green},
      {'title': 'Temperature Control', 'body': 'Medicines marked with ❄️ require cold chain. Keep in insulated bag and deliver within 30 min.', 'icon': Icons.ac_unit, 'color': Colors.cyan},
      {'title': 'Age Verification', 'body': 'Some medicines require age 18+ verification. Check ID if the customer appears under 25.', 'icon': Icons.person_pin, 'color': Colors.orange},
      {'title': 'Controlled Substances', 'body': 'Schedule H drugs require OTP + photo ID. Do not deliver if OTP does not match.', 'icon': Icons.security, 'color': Colors.red},
      {'title': 'Return Policy', 'body': 'If customer rejects delivery, return to pharmacy immediately. Do not leave unattended.', 'icon': Icons.replay, 'color': Colors.purple},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Rx Handling Guide', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: guidelines.length, separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) { final g = guidelines[i];
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: (g['color'] as Color).withValues(alpha: 0.12), shape: BoxShape.circle), child: Icon(g['icon'] as IconData, color: g['color'] as Color, size: 20)),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(g['title'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), const SizedBox(height: 4),
                Text(g['body'] as String, style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4))])),
            ]),
          );
        }),
    );
  }
}
