import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

class CouponsOffersScreen extends StatelessWidget {
  const CouponsOffersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Coupons & Offers'),
          bottom: const TabBar(
            indicatorColor: AppTheme.primaryGreen,
            labelColor: AppTheme.primaryGreen,
            unselectedLabelColor: AppTheme.textMuted,
            tabs: [Tab(text: 'Available'), Tab(text: 'Used / Expired')],
          ),
        ),
        body: TabBarView(
          children: [
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildCouponCard('WELCOME50', '50% off on your first order', 'Marketplace', 'Valid till Dec 2026', true),
                _buildCouponCard('FOODIE20', '20% off above ${RegionService.instance.currentCountry.currencySymbol} 500', 'Restaurant', 'Valid till Jun 2026', true),
              ],
            ),
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildCouponCard('NEW_YEAR26', 'Flat ${RegionService.instance.currentCountry.currencySymbol} 200 off', 'Grocery', 'Expired Jan 2026', false),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCouponCard(String code, String desc, String module, String validity, bool isActive) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: isActive ? Colors.white : Colors.grey.shade100,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: AppTheme.primaryGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(code, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryGreen, letterSpacing: 1.2)),
                ),
                Text(module, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 12),
            Text(desc, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: isActive ? AppTheme.textPrimary : AppTheme.textMuted)),
            const SizedBox(height: 8),
            Text(validity, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
