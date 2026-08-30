import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Vehicle Details Screen
class PartnerVehicleDetailsScreen extends StatelessWidget {
  const PartnerVehicleDetailsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Vehicle Details'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SingleChildScrollView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(20),
        child: Column(children: [
          Container(padding: const EdgeInsets.all(20), decoration: PartnerTheme.cardDecoration(),
            child: Column(children: [
              Container(width: 80, height: 80, decoration: BoxDecoration(color: PartnerTheme.taxiColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
                child: const Icon(Icons.directions_car, size: 40, color: PartnerTheme.taxiColor)),
              const SizedBox(height: 12),
              const Text('Toyota Vitz', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const Text('KBZ 456Y', style: TextStyle(fontSize: 16, color: PartnerTheme.textMuted, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                child: const Text('Approved', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: PartnerTheme.onlineGreen))),
            ])),
          const SizedBox(height: 16),
          Container(padding: const EdgeInsets.all(16), decoration: PartnerTheme.cardDecoration(),
            child: Column(children: [
              _row('Make', 'Toyota'), _row('Model', 'Vitz'), _row('Year', '2019'),
              _row('Color', 'White'), _row('Category', 'Economy'),
              _row('Seats', '4'), _row('Fuel Type', 'Petrol'),
              _row('Registration', 'KBZ 456Y'),
            ])),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 54, child: ElevatedButton(
            onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
            style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Update Vehicle', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
        ])),
    );
  }
  Widget _row(String label, String value) => Padding(padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(fontSize: 14, color: PartnerTheme.textSecondary)),
      Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
    ]));
}
