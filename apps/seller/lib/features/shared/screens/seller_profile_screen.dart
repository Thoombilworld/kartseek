import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

class SellerProfileScreen extends StatelessWidget {
  const SellerProfileScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile'), backgroundColor: SellerTheme.primary, foregroundColor: Colors.white),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Column(children: [
              Container(
                width: 90, height: 90,
                decoration: const BoxDecoration(color: SellerTheme.primaryLight, shape: BoxShape.circle),
                child: const Icon(Icons.person, size: 50, color: SellerTheme.primary),
              ),
              const SizedBox(height: 12),
              const Text('Rajesh Kumar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Text('seller@kartseek.com', style: TextStyle(color: SellerTheme.textSecondary)),
            ]),
          ),
          const SizedBox(height: 24),
          _tile(context, Icons.store, 'Store Settings', 'Manage store info'),
          _tile(context, Icons.verified_user, 'KYC / Verification', 'View KYC status'),
          _tile(context, Icons.account_balance_wallet, 'Payouts', 'Withdraw earnings', onTap: () => Navigator.pushNamed(context, SellerRouter.earnings)),
          _tile(context, Icons.headset_mic, 'Support', 'Get help', onTap: () => Navigator.pushNamed(context, SellerRouter.support)),
          _tile(context, Icons.logout, 'Sign Out', '', isDestructive: true),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String title, String subtitle, {VoidCallback? onTap, bool isDestructive = false}) {
    final color = isDestructive ? SellerTheme.errorRed : SellerTheme.primary;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: SellerTheme.cardDecoration(),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: ListTile(
          leading: Icon(icon, color: color),
          title: Text(title, style: TextStyle(color: isDestructive ? SellerTheme.errorRed : SellerTheme.textPrimary, fontWeight: FontWeight.w500)),
          subtitle: subtitle.isNotEmpty ? Text(subtitle, style: const TextStyle(fontSize: 12, color: SellerTheme.textMuted)) : null,
          trailing: const Icon(Icons.chevron_right, color: SellerTheme.textMuted),
          onTap: onTap,
        ),
      ),
    );
  }
}
