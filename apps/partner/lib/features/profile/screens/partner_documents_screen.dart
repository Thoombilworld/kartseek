import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Partner Documents Screen
class PartnerDocumentsScreen extends StatelessWidget {
  const PartnerDocumentsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Documents'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(20), children: [
        _doc('National ID / Passport', 'id_proof', true, 'Approved'),
        _doc('Driving License', 'driving_license', true, 'Approved'),
        _doc('Vehicle Registration', 'vehicle_reg', true, 'Approved'),
        _doc('Vehicle Insurance', 'insurance', true, 'Approved'),
        _doc('Vehicle Photo', 'vehicle_photo', false, 'Not Uploaded'),
        _doc('Profile Photo', 'profile_photo', true, 'Approved'),
        _doc('Bank Details', 'bank', true, 'Verified'),
      ]),
    );
  }
  Widget _doc(String name, String type, bool uploaded, String status) {
    final ok = status == 'Approved' || status == 'Verified';
    return Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
      child: Row(children: [
        Container(width: 44, height: 44, decoration: BoxDecoration(color: (ok ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(ok ? Icons.check_circle : Icons.upload_file, size: 22, color: ok ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          Text(status, style: TextStyle(fontSize: 12, color: ok ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber)),
        ])),
        if (!uploaded) Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), decoration: BoxDecoration(color: PartnerTheme.primary, borderRadius: BorderRadius.circular(8)),
          child: const Text('Upload', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)))
        else const Icon(Icons.chevron_right, size: 20, color: PartnerTheme.textMuted),
      ]));
  }
}
