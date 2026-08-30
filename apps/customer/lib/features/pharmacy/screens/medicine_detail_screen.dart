import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

/// Medicine Detail — Premium Redesign
class MedicineDetailScreen extends StatelessWidget {
  final String name;
  const MedicineDetailScreen({super.key, this.name = 'Dolo 650mg'});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 340,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            elevation: 0,
            scrolledUnderElevation: 1,
            centerTitle: true,
            title: const Text('Details',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Colors.black87)),
            leading: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: const Icon(Icons.arrow_back_ios_new,
                  color: Colors.black87, size: 20),
            ),
            actions: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                    color: Colors.grey.shade50, shape: BoxShape.circle),
                child: const Icon(Icons.share_rounded,
                    color: Colors.black87, size: 20),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                margin: const EdgeInsets.fromLTRB(20, 80, 20, 16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(24),
                ),
                clipBehavior: Clip.antiAlias,
                child: const KartseekImage(
                  url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop',
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(8)),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle_rounded,
                                size: 14, color: Colors.green),
                            SizedBox(width: 4),
                            Text('OTC',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.green)),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              color: Colors.amber, size: 18),
                          const SizedBox(width: 4),
                          const Text('4.8',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.black87)),
                          const SizedBox(width: 4),
                          Text('(128)',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(name,
                      style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.black87)),
                  const SizedBox(height: 6),
                  const Text('By Micro Labs Ltd',
                      style: TextStyle(
                          fontSize: 14,
                          color: Colors.black54,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 20),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${RegionService.instance.currentCountry.currencySymbol} 32',
                          style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              color: Colors.black87,
                              letterSpacing: -1)),
                      const SizedBox(width: 8),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('${RegionService.instance.currentCountry.currencySymbol} 35',
                            style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey.shade400,
                                decoration: TextDecoration.lineThrough,
                                fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 12),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(6)),
                          child: Text('9% OFF',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.red.shade600,
                                  letterSpacing: 0.5)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Strip of 15 tablets',
                      style: TextStyle(
                          fontSize: 14,
                          color: Colors.black54,
                          fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            Container(height: 8, color: const Color(0xFFF1F5F9)),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Key Information',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.black87)),
                  const SizedBox(height: 16),
                  _infoRow('Composition', 'Paracetamol 650mg'),
                  _infoRow('Uses', 'Fever, Headache, Body ache'),
                  _infoRow('Side Effects', 'Nausea, Skin rash (rare)'),
                  _infoRow('Dosage', '1 tablet every 4-6 hours'),
                  _infoRow('Storage', 'Below 25°C, dry place'),
                ],
              ),
            ),
            Container(height: 8, color: const Color(0xFFF1F5F9)),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Safety Advice',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.black87)),
                  const SizedBox(height: 16),
                  _safetyTile(
                      Icons.wine_bar_rounded, 'Alcohol', 'Unsafe', Colors.red),
                  _safetyTile(Icons.pregnant_woman_rounded, 'Pregnancy',
                      'Consult doctor', Colors.amber),
                  _safetyTile(
                      Icons.drive_eta_rounded, 'Driving', 'Safe', Colors.green),
                  _safetyTile(Icons.child_care_rounded, 'Children',
                      'Not recommended', Colors.red),
                ],
              ),
            ),
            Container(height: 8, color: const Color(0xFFF1F5F9)),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Similar Substitutes',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.black87)),
                  const SizedBox(height: 16),
                  _substitute('Crocin Advance 500mg', '${RegionService.instance.currentCountry.currencySymbol} 22'),
                  _substitute('Calpol 650mg', '${RegionService.instance.currentCountry.currencySymbol} 28'),
                  _substitute('Pacimol 650mg', '${RegionService.instance.currentCountry.currencySymbol} 18'),
                  const SizedBox(height: 60),
                ],
              ),
            ),
              ]
            ),
          ),
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
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: const Icon(Icons.favorite_border_rounded,
                  color: Colors.black54),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Medicine added to cart',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      behavior: SnackBarBehavior.floating,
                      backgroundColor: Colors.black87,
                    ));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: Text('Add to Cart • ${RegionService.instance.currentCountry.currencySymbol} 32',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.white)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 120,
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 14,
                      color: Colors.black54,
                      fontWeight: FontWeight.w500))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.black87))),
        ],
      ),
    );
  }

  static Widget _safetyTile(
      IconData icon, String label, String status, MaterialColor color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.shade50.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.shade100),
      ),
      child: Row(
        children: [
          Icon(icon, size: 24, color: color.shade700),
          const SizedBox(width: 16),
          Text(label,
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Colors.black87)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
                color: color.shade100, borderRadius: BorderRadius.circular(8)),
            child: Text(status,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: color.shade800)),
          ),
        ],
      ),
    );
  }

  static Widget _substitute(String name, String price) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFF1F5F9)),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.medication_liquid_rounded,
                size: 24, color: Colors.black26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Colors.black87)),
                const SizedBox(height: 4),
                Text(price,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.pharmacyColor)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text('Add',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.pharmacyColor)),
          ),
        ],
      ),
    );
  }
}
