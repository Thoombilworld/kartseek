import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:intl/intl.dart';

/// Performance — Seller health score, key metrics, and improvement tips.
class MarketplacePerformanceScreen extends StatefulWidget {
  const MarketplacePerformanceScreen({super.key});

  @override
  State<MarketplacePerformanceScreen> createState() => _MarketplacePerformanceScreenState();
}

class _MarketplacePerformanceScreenState extends State<MarketplacePerformanceScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _selectedPeriod = 'Last 30 Days';

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    // ignore: unused_local_variable
    final fmt = NumberFormat.currency(symbol: '$currency ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Performance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.calendar_today, size: 20),
            onSelected: (v) => setState(() => _selectedPeriod = v),
            itemBuilder: (_) => ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year']
                .map((p) => PopupMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 13))))
                .toList(),
          ),
        ],
      ),
      body: ListView(
        children: [
          const OfflineBanner(),
          const SizedBox(height: 16),
          // ── Overall Health Score ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF6C3FC8), Color(0xFF9B59F5)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shield, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Text(_selectedPeriod, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Score Circle
                  Container(
                    width: 110,
                    height: 110,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 4),
                      color: Colors.white.withValues(alpha: 0.15),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('92', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                        Text('/ 100', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text('Excellent Seller', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('⭐ Gold Badge — Top 5% Seller', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          // ── Key Metrics ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _sectionTitle('Key Metrics'),
          ),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Row(
                  children: [
                    _metricCard('Order\nFulfillment', '98.2%', Icons.check_circle, SellerTheme.successGreen, '↑ 1.4%', true),
                    const SizedBox(width: 10),
                    _metricCard('On-Time\nDelivery', '96.1%', Icons.local_shipping, SellerTheme.infoBlue, '↑ 0.8%', true),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _metricCard('Return\nRate', '2.1%', Icons.undo, SellerTheme.warningAmber, '↓ 0.5%', true),
                    const SizedBox(width: 10),
                    _metricCard('Customer\nRating', '4.6 ★', Icons.star, const Color(0xFFF59E0B), '↑ 0.1', true),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _metricCard('Response\nTime', '1.2h', Icons.schedule, _mp, '↓ 0.3h', true),
                    const SizedBox(width: 10),
                    _metricCard('Cancellation\nRate', '0.8%', Icons.cancel, SellerTheme.errorRed, '↓ 0.2%', true),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // ── Performance Breakdown ────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _sectionTitle('Performance Breakdown'),
          ),
          const SizedBox(height: 10),
          _performanceBar('Listing Quality', 95, SellerTheme.successGreen),
          _performanceBar('Shipping Performance', 92, SellerTheme.infoBlue),
          _performanceBar('Customer Service', 88, _mp),
          _performanceBar('Policy Compliance', 96, SellerTheme.successGreen),
          _performanceBar('Inventory Management', 84, SellerTheme.warningAmber),
          const SizedBox(height: 20),
          // ── Improvement Tips ─────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _sectionTitle('Improvement Tips'),
          ),
          const SizedBox(height: 10),
          _tipCard(Icons.inventory_2, 'Improve Inventory Score', 'Update stock for 3 products with low inventory warnings to avoid unfulfilled orders.', SellerTheme.warningAmber),
          _tipCard(Icons.image, 'Add More Product Images', '12 products have fewer than 3 images. Products with 5+ images convert 40% better.', SellerTheme.infoBlue),
          _tipCard(Icons.rate_review, 'Reply to Pending Reviews', 'You have 5 unanswered customer reviews. Responding improves your service score.', _mp),
          const SizedBox(height: 20),
          // ── Achievements ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _sectionTitle('Achievements'),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 95,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _achievementBadge('🏆', 'Top Seller', 'Jun 2026'),
                _achievementBadge('⚡', 'Fast Shipper', 'May 2026'),
                _achievementBadge('💬', 'Quick Responder', 'May 2026'),
                _achievementBadge('🌟', '500+ Orders', 'Apr 2026'),
                _achievementBadge('🎯', 'Zero Returns', 'Mar 2026'),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SellerTheme.textPrimary));
  }

  Widget _metricCard(String label, String value, IconData icon, Color color, String trend, bool positive) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: SellerTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 18),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: SellerTheme.successGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(trend, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: SellerTheme.successGreen)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: SellerTheme.textPrimary)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted, height: 1.3)),
          ],
        ),
      ),
    );
  }

  Widget _performanceBar(String label, int score, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: SellerTheme.border),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(fontSize: 13, color: SellerTheme.textSecondary)),
                Text('$score%', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: score / 100,
                backgroundColor: color.withValues(alpha: 0.1),
                valueColor: AlwaysStoppedAnimation(color),
                minHeight: 6,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tipCard(IconData icon, String title, String body, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
                  const SizedBox(height: 2),
                  Text(body, style: const TextStyle(fontSize: 11, color: SellerTheme.textSecondary, height: 1.4)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _achievementBadge(String emoji, String title, String date) {
    return Container(
      width: 90,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: SellerTheme.border),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          Text(date, style: const TextStyle(fontSize: 8, color: SellerTheme.textMuted)),
        ],
      ),
    );
  }
}
