import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Refund Status Screen — shows refund progress for returned/cancelled orders.
class RefundStatusScreen extends StatelessWidget {
  final String orderId;
  const RefundStatusScreen({super.key, this.orderId = 'KS-2026-78432'});

  @override
  Widget build(BuildContext context) {
    final steps = [
      {'title': 'Return Request Created', 'date': 'Jun 7, 2026', 'done': true},
      {'title': 'Return Pickup Completed', 'date': 'Jun 8, 2026', 'done': true},
      {'title': 'Product Received by Seller', 'date': 'Jun 9, 2026', 'done': true},
      {'title': 'Refund Initiated', 'date': 'Jun 10, 2026', 'done': true},
      {'title': 'Refund Credited', 'date': 'Expected by Jun 15, 2026', 'done': false},
    ];

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(title: const Text('Refund Status')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Refund summary
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.successGreen, Color(0xFF059669)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Refund Amount', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              const Text('\u20B9 42,900', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text('Order $orderId', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(6)),
                child: const Text('Refund in Progress', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ]),
          ),
          const SizedBox(height: 28),
          const Text('Refund Timeline', style: AppTheme.headingSM),
          const SizedBox(height: 16),
          // Timeline
          ...List.generate(steps.length, (i) {
            final s = steps[i];
            final done = s['done'] as bool;
            return IntrinsicHeight(
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Column(children: [
                  Container(
                    width: 28, height: 28,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: done ? AppTheme.successGreen : AppTheme.borderLight),
                    child: done ? const Icon(Icons.check, color: Colors.white, size: 16) : Center(child: Container(width: 8, height: 8, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.textMuted))),
                  ),
                  if (i < steps.length - 1) Expanded(child: Container(width: 2, color: done ? AppTheme.successGreen.withValues(alpha: 0.4) : AppTheme.borderLight)),
                ]),
                const SizedBox(width: 16),
                Expanded(child: Padding(padding: const EdgeInsets.only(bottom: 28), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s['title'] as String, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: done ? AppTheme.textPrimary : AppTheme.textMuted)),
                  Padding(padding: const EdgeInsets.only(top: 2), child: Text(s['date'] as String, style: AppTheme.caption)),
                ]))),
              ]),
            );
          }),
          const SizedBox(height: 20),
          // Refund method
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderLight)),
            child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Refund Method', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              SizedBox(height: 8),
              Row(children: [
                Icon(Icons.account_balance, size: 20, color: AppTheme.marketplaceColor),
                SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Original Payment Method', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  Text('UPI (Google Pay)', style: AppTheme.caption),
                ])),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Connecting to customer support…'), duration: Duration(seconds: 2))),
            icon: const Icon(Icons.headset_mic, size: 18),
            label: const Text('Contact Support'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ],
      ),
    );
  }
}
