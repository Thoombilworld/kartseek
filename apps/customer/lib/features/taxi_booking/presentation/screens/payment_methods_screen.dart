import 'package:flutter/material.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Payment options',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Payment method',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _PaymentTile(
            icon: Icons.money,
            title: 'Cash',
            isSelected: true,
            onTap: () {
              Navigator.of(context).pop('Cash');
            },
          ),
          const Divider(),
          _PaymentTile(
            icon: Icons.credit_card,
            title: 'Credit or Debit card',
            onTap: () {
              // Add card flow
            },
          ),
          const Divider(),
          _PaymentTile(
            icon: Icons.account_balance_wallet,
            title: 'M-PESA / Mobile Money',
            onTap: () {
              // Add mobile money flow
            },
          ),
          const Divider(),
          _PaymentTile(
            icon: Icons.qr_code,
            title: 'UPI',
            onTap: () {
              // Add UPI flow
            },
          ),
          const SizedBox(height: 32),
          const Text(
            'Vouchers',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.local_offer, color: Colors.black),
            title: const Text('Add voucher code', style: TextStyle(fontWeight: FontWeight.w600)),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentTile({
    required this.icon,
    required this.title,
    this.isSelected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: Colors.black87),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      trailing: isSelected ? const Icon(Icons.check, color: Colors.green) : null,
      onTap: onTap,
    );
  }
}
