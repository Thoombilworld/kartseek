import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:intl/intl.dart';

/// Disputes — View and respond to order disputes, chargebacks, and escalations.
class MarketplaceDisputesScreen extends StatefulWidget {
  const MarketplaceDisputesScreen({super.key});

  @override
  State<MarketplaceDisputesScreen> createState() =>
      _MarketplaceDisputesScreenState();
}

class _MarketplaceDisputesScreenState extends State<MarketplaceDisputesScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  late TabController _tabCtrl;
  int _selectedDisputeIdx = -1;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  final _disputes = <_Dispute>[
    _Dispute(
        'DIS-0089',
        'ORD-44812',
        'Wrong item delivered',
        'Sneha Reddy',
        'open',
        'high',
        DateTime(2026, 6, 7),
        DateTime(2026, 6, 10),
        'Customer received a black case instead of clear. Photo evidence attached.',
        1299),
    _Dispute(
        'DIS-0087',
        'ORD-44790',
        'Item not received',
        'Anjali K.',
        'under_review',
        'medium',
        DateTime(2026, 6, 6),
        DateTime(2026, 6, 12),
        'Tracking shows delivered but customer denies receipt. Delivery partner contacted.',
        2499),
    _Dispute(
        'DIS-0085',
        'ORD-44780',
        'Quality issue',
        'Rahul M.',
        'open',
        'low',
        DateTime(2026, 6, 5),
        DateTime(2026, 6, 11),
        'Screen protector has bubbles. Customer requests replacement or refund.',
        799),
    _Dispute(
        'DIS-0082',
        'ORD-44760',
        'Chargeback',
        'Vikram S.',
        'escalated',
        'critical',
        DateTime(2026, 6, 3),
        DateTime(2026, 6, 8),
        'Payment reversed by bank. Customer claims unauthorized transaction. Evidence needed within 48h.',
        24990),
    _Dispute(
        'DIS-0078',
        'ORD-44720',
        'Damaged in transit',
        'Deepa N.',
        'resolved',
        'medium',
        DateTime(2026, 5, 28),
        null,
        'Headphones box was crushed. Refund issued. Carrier claim filed.',
        4990),
    _Dispute(
        'DIS-0075',
        'ORD-44700',
        'Wrong color',
        'Manoj R.',
        'resolved',
        'low',
        DateTime(2026, 5, 25),
        null,
        'Sent blue instead of silver. Replacement shipped and delivered. Customer satisfied.',
        1499),
  ];

  List<_Dispute> get _active => _disputes
      .where((d) => ['open', 'under_review', 'escalated'].contains(d.status))
      .toList();
  List<_Dispute> get _resolved =>
      _disputes.where((d) => d.status == 'resolved').toList();

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    final fmt = NumberFormat.currency(symbol: '$currency ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Disputes',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          IconButton(
              icon: const Icon(Icons.filter_list),
              onPressed: () {},
              tooltip: 'Filter'),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle:
              const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: [
            Tab(text: 'Active (${_active.length})'),
            Tab(text: 'Resolved (${_resolved.length})'),
            const Tab(text: 'Guidelines'),
          ],
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // KPI strip
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _miniKpi(
                    'Open',
                    '${_active.where((d) => d.status == 'open').length}',
                    SellerTheme.warningAmber),
                _miniKpi(
                    'Under Review',
                    '${_active.where((d) => d.status == 'under_review').length}',
                    SellerTheme.infoBlue),
                _miniKpi(
                    'Escalated',
                    '${_active.where((d) => d.status == 'escalated').length}',
                    SellerTheme.errorRed),
                _miniKpi('Win Rate', '78%', SellerTheme.successGreen),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: TabBarView(
              controller: _tabCtrl,
              children: [
                _buildDisputeList(_active, fmt, true),
                _buildDisputeList(_resolved, fmt, false),
                _buildGuidelines(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Dispute List ───────────────────────────────────────────────────────
  Widget _buildDisputeList(
      List<_Dispute> disputes, NumberFormat fmt, bool showDeadline) {
    if (disputes.isEmpty) {
      return const Center(
          child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.gavel, size: 48, color: SellerTheme.textMuted),
          SizedBox(height: 12),
          Text('No disputes',
              style: TextStyle(
                  color: SellerTheme.textMuted, fontWeight: FontWeight.bold)),
        ],
      ));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: disputes.length,
      itemBuilder: (_, i) {
        final d = disputes[i];
        final statusCfg = _statusCfg(d.status);
        final priorityCfg = _priorityCfg(d.priority);
        final isExpanded = _selectedDisputeIdx == i;

        return GestureDetector(
          onTap: () =>
              setState(() => _selectedDisputeIdx = isExpanded ? -1 : i),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: d.priority == 'critical'
                      ? SellerTheme.errorRed.withValues(alpha: 0.3)
                      : SellerTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: statusCfg.$2.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(statusCfg.$3, color: statusCfg.$2, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(d.id,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      fontFamily: 'monospace')),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                    color:
                                        priorityCfg.$2.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4)),
                                child: Text(priorityCfg.$1,
                                    style: TextStyle(
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                        color: priorityCfg.$2)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(d.reason,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: SellerTheme.textSecondary)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusCfg.$2.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(statusCfg.$1,
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: statusCfg.$2)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Info row
                Row(
                  children: [
                    _infoChip(Icons.person_outline, d.customer),
                    const SizedBox(width: 8),
                    _infoChip(Icons.receipt_long, d.orderId),
                    const Spacer(),
                    Text(fmt.format(d.amount),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: SellerTheme.textPrimary)),
                  ],
                ),
                if (showDeadline && d.deadline != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _isUrgent(d.deadline!)
                          ? SellerTheme.errorRed.withValues(alpha: 0.08)
                          : SellerTheme.warningAmber.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.timer,
                            size: 12,
                            color: _isUrgent(d.deadline!)
                                ? SellerTheme.errorRed
                                : SellerTheme.warningAmber),
                        const SizedBox(width: 4),
                        Text(
                          'Respond by ${DateFormat('dd MMM').format(d.deadline!)} (${d.deadline!.difference(DateTime.now()).inDays}d left)',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: _isUrgent(d.deadline!)
                                  ? SellerTheme.errorRed
                                  : SellerTheme.warningAmber),
                        ),
                      ],
                    ),
                  ),
                ],
                // Expanded detail
                if (isExpanded) ...[
                  const Divider(height: 20),
                  const Text('Details',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: SellerTheme.textPrimary)),
                  const SizedBox(height: 4),
                  Text(d.description,
                      style: const TextStyle(
                          fontSize: 12,
                          color: SellerTheme.textSecondary,
                          height: 1.4)),
                  const SizedBox(height: 4),
                  Text(
                      'Filed: ${DateFormat('dd MMM yyyy').format(d.filedDate)}',
                      style: const TextStyle(
                          fontSize: 10, color: SellerTheme.textMuted)),
                  if (d.status != 'resolved') ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.upload_file, size: 14),
                            label: const Text('Upload Evidence'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _mp,
                              side: const BorderSide(color: _mp),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              textStyle: const TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.reply, size: 14),
                            label: const Text('Respond'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _mp,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              textStyle: const TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Guidelines ──────────────────────────────────────────────────────────
  Widget _buildGuidelines() {
    final guidelines = [
      const _Guideline(Icons.timer, 'Response Time',
          'Respond within 48 hours to avoid automatic resolution in the buyer\'s favor. Chargebacks require response within 24 hours.'),
      const _Guideline(Icons.camera_alt, 'Evidence Requirements',
          'Always upload clear photos of the product before shipping. Keep packaging receipts and delivery confirmation screenshots.'),
      const _Guideline(Icons.shield, 'Seller Protection',
          'You are protected against false claims when tracking shows confirmed delivery and product matches listing description.'),
      const _Guideline(Icons.gavel, 'Escalation Process',
          'If you disagree with a resolution, you can escalate to KARTSEEK arbitration within 7 days. Final decisions are binding.'),
      const _Guideline(Icons.trending_up, 'Impact on Score',
          'Unresolved disputes negatively impact your seller health score. Win rate above 80% maintains your badge status.'),
      const _Guideline(Icons.money_off, 'Chargebacks',
          'Chargeback disputes require bank-level documentation. Always provide order confirmation, delivery proof, and customer communication logs.'),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: guidelines.length,
      itemBuilder: (_, i) {
        final g = guidelines[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: SellerTheme.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                    color: _mp.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8)),
                child: Icon(g.icon, color: _mp, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(g.title,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 3),
                    Text(g.body,
                        style: const TextStyle(
                            fontSize: 11,
                            color: SellerTheme.textSecondary,
                            height: 1.4)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Widget _miniKpi(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 18, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: SellerTheme.textMuted),
        const SizedBox(width: 3),
        Text(text,
            style: const TextStyle(
                fontSize: 11, color: SellerTheme.textSecondary)),
      ],
    );
  }

  bool _isUrgent(DateTime deadline) =>
      deadline.difference(DateTime.now()).inDays <= 2;

  (String, Color, IconData) _statusCfg(String status) {
    switch (status) {
      case 'open':
        return ('Open', SellerTheme.warningAmber, Icons.error_outline);
      case 'under_review':
        return ('Under Review', SellerTheme.infoBlue, Icons.hourglass_top);
      case 'escalated':
        return ('Escalated', SellerTheme.errorRed, Icons.warning_amber);
      case 'resolved':
        return ('Resolved', SellerTheme.successGreen, Icons.check_circle);
      default:
        return ('Unknown', SellerTheme.textMuted, Icons.help_outline);
    }
  }

  (String, Color) _priorityCfg(String priority) {
    switch (priority) {
      case 'critical':
        return ('CRITICAL', SellerTheme.errorRed);
      case 'high':
        return ('HIGH', const Color(0xFFEF4444));
      case 'medium':
        return ('MEDIUM', SellerTheme.warningAmber);
      case 'low':
        return ('LOW', SellerTheme.successGreen);
      default:
        return ('—', SellerTheme.textMuted);
    }
  }
}

class _Dispute {
  final String id, orderId, reason, customer, status, priority, description;
  final DateTime filedDate;
  final DateTime? deadline;
  final int amount;
  const _Dispute(
      this.id,
      this.orderId,
      this.reason,
      this.customer,
      this.status,
      this.priority,
      this.filedDate,
      this.deadline,
      this.description,
      this.amount);
}

class _Guideline {
  final IconData icon;
  final String title, body;
  const _Guideline(this.icon, this.title, this.body);
}
