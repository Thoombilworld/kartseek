import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';

import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Refer & Earn Screen — Referral program with reward tracking.
class GroceryReferEarnScreen extends StatelessWidget {
  const GroceryReferEarnScreen({super.key});
  static const _groceryColor = AppTheme.groceryColor;
  static const _referralCode = 'KARTSEEK2847';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200, pinned: true,
            backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent,
            leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)])),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('🎁 Refer & Earn', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text('Invite friends & get ${RegionService.instance.currentCountry.currencySymbol} 100 each!', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                    ]),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                // Referral code card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: _groceryColor.withValues(alpha: 0.3)), boxShadow: [BoxShadow(color: _groceryColor.withValues(alpha: 0.08), blurRadius: 12)]),
                  child: Column(children: [
                    const Text('Your Referral Code', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey)),
                    const SizedBox(height: 8),
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(10), border: Border.all(color: _groceryColor.withValues(alpha: 0.2), style: BorderStyle.solid)),
                        child: const Text(_referralCode, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _groceryColor, fontFamily: 'monospace', letterSpacing: 2)),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () { Clipboard.setData(const ClipboardData(text: _referralCode)); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Code copied!'))); },
                        child: Container(width: 40, height: 40, decoration: BoxDecoration(color: _groceryColor, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.copy, color: Colors.white, size: 18)),
                      ),
                    ]),
                    const SizedBox(height: 16),
                    SizedBox(width: double.infinity, height: 48, child: ElevatedButton.icon(
                      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Share link copied to clipboard'))),
                      icon: const Icon(Icons.share, size: 18),
                      label: const Text('Share with Friends', style: TextStyle(fontWeight: FontWeight.w800)),
                      style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
                    )),
                  ]),
                ),
                const SizedBox(height: 20),

                // How it works
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('How it works', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 12),
                    _step('1️⃣', 'Share your code with friends'),
                    _step('2️⃣', 'Friend places their first order'),
                    _step('3️⃣', 'You both get ${RegionService.instance.currentCountry.currencySymbol} 100 in your wallet!'),
                  ]),
                ),
                const SizedBox(height: 16),

                // Stats
                Row(children: [
                  _statCard('3', 'Friends\nJoined', Colors.green),
                  const SizedBox(width: 10),
                  _statCard('${RegionService.instance.currentCountry.currencySymbol} 300', 'Rewards\nEarned', Colors.orange),
                  const SizedBox(width: 10),
                  _statCard('2', 'Pending\nInvites', Colors.blue),
                ]),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _step(String num, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        Text(num, style: const TextStyle(fontSize: 18)),
        const SizedBox(width: 10),
        Text(text, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
      ]),
    );
  }

  Widget _statCard(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
        child: Column(children: [
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 4),
          Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
