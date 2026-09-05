import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Delivery Completed Screen
class DeliveryCompletedScreen extends StatelessWidget {
  const DeliveryCompletedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const SizedBox(height: 24),
            Container(width: 90, height: 90, decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle, size: 50, color: PartnerTheme.onlineGreen)),
            const SizedBox(height: 16),
            const Text('Delivery Complete!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            const Text('DEL-782 • COD Payment', style: TextStyle(fontSize: 14, color: PartnerTheme.textMuted)),
            const SizedBox(height: 32),
            Container(width: double.infinity, padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(gradient: PartnerTheme.earningsGradient, borderRadius: BorderRadius.circular(16)),
              child: Column(children: [const Text('You Earned', style: TextStyle(color: Colors.white70, fontSize: 13)), const SizedBox(height: 4), Text('${RegionService.instance.currentCountry.currencySymbol} 120', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900))])),
            const SizedBox(height: 20),
            Container(padding: const EdgeInsets.all(16), decoration: PartnerTheme.cardDecoration(),
              child: Column(children: [
                _row('Customer', 'Mary Njeri'), _row('Seller', 'FreshMart Supermarket'),
                _row('Pickup', 'FreshMart, City Center'), _row('Drop', '23 Riverside Drive'),
                _row('Distance', '3.2 km'), _row('Order Amount', '${RegionService.instance.currentCountry.currencySymbol} 2,450'),
                _row('Delivery Fee', '${RegionService.instance.currentCountry.currencySymbol} 150'), _row('Commission', '- ${RegionService.instance.currentCountry.currencySymbol} 30'),
                _row('COD Collected', '${RegionService.instance.currentCountry.currencySymbol} 2,450'),
              ])),
            const SizedBox(height: 24),
            Container(padding: const EdgeInsets.all(16), decoration: PartnerTheme.cardDecoration(),
              child: Column(children: [
                const Text('Rate your experience', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(i < 5 ? Icons.star : Icons.star_border, size: 36, color: Colors.amber),
                ))),
              ])),
            const SizedBox(height: 32),
            SizedBox(width: double.infinity, height: 54,
              child: ElevatedButton(onPressed: () => Navigator.pushNamedAndRemoveUntil(context, PartnerRouter.partnerDashboard, (r) => false),
                style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.deliveryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                child: const Text('Back to Dashboard', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
          ]),
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(fontSize: 14, color: PartnerTheme.textSecondary)),
      Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
    ]),
  );
}
