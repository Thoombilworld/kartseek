import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/models/country_config.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

class SellerNotificationsScreen extends StatelessWidget {
  const SellerNotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications'), backgroundColor: SellerTheme.primary, foregroundColor: Colors.white),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 8,
        itemBuilder: (_, i) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: SellerTheme.cardDecoration(),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: SellerTheme.primaryLight, borderRadius: BorderRadius.circular(10)),
              child: Icon([Icons.shopping_cart, Icons.inventory_2, Icons.star_border, Icons.payment][i % 4], color: SellerTheme.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(['New Order Received', 'Low Stock Alert', 'Review Received', 'Payout Processed'][i % 4], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 2),
              Text(['ORD-78${i + 100} placed by a customer', 'Item stock dropped below 5', '5-star review from a customer', '${CountryConfig.forCode(RegionService.instance.currentCountry.code).currencySymbol} 12,500 payout sent'][i % 4], style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
            ])),
            Text('${i + 1}h ago', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
          ]),
        ),
      ),
    );
  }
}
