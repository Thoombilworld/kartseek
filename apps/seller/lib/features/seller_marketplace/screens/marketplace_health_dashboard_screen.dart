import 'package:flutter/material.dart';

/// Seller Health Dashboard — Overview of account health, policy compliance, and ratings.
class MarketplaceHealthDashboardScreen extends StatelessWidget {
  const MarketplaceHealthDashboardScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final metrics = [
      const _HealthMetric(
          name: 'Order Defect Rate',
          value: '0.8%',
          target: '< 1%',
          status: 'good',
          icon: Icons.bug_report),
      const _HealthMetric(
          name: 'Cancellation Rate',
          value: '1.5%',
          target: '< 2.5%',
          status: 'good',
          icon: Icons.cancel),
      const _HealthMetric(
          name: 'Late Shipment Rate',
          value: '3.2%',
          target: '< 4%',
          status: 'warning',
          icon: Icons.access_time),
      const _HealthMetric(
          name: 'Customer Response',
          value: '92%',
          target: '> 90%',
          status: 'good',
          icon: Icons.chat),
      const _HealthMetric(
          name: 'Return Rate',
          value: '4.8%',
          target: '< 5%',
          status: 'warning',
          icon: Icons.assignment_return),
      const _HealthMetric(
          name: 'Listing Quality',
          value: '78%',
          target: '> 80%',
          status: 'critical',
          icon: Icons.list_alt),
    ];

    final overallScore = 82;
    final scoreColor = overallScore >= 80
        ? const Color(0xFF10B981)
        : overallScore >= 60
            ? const Color(0xFFF59E0B)
            : const Color(0xFFEF4444);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Account Health',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
      ),
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        // Score Circle
        SliverToBoxAdapter(
            child: Container(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          decoration: const BoxDecoration(
              color: _mp,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28))),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20)),
            child: Column(children: [
              Stack(alignment: Alignment.center, children: [
                SizedBox(
                  width: 100,
                  height: 100,
                  child: CircularProgressIndicator(
                    value: overallScore / 100,
                    strokeWidth: 8,
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation(scoreColor),
                  ),
                ),
                Column(children: [
                  Text('$overallScore',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 36,
                          fontWeight: FontWeight.w900)),
                  const Text('/ 100',
                      style: TextStyle(color: Colors.white60, fontSize: 13)),
                ]),
              ]),
              const SizedBox(height: 12),
              Text(
                overallScore >= 80
                    ? '✅ Good Standing'
                    : overallScore >= 60
                        ? '⚠️ Needs Improvement'
                        : '🚨 At Risk',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700),
              ),
            ]),
          ),
        )),
        // Metrics
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final m = metrics[i];
              final statusColor = m.status == 'good'
                  ? const Color(0xFF10B981)
                  : m.status == 'warning'
                      ? const Color(0xFFF59E0B)
                      : const Color(0xFFEF4444);
              final statusIcon = m.status == 'good'
                  ? Icons.check_circle
                  : m.status == 'warning'
                      ? Icons.warning
                      : Icons.error;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border:
                        Border.all(color: statusColor.withValues(alpha: 0.2))),
                child: Row(children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12)),
                    child: Icon(m.icon, color: statusColor, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(m.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(height: 4),
                        Row(children: [
                          const Text('Current: ',
                              style: TextStyle(
                                  color: Color(0xFF9CA3AF), fontSize: 12)),
                          Text(m.value,
                              style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                  color: statusColor)),
                          const SizedBox(width: 12),
                          Text('Target: ${m.target}',
                              style: const TextStyle(
                                  color: Color(0xFF9CA3AF), fontSize: 12)),
                        ]),
                      ])),
                  Icon(statusIcon, color: statusColor, size: 22),
                ]),
              );
            },
            childCount: metrics.length,
          )),
        ),
      ]),
    );
  }
}

class _HealthMetric {
  final String name, value, target, status;
  final IconData icon;
  const _HealthMetric(
      {required this.name,
      required this.value,
      required this.target,
      required this.status,
      required this.icon});
}
