import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class SellerSupportScreen extends StatelessWidget {
  const SellerSupportScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Seller Support'), backgroundColor: SellerTheme.primary, foregroundColor: Colors.white),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _card('📞', 'Call Support', 'Mon-Fri 8am-8pm EAT', () {}),
          _card('💬', 'Live Chat', 'Average response: < 2 min', () {}),
          _card('📧', 'Email Support', 'seller-support@kartseek.com', () {}),
          _card('📚', 'Help Centre', 'Browse FAQs and guides', () {}),
          _card('🐛', 'Report a Bug', 'Help us improve the app', () {}),
        ],
      ),
    );
  }

  Widget _card(String emoji, String title, String subtitle, VoidCallback onTap) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: SellerTheme.elevatedCard(),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: ListTile(
          leading: Text(emoji, style: const TextStyle(fontSize: 28)),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(subtitle, style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      ),
    );
  }
}
