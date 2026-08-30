import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Saved Payments Screen — Manage payment methods: cards, UPI, wallets.
class SavedPaymentsScreen extends StatefulWidget {
  const SavedPaymentsScreen({super.key});
  @override
  State<SavedPaymentsScreen> createState() => _SavedPaymentsScreenState();
}

class _SavedPaymentsScreenState extends State<SavedPaymentsScreen> {
  final _methods = <_PaymentMethod>[
    _PaymentMethod(
        type: 'UPI',
        label: 'amit@ybl',
        bank: 'PhonePe',
        isDefault: true,
        icon: Icons.account_balance,
        color: AppTheme.marketplaceColor),
    _PaymentMethod(
        type: 'Card',
        label: '•••• •••• •••• 4521',
        bank: 'HDFC Visa',
        isDefault: false,
        icon: Icons.credit_card,
        color: AppTheme.marketplaceColor),
    _PaymentMethod(
        type: 'Card',
        label: '•••• •••• •••• 8812',
        bank: 'ICICI Mastercard',
        isDefault: false,
        icon: Icons.credit_card,
        color: const Color(0xFFF97316)),
    _PaymentMethod(
        type: 'Wallet',
        label: 'KartSeek Wallet',
        bank: 'Balance: ₹1,250',
        isDefault: false,
        icon: Icons.account_balance_wallet,
        color: AppTheme.successGreen),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('💳 Saved Payments',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _methods.length + 2,
        itemBuilder: (context, i) {
          if (i == _methods.length) {
            return _addCard(
                'Add Credit/Debit Card', Icons.credit_card_outlined);
          }
          if (i == _methods.length + 1) {
            return _addCard('Link UPI ID', Icons.qr_code);
          }
          final m = _methods[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: m.isDefault
                      ? AppTheme.marketplaceColor
                      : AppTheme.borderLight,
                  width: m.isDefault ? 2 : 1),
            ),
            child: Row(children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    color: m.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12)),
                child: Icon(m.icon, color: m.color, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Row(children: [
                      Text(m.label,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              fontFamily:
                                  m.type == 'Card' ? 'monospace' : null)),
                      if (m.isDefault) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: AppTheme.successGreen
                                  .withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4)),
                          child: const Text('DEFAULT',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.successGreen)),
                        ),
                      ],
                    ]),
                    const SizedBox(height: 2),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                            color: m.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4)),
                        child: Text(m.type,
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: m.color)),
                      ),
                      const SizedBox(width: 6),
                      Text(m.bank,
                          style: const TextStyle(
                              color: AppTheme.textMuted, fontSize: 12)),
                    ]),
                  ])),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert,
                    color: AppTheme.textMuted, size: 20),
                onSelected: (val) {
                  if (val == 'default') {
                    setState(() {
                      for (var x in _methods) {
                        x.isDefault = false;
                      }
                      m.isDefault = true;
                    });
                  }
                  if (val == 'remove') setState(() => _methods.remove(m));
                },
                itemBuilder: (_) => [
                  if (!m.isDefault)
                    const PopupMenuItem(
                        value: 'default', child: Text('Set as Default')),
                  const PopupMenuItem(
                      value: 'remove',
                      child:
                          Text('Remove', style: TextStyle(color: Colors.red))),
                ],
              ),
            ]),
          );
        },
      ),
    );
  }

  Widget _addCard(String label, IconData icon) => GestureDetector(
        onTap: () {},
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: const Color(0xFFC7D2FE), style: BorderStyle.solid),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, color: AppTheme.marketplaceColor, size: 22),
            const SizedBox(width: 10),
            Text(label,
                style: const TextStyle(
                    color: AppTheme.marketplaceColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
          ]),
        ),
      );
}

class _PaymentMethod {
  final String type, label, bank;
  bool isDefault;
  final IconData icon;
  final Color color;
  _PaymentMethod(
      {required this.type,
      required this.label,
      required this.bank,
      required this.isDefault,
      required this.icon,
      required this.color});
}
