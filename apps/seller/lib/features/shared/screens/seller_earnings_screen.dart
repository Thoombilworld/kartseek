import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/models/country_config.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

class SellerEarningsScreen extends StatelessWidget {
  const SellerEarningsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings & Payouts'), backgroundColor: SellerTheme.primary, foregroundColor: Colors.white),
      body: Column(children: [
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: SellerTheme.gradientCard(SellerTheme.earningsGradient),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Available Balance', style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 4),
            Text('${CountryConfig.forCode(RegionService.instance.currentCountry.code).currencySymbol} 142,500', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: SellerTheme.successGreen),
              child: const Text('Request Payout', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ]),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: 5,
            itemBuilder: (_, i) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: SellerTheme.cardDecoration(),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('PAY-${1000 + i}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(['Jun 15', 'Jun 10', 'Jun 5', 'May 30', 'May 25'][i], style: const TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
                ]),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('${CountryConfig.forCode(RegionService.instance.currentCountry.code).currencySymbol} ${[125000, 98000, 142000, 87000, 110000][i] ~/ 1000},${[125000, 98000, 142000, 87000, 110000][i] % 1000}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(i == 0 ? 'PENDING' : 'COMPLETED', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: i == 0 ? SellerTheme.warningAmber : SellerTheme.successGreen)),
                ]),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
