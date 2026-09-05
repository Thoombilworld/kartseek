import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
/// Support chat — FAQ + contact support.
class PharmacySellerSupportScreen extends StatelessWidget {
  const PharmacySellerSupportScreen({super.key});
  @override Widget build(BuildContext context) {
    final faqs = ['How do I accept prescription orders?', 'When do payouts arrive?', 'How to update stock levels?', 'How to add a new product?', 'How do delivery zones work?'];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Support', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(gradient: LinearGradient(colors: [AppTheme.pharmacyColor, AppTheme.pharmacyColor.withValues(alpha: 0.7)]), borderRadius: BorderRadius.circular(16)),
          child: Column(children: [const Icon(Icons.headset_mic, color: Colors.white, size: 40), const SizedBox(height: 12), const Text('Need Help?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 8), Text('Our support team is available 24/7', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.8))),
            const SizedBox(height: 16), SizedBox(width: double.infinity, height: 44, child: ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.pharmacyColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: const Text('Start Chat', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700))))])),
        const SizedBox(height: 20),
        const Text('Frequently Asked Questions', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...faqs.map((q) => Container(margin: const EdgeInsets.only(bottom: 8), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
          child: ExpansionTile(title: Text(q, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)), children: [Padding(padding: const EdgeInsets.all(16), child: Text('Detailed answer will be provided here.', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)))]))),
      ]),
    );
  }
}
