import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Restaurant — Refer & Earn Screen.
class RestaurantReferEarnScreen extends StatelessWidget {
  const RestaurantReferEarnScreen({super.key});
  static const _brandColor = Color(0xFFEA580C);
  static const _referralCode = 'FOODIE2847';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(slivers: [
        SliverAppBar(
          expandedHeight: 200, pinned: true,
          backgroundColor: _brandColor, surfaceTintColor: Colors.transparent,
          leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFFEA580C), Color(0xFFF97316)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
              child: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                SizedBox(height: 40),
                Icon(Icons.card_giftcard, color: Colors.white, size: 48),
                SizedBox(height: 8),
                Text('Refer & Earn', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                SizedBox(height: 4),
                Text('Share food joy with friends!', style: TextStyle(color: Colors.white70, fontSize: 13)),
              ])),
            ),
          ),
        ),
        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
              child: Column(children: [
                const Text('Your Referral Code', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey)),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(10), border: Border.all(color: _brandColor.withValues(alpha: 0.2))),
                    child: const Text(_referralCode, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _brandColor, fontFamily: 'monospace', letterSpacing: 2)),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () { Clipboard.setData(const ClipboardData(text: _referralCode)); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('📋 Referral code copied!'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)); },
                    child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.copy, color: _brandColor, size: 20)),
                  ),
                ]),
                const SizedBox(height: 16),
                SizedBox(width: double.infinity, height: 48, child: ElevatedButton.icon(
                  onPressed: () { Clipboard.setData(const ClipboardData(text: 'https://kartseek.com/refer/$_referralCode')); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('🚀 Referral link copied! Share with friends to earn rewards'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)); },
                  icon: const Icon(Icons.share, size: 18),
                  label: const Text('Share with Friends', style: TextStyle(fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
                )),
              ]),
            ),
            const SizedBox(height: 16),
            // How it works
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('How it works', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                _step('1', 'Share your code with friends'),
                _step('2', 'Friend orders their first meal'),
                _step('3', 'You both get 50% off (up to KES 200)'),
              ]),
            ),
            const SizedBox(height: 16),
            // Stats
            Row(children: [
              _statCard('12', 'Friends\nReferred', _brandColor),
              const SizedBox(width: 10),
              _statCard('8', 'Successful\nOrders', Colors.green),
              const SizedBox(width: 10),
              _statCard('KES\n1,600', 'Total\nEarned', Colors.blue),
            ]),
          ]),
        )),
      ]),
    );
  }

  Widget _step(String num, String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      CircleAvatar(radius: 14, backgroundColor: _brandColor.withValues(alpha: 0.1), child: Text(num, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: _brandColor))),
      const SizedBox(width: 10),
      Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    ]),
  );

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
