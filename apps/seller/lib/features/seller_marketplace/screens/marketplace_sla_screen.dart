import 'package:flutter/material.dart';

/// Seller SLA Performance — Track service level agreement compliance.
class MarketplaceSLAScreen extends StatelessWidget {
  const MarketplaceSLAScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final slas = <_SLA>[
      const _SLA(
          metric: 'Order Processing',
          target: '< 24h',
          current: '18h',
          status: 'meeting'),
      const _SLA(
          metric: 'Shipping Handover',
          target: '< 48h',
          current: '32h',
          status: 'meeting'),
      const _SLA(
          metric: 'Customer Response',
          target: '< 24h',
          current: '12h',
          status: 'exceeding'),
      const _SLA(
          metric: 'Return Processing',
          target: '< 5 days',
          current: '4 days',
          status: 'meeting'),
      const _SLA(
          metric: 'Refund Processing',
          target: '< 7 days',
          current: '9 days',
          status: 'breached'),
      const _SLA(
          metric: 'Listing Quality',
          target: '> 80%',
          current: '78%',
          status: 'at_risk'),
      const _SLA(
          metric: 'Cancellation Rate',
          target: '< 2%',
          current: '1.5%',
          status: 'meeting'),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('SLA Performance',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
      ),
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        // Summary
        SliverToBoxAdapter(
            child: Container(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          decoration: const BoxDecoration(
              color: _mp,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28))),
          child:
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _summaryChip(
                'Exceeding',
                slas.where((s) => s.status == 'exceeding').length,
                const Color(0xFF10B981)),
            _summaryChip(
                'Meeting',
                slas.where((s) => s.status == 'meeting').length,
                const Color(0xFF3B82F6)),
            _summaryChip(
                'At Risk',
                slas.where((s) => s.status == 'at_risk').length,
                const Color(0xFFF59E0B)),
            _summaryChip(
                'Breached',
                slas.where((s) => s.status == 'breached').length,
                const Color(0xFFEF4444)),
          ]),
        )),
        // SLA List
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final sla = slas[i];
              final statusConfig = _statusConfig(sla.status);
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: statusConfig.color.withValues(alpha: 0.2)),
                ),
                child: Row(children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                        color: statusConfig.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12)),
                    child: Icon(statusConfig.icon,
                        color: statusConfig.color, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(sla.metric,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 4),
                        Row(children: [
                          const Text('Target: ',
                              style: TextStyle(
                                  color: Color(0xFF9CA3AF), fontSize: 12)),
                          Text(sla.target,
                              style: const TextStyle(
                                  color: Color(0xFF6B7280),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(width: 12),
                          const Text('Current: ',
                              style: TextStyle(
                                  color: Color(0xFF9CA3AF), fontSize: 12)),
                          Text(sla.current,
                              style: TextStyle(
                                  color: statusConfig.color,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700)),
                        ]),
                      ])),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                        color: statusConfig.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8)),
                    child: Text(statusConfig.label,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: statusConfig.color)),
                  ),
                ]),
              );
            },
            childCount: slas.length,
          )),
        ),
        // Warning
        if (slas.any((s) => s.status == 'breached'))
          SliverToBoxAdapter(
              child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(14)),
            child: const Row(children: [
              Icon(Icons.warning_amber, color: Color(0xFFEF4444)),
              SizedBox(width: 12),
              Expanded(
                  child: Text(
                      'You have SLA breaches. Continued violations may result in penalties.',
                      style: TextStyle(
                          color: Color(0xFFEF4444),
                          fontSize: 13,
                          fontWeight: FontWeight.w600))),
            ]),
          )),
      ]),
    );
  }

  Widget _summaryChip(String label, int count, Color color) =>
      Column(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10)),
          child: Center(
              child: Text('$count',
                  style: TextStyle(
                      color: color,
                      fontSize: 18,
                      fontWeight: FontWeight.w900))),
        ),
        const SizedBox(height: 4),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 10)),
      ]);

  _StatusConfig _statusConfig(String status) {
    switch (status) {
      case 'exceeding':
        return const _StatusConfig(
            'EXCEEDING', Color(0xFF10B981), Icons.arrow_upward);
      case 'meeting':
        return const _StatusConfig('MEETING', Color(0xFF3B82F6), Icons.check);
      case 'at_risk':
        return const _StatusConfig('AT RISK', Color(0xFFF59E0B), Icons.warning);
      case 'breached':
        return const _StatusConfig('BREACHED', Color(0xFFEF4444), Icons.error);
      default:
        return const _StatusConfig('UNKNOWN', Colors.grey, Icons.help);
    }
  }
}

class _SLA {
  final String metric, target, current, status;
  const _SLA(
      {required this.metric,
      required this.target,
      required this.current,
      required this.status});
}

class _StatusConfig {
  final String label;
  final Color color;
  final IconData icon;
  const _StatusConfig(this.label, this.color, this.icon);
}
