import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Trip Payment Screen — Collect or confirm payment after trip ends
class TripPaymentScreen extends StatelessWidget {
  const TripPaymentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Collect Payment'), automaticallyImplyLeading: false),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: const Icon(Icons.payments_outlined, size: 40, color: PartnerTheme.onlineGreen),
              ),
              const SizedBox(height: 16),
              const Text('Trip Completed!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('Collect payment from customer', style: TextStyle(fontSize: 14, color: PartnerTheme.textMuted)),
              const SizedBox(height: 32),
              // Fare Breakdown
              Container(
                padding: const EdgeInsets.all(20),
                decoration: PartnerTheme.cardDecoration(),
                child: Column(
                  children: [
                    _fareRow('Base Fare', '${RegionService.instance.currentCountry.currencySymbol} 150'),
                    _fareRow('Distance (18.5 km)', '${RegionService.instance.currentCountry.currencySymbol} 1,480'),
                    _fareRow('Waiting Time', '${RegionService.instance.currentCountry.currencySymbol} 120'),
                    _fareRow('Surge (1.2x)', '${RegionService.instance.currentCountry.currencySymbol} 100'),
                    const Divider(height: 24),
                    _fareRow('Total Fare', '${RegionService.instance.currentCountry.currencySymbol} 1,850', isBold: true),
                    const SizedBox(height: 8),
                    _fareRow('Commission (15%)', '- ${RegionService.instance.currentCountry.currencySymbol} 278', isDeduction: true),
                    const Divider(height: 24),
                    _fareRow('Your Earnings', '${RegionService.instance.currentCountry.currencySymbol} 1,572', isBold: true, isEarning: true),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Payment Method
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFED7AA))),
                child: const Row(children: [
                  Icon(Icons.payments, color: PartnerTheme.warningAmber, size: 22),
                  SizedBox(width: 10),
                  Text('Payment Method: ', style: TextStyle(fontSize: 14, color: PartnerTheme.textSecondary)),
                  Text('CASH', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: PartnerTheme.warningAmber)),
                ]),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 54,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushReplacementNamed(context, PartnerRouter.partnerTripCompleted),
                  style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.onlineGreen, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: Text('Cash Collected — ${RegionService.instance.currentCountry.currencySymbol} 1,850', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pushReplacementNamed(context, PartnerRouter.partnerTripCompleted),
                child: const Text('Customer paid via M-Pesa', style: TextStyle(color: PartnerTheme.primary, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fareRow(String label, String amount, {bool isBold = false, bool isDeduction = false, bool isEarning = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isBold ? 15 : 14, fontWeight: isBold ? FontWeight.w700 : FontWeight.w500, color: PartnerTheme.textSecondary)),
          Text(amount, style: TextStyle(
            fontSize: isBold ? 16 : 14,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
            color: isDeduction ? PartnerTheme.offlineRed : isEarning ? PartnerTheme.onlineGreen : PartnerTheme.textPrimary,
          )),
        ],
      ),
    );
  }
}
