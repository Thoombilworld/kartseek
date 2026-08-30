import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Pharmacy Order Tracking — Premium Redesign inspired by Snoonu/Noon/Rafeeq
class PharmacyOrderTrackingScreen extends StatelessWidget {
  final String orderId;
  const PharmacyOrderTrackingScreen({super.key, this.orderId = 'PH-2026-1234'});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        surfaceTintColor: Colors.white,
        centerTitle: true,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: const Icon(Icons.arrow_back_ios_new, color: Colors.black87, size: 20),
        ),
        title: Text('Order $orderId', style: const TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          // Status banner
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [AppTheme.pharmacyColor, AppTheme.pharmacyColor.withValues(alpha: 0.8)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: AppTheme.pharmacyColor.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 8))],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                  child: const Icon(Icons.inventory_2_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Order Confirmed', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                      SizedBox(height: 4),
                      Text('Your medicines are being prepared', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Timeline
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Track Order', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.black87, letterSpacing: -0.3)),
                const SizedBox(height: 20),
                _step('Order Placed', 'Jun 3, 2026 • 2:30 PM', true, true),
                _step('Prescription Verified', 'Pharmacist approved', true, true),
                _step('Preparing Order', 'Packing medicines', true, false),
                _step('Out for Delivery', 'Estimated 25 min', false, false),
                _step('Delivered', '', false, false, isLast: true),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Items
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Order Items', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.black87, letterSpacing: -0.3)),
                const SizedBox(height: 16),
                _item('Paracetamol 500mg', 'Dolo • x2', '${RegionService.instance.currentCountry.currencySymbol} 50'),
                _item('Cetirizine 10mg', 'Zyrtec • x1', '${RegionService.instance.currentCountry.currencySymbol} 45'),
                _item('Vitamin C 1000mg', 'Celin • x1', '${RegionService.instance.currentCountry.currencySymbol} 65', isLast: true),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _step(String title, String sub, bool done, bool active, {bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 24, height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done ? AppTheme.pharmacyColor : const Color(0xFFF1F5F9),
                border: done ? null : Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: done ? const Icon(Icons.check_rounded, size: 14, color: Colors.white) : null,
            ),
            if (!isLast) Container(width: 2, height: 40, color: done ? AppTheme.pharmacyColor : const Color(0xFFF1F5F9)),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: done ? Colors.black87 : Colors.black45)),
              if (sub.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(sub, style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500)),
              ],
              const SizedBox(height: 16),
            ],
          ),
        ),
      ],
    );
  }

  Widget _item(String name, String sub, String price, {bool isLast = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.medication_liquid_rounded, color: Colors.black26, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.black87)),
                const SizedBox(height: 4),
                Text(sub, style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          Text(price, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Colors.black87)),
        ],
      ),
    );
  }
}
