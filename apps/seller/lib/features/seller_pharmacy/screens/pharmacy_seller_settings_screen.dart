import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
/// Seller pharmacy settings — notifications, auto-accept, delivery config.
class PharmacySellerSettingsScreen extends StatelessWidget {
  const PharmacySellerSettingsScreen({super.key});
  @override Widget build(BuildContext context) {
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Settings', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _switch('Online/Accepting Orders', true, Colors.green),
        _switch('Auto-accept Orders', false, AppTheme.pharmacyColor),
        _switch('Push Notifications', true, AppTheme.pharmacyColor),
        _switch('Sound Alerts for New Orders', true, AppTheme.pharmacyColor),
        _switch('24/7 Mode', false, AppTheme.pharmacyColor),
        const SizedBox(height: 16),
        _action('Change Password', Icons.lock_outline),
        _action('Bank Account Settings', Icons.account_balance),
        _action('Delivery Zone Settings', Icons.map_outlined),
        _action('License & Documents', Icons.description_outlined),
        const SizedBox(height: 16),
        _action('Support', Icons.headset_mic_outlined),
        _action('Terms of Service', Icons.article_outlined),
        _action('Logout', Icons.logout, color: Colors.red),
      ]),
    );
  }
  Widget _switch(String label, bool val, Color color) => Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
    child: Row(children: [Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)), const Spacer(), Switch(value: val, onChanged: (_) {}, activeThumbColor: color)]));
  Widget _action(String label, IconData icon, {Color? color}) => Container(margin: const EdgeInsets.only(bottom: 8), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
    child: ListTile(leading: Icon(icon, color: color ?? Colors.grey.shade600, size: 22), title: Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color ?? Colors.black87)), trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20)));
}
