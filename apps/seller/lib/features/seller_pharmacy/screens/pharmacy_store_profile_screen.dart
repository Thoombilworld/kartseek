import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
/// Store profile — pharmacy details, license, hours, delivery zones.
class PharmacyStoreProfileScreen extends StatelessWidget {
  const PharmacyStoreProfileScreen({super.key});
  @override Widget build(BuildContext context) {
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Store Profile', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [TextButton(onPressed: () {}, child: const Text('Edit', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.pharmacyColor)))]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _section('Store Details', [_row('Name', 'HealthPlus Pharmacy'), _row('Phone', '+254 712 345 678'), _row('Email', 'health@plus.co.ke'), _row('Address', '123 Main Ave, Westlands')]),
        _section('License & Compliance', [_row('License No.', 'PH-KE-2024-1234'), _row('Expiry', 'Dec 31, 2026'), _row('Status', 'Active ✅')]),
        _section('Operating Hours', [_row('Mon-Sat', '8:00 AM - 10:00 PM'), _row('Sunday', '9:00 AM - 6:00 PM'), _row('24/7 Mode', 'Disabled')]),
        _section('Delivery', [_row('Radius', '8 km'), _row('Avg Time', '25 min'), _row('Min Order', 'KES 200')]),
      ]),
    );
  }
  Widget _section(String title, List<Widget> children) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), const SizedBox(height: 10), ...children])));
  Widget _row(String l, String v) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(children: [Text(l, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)), const Spacer(), Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))]));
}
