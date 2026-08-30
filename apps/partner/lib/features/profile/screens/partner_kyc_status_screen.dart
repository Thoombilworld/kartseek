import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// KYC Status Screen — Shows document upload status
class PartnerKycStatusScreen extends StatelessWidget {
  const PartnerKycStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('KYC Status'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall Status
            Container(
              width: double.infinity, padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16), border: Border.all(color: PartnerTheme.onlineGreen.withValues(alpha: 0.3))),
              child: const Row(children: [
                Icon(Icons.verified, size: 32, color: PartnerTheme.onlineGreen),
                SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('KYC Approved', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: PartnerTheme.onlineGreen)),
                  Text('All documents verified', style: TextStyle(fontSize: 13, color: PartnerTheme.textMuted)),
                ])),
              ]),
            ),
            const SizedBox(height: 24),
            const Text('Documents', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            _docCard('National ID / Passport', 'Approved', true, false),
            _docCard('Driving License', 'Approved', true, false, expiry: 'Expires: Jun 30, 2027'),
            _docCard('Vehicle Registration', 'Approved', true, false),
            _docCard('Vehicle Insurance', 'Approved', true, false, expiry: 'Expires: Dec 31, 2026'),
            _docCard('Vehicle Photo', 'Pending Upload', false, true),
            _docCard('Profile Photo', 'Approved', true, false),
          ],
        ),
      ),
    );
  }

  Widget _docCard(String name, String status, bool uploaded, bool required, {String? expiry}) {
    final isApproved = status.contains('Approved');
    final isPending = status.contains('Pending');
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
      decoration: PartnerTheme.cardDecoration(),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: (isApproved ? PartnerTheme.onlineGreen : isPending ? PartnerTheme.warningAmber : PartnerTheme.offlineRed).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            isApproved ? Icons.check_circle : isPending ? Icons.upload_file : Icons.error,
            size: 22, color: isApproved ? PartnerTheme.onlineGreen : isPending ? PartnerTheme.warningAmber : PartnerTheme.offlineRed,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(status, style: TextStyle(fontSize: 12, color: isApproved ? PartnerTheme.onlineGreen : isPending ? PartnerTheme.warningAmber : PartnerTheme.offlineRed)),
          if (expiry != null) Text(expiry, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
        ])),
        if (!uploaded) Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: PartnerTheme.primary, borderRadius: BorderRadius.circular(8)),
          child: const Text('Upload', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}
