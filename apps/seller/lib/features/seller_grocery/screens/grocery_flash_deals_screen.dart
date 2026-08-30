import 'dart:async';
import 'package:flutter/material.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Flash Deal Model
// ─────────────────────────────────────────────────────────────────────────────

enum FlashDealStatus {
  draft,
  pendingApproval,
  approved,
  active,
  paused,
  expired,
  rejected
}

class SellerFlashDeal {
  final String id;
  final String productName;
  final String emoji;
  final String category;
  final double originalPrice;
  final double flashPrice;
  final int discountPercent;
  final DateTime endTime;
  final int stockLimit;
  final int soldCount;
  FlashDealStatus status;
  final String? rejectionReason;

  SellerFlashDeal({
    required this.id,
    required this.productName,
    required this.emoji,
    required this.category,
    required this.originalPrice,
    required this.flashPrice,
    required this.discountPercent,
    required this.endTime,
    required this.stockLimit,
    required this.soldCount,
    required this.status,
    this.rejectionReason,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GroceryFlashDealsScreen
// ─────────────────────────────────────────────────────────────────────────────

class GroceryFlashDealsScreen extends StatefulWidget {
  const GroceryFlashDealsScreen({super.key});

  @override
  State<GroceryFlashDealsScreen> createState() =>
      _GroceryFlashDealsScreenState();
}

class _GroceryFlashDealsScreenState extends State<GroceryFlashDealsScreen> {
  late Timer _timer;
  late List<SellerFlashDeal> _deals;
  FlashDealStatus? _filter;

  @override
  void initState() {
    super.initState();
    _deals = _generateMockDeals();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  List<SellerFlashDeal> _generateMockDeals() {
    final now = DateTime.now();
    return [
      SellerFlashDeal(
          id: 'fd-1',
          productName: 'Organic Bananas (1 Dozen)',
          emoji: '🍌',
          category: 'Fruits',
          originalPrice: 89,
          flashPrice: 49,
          discountPercent: 45,
          endTime: DateTime(now.year, now.month, now.day, 23, 59, 59),
          stockLimit: 50,
          soldCount: 37,
          status: FlashDealStatus.active),
      SellerFlashDeal(
          id: 'fd-2',
          productName: 'Full Cream Milk 1L',
          emoji: '🥛',
          category: 'Dairy',
          originalPrice: 68,
          flashPrice: 45,
          discountPercent: 34,
          endTime: now.add(const Duration(hours: 24)),
          stockLimit: 100,
          soldCount: 62,
          status: FlashDealStatus.active),
      SellerFlashDeal(
          id: 'fd-3',
          productName: 'Basmati Rice 5kg',
          emoji: '🍚',
          category: 'Essentials',
          originalPrice: 599,
          flashPrice: 399,
          discountPercent: 33,
          endTime: now.add(const Duration(hours: 48)),
          stockLimit: 30,
          soldCount: 18,
          status: FlashDealStatus.active),
      SellerFlashDeal(
          id: 'fd-4',
          productName: 'Greek Yogurt 400g',
          emoji: '🥛',
          category: 'Dairy',
          originalPrice: 120,
          flashPrice: 79,
          discountPercent: 34,
          endTime: now.add(const Duration(hours: 48)),
          stockLimit: 40,
          soldCount: 0,
          status: FlashDealStatus.pendingApproval),
      SellerFlashDeal(
          id: 'fd-5',
          productName: 'Fresh Orange Juice 1L',
          emoji: '🍊',
          category: 'Beverages',
          originalPrice: 159,
          flashPrice: 99,
          discountPercent: 38,
          endTime: now.add(const Duration(hours: 48)),
          stockLimit: 60,
          soldCount: 0,
          status: FlashDealStatus.draft),
      SellerFlashDeal(
          id: 'fd-6',
          productName: 'Premium Almonds 250g',
          emoji: '🥜',
          category: 'Dry Fruits',
          originalPrice: 399,
          flashPrice: 299,
          discountPercent: 25,
          endTime: now.subtract(const Duration(hours: 12)),
          stockLimit: 20,
          soldCount: 0,
          status: FlashDealStatus.rejected,
          rejectionReason: 'Discount below 30% minimum'),
    ];
  }

  List<SellerFlashDeal> get _filtered {
    if (_filter == null) return _deals;
    return _deals.where((d) => d.status == _filter).toList();
  }

  Color _statusColor(FlashDealStatus s) {
    switch (s) {
      case FlashDealStatus.active:
        return const Color(0xFF059669);
      case FlashDealStatus.pendingApproval:
        return const Color(0xFFD97706);
      case FlashDealStatus.draft:
        return const Color(0xFF64748B);
      case FlashDealStatus.paused:
        return const Color(0xFFEA580C);
      case FlashDealStatus.expired:
        return const Color(0xFF94A3B8);
      case FlashDealStatus.rejected:
        return const Color(0xFFDC2626);
      case FlashDealStatus.approved:
        return const Color(0xFF2563EB);
    }
  }

  String _statusLabel(FlashDealStatus s) {
    switch (s) {
      case FlashDealStatus.active:
        return 'Active';
      case FlashDealStatus.pendingApproval:
        return 'Pending';
      case FlashDealStatus.draft:
        return 'Draft';
      case FlashDealStatus.paused:
        return 'Paused';
      case FlashDealStatus.expired:
        return 'Expired';
      case FlashDealStatus.rejected:
        return 'Rejected';
      case FlashDealStatus.approved:
        return 'Approved';
    }
  }

  String _formatCountdown(DateTime end) {
    final diff = end.difference(DateTime.now());
    if (diff.isNegative) return 'Ended';
    final h = diff.inHours;
    final m = diff.inMinutes.remainder(60);
    final s = diff.inSeconds.remainder(60);
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final activeCount =
        _deals.where((d) => d.status == FlashDealStatus.active).length;
    final pendingCount =
        _deals.where((d) => d.status == FlashDealStatus.pendingApproval).length;
    final totalSold = _deals
        .where((d) => d.status == FlashDealStatus.active)
        .fold<int>(0, (s, d) => s + d.soldCount);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Row(
          children: [
            Text('⚡ ', style: TextStyle(fontSize: 20)),
            Text('Flash Deals',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon:
                const Icon(Icons.add_circle_outline, color: Color(0xFFEA580C)),
            onPressed: () => _showCreateDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // KPI Strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                _kpi('Active', '$activeCount', const Color(0xFF059669)),
                _kpi('Pending', '$pendingCount', const Color(0xFFD97706)),
                _kpi('Sold', '$totalSold', const Color(0xFF2563EB)),
              ],
            ),
          ),
          const Divider(height: 1),

          // Filter chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _filterChip(null, 'All'),
                _filterChip(FlashDealStatus.active, 'Active'),
                _filterChip(FlashDealStatus.pendingApproval, 'Pending'),
                _filterChip(FlashDealStatus.draft, 'Drafts'),
                _filterChip(FlashDealStatus.paused, 'Paused'),
                _filterChip(FlashDealStatus.expired, 'Expired'),
                _filterChip(FlashDealStatus.rejected, 'Rejected'),
              ],
            ),
          ),

          // Deals list
          Expanded(
            child: _filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('⚡', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 8),
                        Text('No flash deals found',
                            style: TextStyle(
                                color: Colors.grey.shade500,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filtered.length,
                    itemBuilder: (_, i) => _dealCard(_filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Widget _filterChip(FlashDealStatus? status, String label) {
    final selected = _filter == status;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _filter = status),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFEA580C) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : const Color(0xFF475569),
            ),
          ),
        ),
      ),
    );
  }

  Widget _dealCard(SellerFlashDeal deal) {
    final stockPercent =
        deal.stockLimit > 0 ? deal.soldCount / deal.stockLimit : 0.0;
    final stockLeft = deal.stockLimit - deal.soldCount;
    final sc = _statusColor(deal.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(deal.emoji, style: const TextStyle(fontSize: 36)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(deal.productName,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: Color(0xFF0F172A))),
                    const SizedBox(height: 2),
                    Text('${deal.category} • ${deal.id}',
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade400)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: sc.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: sc.withValues(alpha: 0.3)),
                ),
                child: Text(_statusLabel(deal.status),
                    style: TextStyle(
                        fontSize: 10, fontWeight: FontWeight.w800, color: sc)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Price & discount row
          Row(
            children: [
              Text('₹${deal.flashPrice.toInt()}',
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFDC2626))),
              const SizedBox(width: 8),
              Text('₹${deal.originalPrice.toInt()}',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade400,
                      decoration: TextDecoration.lineThrough)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(4)),
                child: Text('${deal.discountPercent}% OFF',
                    style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFDC2626))),
              ),
              const Spacer(),
              if (deal.status == FlashDealStatus.active) ...[
                const Icon(Icons.timer_outlined,
                    size: 14, color: Color(0xFFEA580C)),
                const SizedBox(width: 4),
                Text(_formatCountdown(deal.endTime),
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        color: Color(0xFFEA580C))),
              ],
            ],
          ),
          const SizedBox(height: 10),

          // Stock bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: stockPercent,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: AlwaysStoppedAnimation<Color>(
                stockPercent > 0.8
                    ? const Color(0xFFDC2626)
                    : stockPercent > 0.5
                        ? const Color(0xFFEA580C)
                        : const Color(0xFF059669),
              ),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 4),
          Text('${deal.soldCount}/${deal.stockLimit} sold ($stockLeft left)',
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),

          // Rejection reason
          if (deal.status == FlashDealStatus.rejected &&
              deal.rejectionReason != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFECACA))),
              child: Row(
                children: [
                  const Icon(Icons.cancel, size: 14, color: Color(0xFFDC2626)),
                  const SizedBox(width: 6),
                  Expanded(
                      child: Text(deal.rejectionReason!,
                          style: const TextStyle(
                              fontSize: 11, color: Color(0xFFDC2626)))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),

          // Action buttons
          _actionRow(deal),
        ],
      ),
    );
  }

  Widget _actionRow(SellerFlashDeal deal) {
    switch (deal.status) {
      case FlashDealStatus.draft:
        return Row(
          children: [
            _actionBtn(
                'Submit',
                Icons.send,
                const Color(0xFF059669),
                () => setState(
                    () => deal.status = FlashDealStatus.pendingApproval)),
            const SizedBox(width: 8),
            _actionBtn(
                'Edit', Icons.edit_outlined, const Color(0xFF64748B), () {}),
            const SizedBox(width: 8),
            _actionBtn('Delete', Icons.delete_outline, const Color(0xFFDC2626),
                () => setState(() => _deals.remove(deal))),
          ],
        );
      case FlashDealStatus.pendingApproval:
        return Row(
          children: [
            const Icon(Icons.hourglass_top, size: 14, color: Color(0xFFD97706)),
            const SizedBox(width: 6),
            Text('Awaiting Admin review...',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.amber.shade700)),
          ],
        );
      case FlashDealStatus.active:
        return Row(
          children: [
            _actionBtn(
                'Pause',
                Icons.pause_circle_outline,
                const Color(0xFFEA580C),
                () => setState(() => deal.status = FlashDealStatus.paused)),
            const SizedBox(width: 8),
            _actionBtn('Preview', Icons.visibility_outlined,
                const Color(0xFF64748B), () {}),
          ],
        );
      case FlashDealStatus.paused:
        return Row(
          children: [
            _actionBtn(
                'Resume',
                Icons.play_circle_outline,
                const Color(0xFF059669),
                () => setState(() => deal.status = FlashDealStatus.active)),
          ],
        );
      case FlashDealStatus.rejected:
        return Row(
          children: [
            _actionBtn('Revise', Icons.edit_outlined, const Color(0xFF2563EB),
                () => setState(() => deal.status = FlashDealStatus.draft)),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _actionBtn(
      String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      ),
    );
  }

  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(children: [
          Text('⚡ ', style: TextStyle(fontSize: 20)),
          Text('Create Flash Deal',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16))
        ]),
        content: const Text(
            'Select a product from your catalog, set the flash price (minimum 30% discount), stock limit, and deal duration.\n\nOnce created, submit for Admin approval.',
            style: TextStyle(fontSize: 13, color: Color(0xFF475569))),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close')),
        ],
      ),
    );
  }
}
