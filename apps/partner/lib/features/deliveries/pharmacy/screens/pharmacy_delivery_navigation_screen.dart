import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
/// Navigate to customer — map + directions.
class PharmacyDeliveryNavigationScreen extends StatelessWidget {
  const PharmacyDeliveryNavigationScreen({super.key});
  @override Widget build(BuildContext context) => Scaffold(body: Stack(children: [
    Container(color: Colors.grey.shade200, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.map, size: 64, color: Colors.grey.shade400), Text('Navigation to Customer', style: TextStyle(fontSize: 14, color: Colors.grey.shade500))]))),
    Positioned(top: 0, left: 0, right: 0, child: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
      GestureDetector(onTap: () => Navigator.pop(context), child: Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]), child: const Icon(Icons.arrow_back, size: 20))),
      const Spacer(),
      Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
        child: const Text('1.8 km • 6 min', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.pharmacyColor))),
    ])))),
    Positioned(bottom: 0, left: 0, right: 0, child: Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.white, borderRadius: const BorderRadius.vertical(top: Radius.circular(20)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 12)]),
      child: SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(children: [Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle), child: const Icon(Icons.person, color: Colors.green, size: 22)), const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('John Doe', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)), Text('456 Garden Estate, Roysambu', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))]))]),
        const SizedBox(height: 16),
        Row(children: [Expanded(child: SizedBox(height: 48, child: ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.phone, size: 18), label: const Text('Call'),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))))),
          const SizedBox(width: 12),
          Expanded(child: SizedBox(height: 48, child: ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.check, size: 18), label: const Text('Arrived'),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))))]),
      ])))),
  ]));
}
