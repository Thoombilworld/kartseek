import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
/// Navigate to pharmacy — map + directions.
class PharmacyPickupNavigationScreen extends StatelessWidget {
  const PharmacyPickupNavigationScreen({super.key});
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.grey.shade50,
    body: Stack(children: [
      Container(color: Colors.grey.shade200, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.map, size: 64, color: Colors.grey.shade400), const SizedBox(height: 8), Text('Map Navigation', style: TextStyle(fontSize: 14, color: Colors.grey.shade500))]))),
      Positioned(top: 0, left: 0, right: 0, child: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        GestureDetector(onTap: () => Navigator.pop(context), child: Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]), child: const Icon(Icons.arrow_back, size: 20))),
        const Spacer(),
        Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
          child: const Text('2.3 km • 8 min', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.pharmacyColor))),
      ])))),
      Positioned(bottom: 0, left: 0, right: 0, child: Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.white, borderRadius: const BorderRadius.vertical(top: Radius.circular(20)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 12)]),
        child: SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.blue.shade50, shape: BoxShape.circle), child: const Icon(Icons.store, color: Colors.blue, size: 22)), const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('HealthPlus Pharmacy', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)), Text('123 Main Ave, Westlands', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))]))]),
          const SizedBox(height: 16),
          Row(children: [Expanded(child: SizedBox(height: 48, child: ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.phone, size: 18), label: const Text('Call'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))))),
            const SizedBox(width: 12),
            Expanded(child: SizedBox(height: 48, child: ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.check, size: 18), label: const Text('Arrived'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))))]),
        ])))),
    ]),
  );
}
