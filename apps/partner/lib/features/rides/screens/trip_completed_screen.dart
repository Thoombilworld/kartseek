import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Trip Completed Screen — Summary after finishing a taxi ride
class TripCompletedScreen extends StatelessWidget {
  const TripCompletedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              Container(
                width: 90, height: 90,
                decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: const Icon(Icons.check_circle, size: 50, color: PartnerTheme.onlineGreen),
              ),
              const SizedBox(height: 16),
              const Text('Ride Complete!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text('RIDE-4521 • Cash Payment', style: TextStyle(fontSize: 14, color: PartnerTheme.textMuted)),
              const SizedBox(height: 32),
              // Earnings
              Container(
                width: double.infinity, padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(gradient: PartnerTheme.earningsGradient, borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  const Text('You Earned', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('${RegionService.instance.currentCountry.currencySymbol} 1,572', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900)),
                ]),
              ),
              const SizedBox(height: 20),
              // Summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: PartnerTheme.cardDecoration(),
                child: Column(children: [
                  _row('Customer', 'Ahmed K.'),
                  _row('Pickup', 'City Center Mall'),
                  _row('Drop', 'International Airport'),
                  _row('Distance', '18.5 km'),
                  _row('Duration', '32 min'),
                  _row('Total Fare', '${RegionService.instance.currentCountry.currencySymbol} 1,850'),
                  _row('Commission', '- ${RegionService.instance.currentCountry.currencySymbol} 278'),
                  _row('Cash Collected', '${RegionService.instance.currentCountry.currencySymbol} 1,850'),
                ]),
              ),
              const SizedBox(height: 24),
              // Rating
              Container(
                padding: const EdgeInsets.all(16),
                decoration: PartnerTheme.cardDecoration(),
                child: Column(children: [
                  const Text('Rate your customer', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (i) => GestureDetector(
                      onTap: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(i < 4 ? Icons.star : Icons.star_border, size: 36, color: Colors.amber),
                      ),
                    )),
                  ),
                ]),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 54,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(context, PartnerRouter.partnerDashboard, (r) => false),
                  style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: const Text('Back to Dashboard', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ],
          ),
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
