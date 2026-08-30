import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_feed_screen.dart';

/// Flash Deals — time-limited offers.
///
/// Two things were wrong here. The products came from
/// `MarketplaceMockData.allProducts` filtered by discount, so they were not on
/// any deal; and the countdown started from a hardcoded `3h 45m 22s` on every
/// visit, so it measured how long the screen had been open rather than how long
/// the deal had left.
///
/// The API now carries a real `dealEndsAt` per campaign (see the `flash_deals`
/// table), so [_FlashDealsCountdown] counts down to the soonest genuine expiry
/// and the banner disappears when there is nothing running.
class FlashDealsScreen extends StatelessWidget {
  const FlashDealsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return ProductFeedScreen(
      title: 'Flash Deals',
      subjectForErrors: 'flash deals',
      emptyTitle: 'No flash deals right now',
      emptySubtitle: 'Flash deals run for a few hours at a time. Check back shortly.',
      emptyIcon: Icons.bolt_outlined,
      loader: (page) => page == 0 ? api.getFlashDeals() : Future.value(<ProductModel>[]),
      header: (context, products) => _FlashDealsCountdown(products: products),
    );
  }
}

/// Counts down to the earliest real `dealEndsAt` in the loaded set.
class _FlashDealsCountdown extends StatefulWidget {
  const _FlashDealsCountdown({required this.products});

  final List<ProductModel> products;

  @override
  State<_FlashDealsCountdown> createState() => _FlashDealsCountdownState();
}

class _FlashDealsCountdownState extends State<_FlashDealsCountdown> {
  Timer? _ticker;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _recompute();
    // One timer, not an AnimationController re-armed on every completed status —
    // that setup ran a full animation frame per second for a clock.
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _recompute());
  }

  @override
  void didUpdateWidget(covariant _FlashDealsCountdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.products != widget.products) _recompute();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  /// Soonest expiry across the loaded deals, or zero when none of them carry one.
  void _recompute() {
    final now = DateTime.now();
    DateTime? soonest;
    for (final p in widget.products) {
      final ends = p.dealEndsAt;
      if (ends == null || !ends.isAfter(now)) continue;
      if (soonest == null || ends.isBefore(soonest)) soonest = ends;
    }
    final next = soonest == null ? Duration.zero : soonest.difference(now);
    if (mounted && next != _remaining) setState(() => _remaining = next);
  }

  @override
  Widget build(BuildContext context) {
    final hasDeals = widget.products.isNotEmpty;
    final showClock = _remaining > Duration.zero;
    final h = _remaining.inHours.toString().padLeft(2, '0');
    final m = (_remaining.inMinutes % 60).toString().padLeft(2, '0');
    final s = (_remaining.inSeconds % 60).toString().padLeft(2, '0');

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFFEA580C)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.bolt, color: Colors.white, size: 26),
              SizedBox(width: 8),
              Text('FLASH DEALS',
                  style: TextStyle(
                      color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 1)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            hasDeals
                ? '${widget.products.length} ${widget.products.length == 1 ? 'product' : 'products'} at deal prices'
                : 'Nothing running at the moment',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          if (showClock) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('Ends in ',
                    style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                _unit(h),
                _sep(),
                _unit(m),
                _sep(),
                _unit(s),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _unit(String v) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.22),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(v,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15, fontFeatures: [])),
      );

  Widget _sep() => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 3),
        child: Text(':', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
      );
}
