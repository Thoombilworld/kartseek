import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Wallet & loyalty payment screen — view balance, add money, transaction history.
class PharmacyWalletScreen extends StatelessWidget {
  const PharmacyWalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => Navigator.pop(context)),
        title: const Text('Wallet & Loyalty',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.black87)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Balance card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [
                AppTheme.pharmacyColor,
                AppTheme.pharmacyColor.withValues(alpha: 0.75)
              ], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10))
              ],
            ),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.account_balance_wallet,
                      color: Colors.white, size: 24),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8)),
                  child: const Text('KARTSEEK Wallet',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                ),
              ]),
              const SizedBox(height: 24),
              const Text('Available Balance',
                  style: TextStyle(color: Colors.white70, fontSize: 14)),
              const SizedBox(height: 4),
              const Text('₹ 1,250.00',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1)),
              const SizedBox(height: 20),
              Row(children: [
                _walletAction(Icons.add, 'Add Money'),
                const SizedBox(width: 12),
                _walletAction(Icons.send, 'Transfer'),
                const SizedBox(width: 12),
                _walletAction(Icons.history, 'History'),
              ]),
            ]),
          ),
          const SizedBox(height: 24),

          // Loyalty points
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                    shape: BoxShape.circle, color: Colors.amber.shade50),
                child: Icon(Icons.stars_rounded,
                    color: Colors.amber.shade600, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    const Text('Loyalty Points',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 15)),
                    Text('2,450 points = ₹24.50',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade500)),
                  ])),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(10)),
                child: Text('Redeem',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: Colors.amber.shade700)),
              ),
            ]),
          ),
          const SizedBox(height: 24),

          // Payment methods
          const Text('Saved Payment Methods',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          _paymentMethod(
              Icons.credit_card, 'HDFC Bank ****4532', 'Visa Debit', true),
          _paymentMethod(
              Icons.account_balance, 'SBI ****9876', 'UPI - sbi@upi', false),
          _paymentMethod(Icons.phone_android, 'Google Pay', 'UPI', false),

          // Add new
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: Colors.grey.shade200, style: BorderStyle.solid)),
            child: Row(children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.1)),
                child: const Icon(Icons.add,
                    color: AppTheme.pharmacyColor, size: 22),
              ),
              const SizedBox(width: 14),
              const Text('Add Payment Method',
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppTheme.pharmacyColor)),
            ]),
          ),
          const SizedBox(height: 24),

          // Transaction history
          const Text('Recent Transactions',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          _transaction('Order #PH-2026-1234', 'Medicine order', '-₹456.00',
              false, '5 Jul, 2:30 PM'),
          _transaction('Refund #RF-4521', 'Refund for damaged item', '+₹89.00',
              true, '4 Jul, 11:20 AM'),
          _transaction('Cashback', 'Order PH-2026-1190', '+₹25.00', true,
              '2 Jul, 5:15 PM'),
          _transaction('Order #PH-2026-1190', 'Medicine order', '-₹312.00',
              false, '2 Jul, 3:00 PM'),
          _transaction('Wallet Top-up', 'Added via UPI', '+₹1,000.00', true,
              '1 Jul, 10:00 AM'),
        ],
      ),
    );
  }

  static Widget _walletAction(IconData icon, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12)),
        child: Column(children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  Widget _paymentMethod(
      IconData icon, String title, String subtitle, bool isDefault) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: isDefault
                ? AppTheme.pharmacyColor.withValues(alpha: 0.3)
                : Colors.grey.shade200),
      ),
      child: Row(children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
              shape: BoxShape.circle, color: Colors.grey.shade100),
          child: Icon(icon, size: 22, color: Colors.grey.shade600),
        ),
        const SizedBox(width: 14),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          Text(subtitle,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        ])),
        if (isDefault)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6)),
            child: const Text('Default',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.pharmacyColor)),
          ),
      ]),
    );
  }

  Widget _transaction(
      String title, String desc, String amount, bool isCredit, String time) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade100)),
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isCredit ? Colors.green.shade50 : Colors.red.shade50),
          child: Icon(isCredit ? Icons.arrow_downward : Icons.arrow_upward,
              color: isCredit ? Colors.green.shade600 : Colors.red.shade400,
              size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          Text(desc,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(amount,
              style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: isCredit ? Colors.green.shade600 : Colors.black87)),
          Text(time,
              style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
        ]),
      ]),
    );
  }
}
