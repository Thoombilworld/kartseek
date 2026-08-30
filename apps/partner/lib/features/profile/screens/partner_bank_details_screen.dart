import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Bank Details Screen
class PartnerBankDetailsScreen extends StatelessWidget {
  const PartnerBankDetailsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Bank Details'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SingleChildScrollView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: const Row(children: [Icon(Icons.verified, color: PartnerTheme.onlineGreen, size: 20), SizedBox(width: 8), Text('Bank details verified', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.onlineGreen))])),
          const SizedBox(height: 20),
          _field('Account Holder', 'Partner Driver', Icons.person_outline),
          _field('Bank Name', 'Primary Bank', Icons.account_balance),
          _field('Account Number', '****4567', Icons.credit_card),
          _field('Branch', '${RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity} Branch', Icons.location_city),
          _field('Mobile Pay', '${RegionService.instance.currentCountry.callingCode} XXXXXXXXX', Icons.phone_android),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 54, child: ElevatedButton(
            onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bank details updated'))); },
            style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Update Bank Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
        ])),
    );
  }
  Widget _field(String label, String value, IconData icon) => Padding(padding: const EdgeInsets.only(bottom: 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary)), const SizedBox(height: 6),
      TextFormField(initialValue: value, decoration: InputDecoration(prefixIcon: Icon(icon, size: 20, color: PartnerTheme.textMuted), filled: true, fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)))),
    ]));
}
