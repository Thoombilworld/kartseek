import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Pharmacy Cart — Premium Redesign inspired by Snoonu/Noon/Rafeeq
class PharmacyCartScreen extends StatelessWidget {
  const PharmacyCartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

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
          child: const Icon(Icons.arrow_back_ios_new,
              color: Colors.black87, size: 20),
        ),
        title: const Text('Cart',
            style: TextStyle(
                color: Colors.black87,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3)),
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          _cartItem('Paracetamol 500mg', 'Dolo • Strip of 15', '${RegionService.instance.currentCountry.currencySymbol} 25', 2, false),
          _cartItem('Cetirizine 10mg', 'Zyrtec • Strip of 10', '${RegionService.instance.currentCountry.currencySymbol} 45', 1, false),
          _cartItem('Vitamin C 1000mg', 'Celin • Tube of 10', '${RegionService.instance.currentCountry.currencySymbol} 65', 1, false),
          const SizedBox(height: 16),
          // Suggested add-ons could go here
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 20,
                offset: const Offset(0, -5))
          ],
        ),
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Total (3 items)',
                    style: TextStyle(
                        fontSize: 12,
                        color: Colors.black54,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text('${RegionService.instance.currentCountry.currencySymbol} 160',
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.black87,
                        letterSpacing: -0.5)),
              ],
            ),
            const SizedBox(width: 24),
            Expanded(
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: () =>
                      Navigator.pushNamed(context, '/pharmacy/checkout'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: const Text('Checkout',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _cartItem(
      String name, String sub, String price, int qty, bool needsRx) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.medication_liquid_rounded,
                color: Colors.black26, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                        child: Text(name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: Colors.black87,
                                letterSpacing: -0.3))),
                    if (needsRx) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(6)),
                        child: Text('Rx',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Colors.red.shade700)),
                      )
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(sub,
                    style: const TextStyle(
                        fontSize: 12,
                        color: Colors.black54,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                Text(price,
                    style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: AppTheme.pharmacyColor)),
              ],
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                InkWell(
                  onTap: () {},
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(12)),
                  child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.add_rounded,
                          size: 18, color: Colors.black87)),
                ),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                  child: Text('$qty',
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 14)),
                ),
                InkWell(
                  onTap: () {},
                  borderRadius:
                      const BorderRadius.vertical(bottom: Radius.circular(12)),
                  child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.remove_rounded,
                          size: 18, color: Colors.black54)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
