import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

class ReferEarnScreen extends StatelessWidget {
  const ReferEarnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Refer & Earn')),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                const Icon(Icons.card_giftcard, size: 80, color: AppTheme.primaryGreen),
                const SizedBox(height: 24),
                Text('Invite Friends & Earn ${RegionService.instance.currentCountry.currencySymbol} 200', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Share your code. When a friend signs up and makes their first order, you both get ${RegionService.instance.currentCountry.currencySymbol} 200 in your wallet.', textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textSecondary, height: 1.5)),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('KARTSEEK2026', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2)),
                      const SizedBox(width: 16),
                      IconButton(icon: const Icon(Icons.copy, color: AppTheme.primaryGreen), onPressed: () {}),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.share, color: Colors.white),
                    label: const Text('Share Code', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryGreen),
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.all(16),
            child: Align(alignment: Alignment.centerLeft, child: Text('Referral History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildReferralTxn('Jane Doe joined', 'May 10, 2026', '+${RegionService.instance.currentCountry.currencySymbol} 200.00'),
                _buildReferralTxn('Mark Smith joined', 'Apr 25, 2026', '+${RegionService.instance.currentCountry.currencySymbol} 200.00'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralTxn(String title, String date, String amount) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const CircleAvatar(
        backgroundColor: Color(0xFFF0FDF4),
        child: Icon(Icons.person_add, color: AppTheme.primaryGreen),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(date, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
      trailing: Text(amount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.green)),
    );
  }
}
