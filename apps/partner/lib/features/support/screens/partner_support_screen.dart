import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Partner Support Screen
class PartnerSupportScreen extends StatelessWidget {
  const PartnerSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Support'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Help
            Container(
              padding: const EdgeInsets.all(20), decoration: BoxDecoration(gradient: PartnerTheme.primaryGradient, borderRadius: BorderRadius.circular(16)),
              child: const Row(children: [
                Icon(Icons.headset_mic, size: 32, color: Colors.white),
                SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Need Help?', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                  Text('We\'re here 24/7 to assist you', style: TextStyle(color: Colors.white70, fontSize: 13)),
                ])),
              ]),
            ),
            const SizedBox(height: 20),
            // Contact Options
            Row(children: [
              _contactBtn(Icons.phone, 'Call Us', PartnerTheme.onlineGreen),
              const SizedBox(width: 12),
              _contactBtn(Icons.chat, 'Live Chat', PartnerTheme.infoBlue),
              const SizedBox(width: 12),
              _contactBtn(Icons.email, 'Email', PartnerTheme.primary),
            ]),
            const SizedBox(height: 24),
            const Text('Report an Issue', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            _issueItem(context, Icons.person_outline, 'Customer Issue', 'Report a problem with a customer'),
            _issueItem(context, Icons.payments, 'Payment Issue', 'Payment not received or incorrect'),
            _issueItem(context, Icons.location_on, 'Location Issue', 'Wrong pickup/drop location'),
            _issueItem(context, Icons.directions_car, 'Vehicle Issue', 'Vehicle breakdown or accident'),
            _issueItem(context, Icons.local_shipping, 'Delivery Issue', 'Package damaged or lost'),
            _issueItem(context, Icons.security, 'Safety Concern', 'Report a safety incident'),
            const SizedBox(height: 24),
            const Text('Create Ticket', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            TextField(
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Describe your issue...',
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
              ),
            ),
            const SizedBox(height: 12),
            Row(children: [
              OutlinedButton.icon(onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); }, icon: const Icon(Icons.attach_file, size: 18), label: const Text('Attach File'),
                style: OutlinedButton.styleFrom(foregroundColor: PartnerTheme.textSecondary)),
              const Spacer(),
              ElevatedButton(onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ticket submitted successfully'))); },
                style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: const Text('Submit', style: TextStyle(color: Colors.white))),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _contactBtn(IconData icon, String label, Color color) => Expanded(
    child: Container(padding: const EdgeInsets.symmetric(vertical: 16), decoration: PartnerTheme.cardDecoration(),
      child: Column(children: [Icon(icon, size: 24, color: color), const SizedBox(height: 6), Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))])),
  );

  Widget _issueItem(BuildContext context, IconData icon, String title, String desc) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    child: ListTile(
      leading: Icon(icon, size: 22, color: PartnerTheme.textSecondary),
      title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      subtitle: Text(desc, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
      trailing: const Icon(Icons.chevron_right, size: 20, color: PartnerTheme.textMuted),
      tileColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onTap: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
    ),
  );
}
