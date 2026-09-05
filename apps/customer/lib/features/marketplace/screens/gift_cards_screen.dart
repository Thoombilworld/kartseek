import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Gift Cards Screen — Check balance, redeem gift cards, and view transaction history.
class GiftCardsScreen extends StatefulWidget {
  const GiftCardsScreen({super.key});
  @override
  State<GiftCardsScreen> createState() => _GiftCardsScreenState();
}

class _GiftCardsScreenState extends State<GiftCardsScreen> {
  final _codeController = TextEditingController();
  bool _checked = false;
  double? _balance;

  void _checkBalance() {
    if (_codeController.text.isNotEmpty) {
      setState(() {
        _checked = true;
        _balance = 2500.0;
      });
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('🎁 Gift Cards',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Balance Check Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [AppTheme.marketplaceColor, Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(children: [
              const Text('Check Gift Card Balance',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12)),
                child: TextField(
                  controller: _codeController,
                  style: const TextStyle(
                      color: Colors.white,
                      fontFamily: 'monospace',
                      fontSize: 16,
                      letterSpacing: 2),
                  decoration: InputDecoration(
                    hintText: 'GIFT-XXXX-XXXX',
                    hintStyle:
                        TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    suffixIcon: IconButton(
                        icon: const Icon(Icons.qr_code_scanner,
                            color: Colors.white),
                        onPressed: () {}),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _checkBalance,
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppTheme.marketplaceColor,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  child: const Text('Check Balance',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              if (_checked && _balance != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12)),
                  child: Column(children: [
                    const Text('Available Balance',
                        style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('₹${_balance!.toStringAsFixed(0)}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    const Text('Valid until Dec 31, 2026',
                        style: TextStyle(color: Colors.white60, fontSize: 12)),
                  ]),
                ),
              ],
            ]),
          ),
          const SizedBox(height: 24),

          // Quick Amounts
          const Text('Buy a Gift Card',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [500, 1000, 2000, 5000, 10000]
                  .map(
                    (amount) => GestureDetector(
                      onTap: () {},
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 14),
                        decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: AppTheme.borderLight),
                            borderRadius: BorderRadius.circular(12)),
                        child: Text('₹$amount',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: AppTheme.marketplaceColor)),
                      ),
                    ),
                  )
                  .toList()),
          const SizedBox(height: 24),

          // Transaction History
          const Text('Recent Transactions',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          ...[
            const _TxnItem(
                type: 'Redeemed',
                amount: -500,
                date: 'Jun 28, 2026',
                orderId: 'ORD-12345'),
            const _TxnItem(
                type: 'Received',
                amount: 2500,
                date: 'Jun 15, 2026',
                orderId: 'Gift from Amit'),
            const _TxnItem(
                type: 'Redeemed',
                amount: -1000,
                date: 'Jun 10, 2026',
                orderId: 'ORD-12300'),
          ].map((txn) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.borderLight)),
                child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(txn.type,
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: txn.amount > 0
                                        ? AppTheme.successGreen
                                        : AppTheme.errorRed)),
                            const SizedBox(height: 2),
                            Text(txn.orderId,
                                style: const TextStyle(
                                    color: AppTheme.textSecondary, fontSize: 12)),
                          ]),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                                '${txn.amount > 0 ? '+' : ''}₹${txn.amount.abs()}',
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                    color: txn.amount > 0
                                        ? AppTheme.successGreen
                                        : AppTheme.errorRed)),
                            Text(txn.date,
                                style: const TextStyle(
                                    color: AppTheme.textMuted, fontSize: 11)),
                          ]),
                    ]),
              )),
        ]),
      ),
    );
  }
}

class _TxnItem {
  final String type;
  final int amount;
  final String date;
  final String orderId;
  const _TxnItem(
      {required this.type,
      required this.amount,
      required this.date,
      required this.orderId});
}
