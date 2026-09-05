import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
/// Pickup confirmation — checklist + confirm pickup.
class PharmacyPickupConfirmScreen extends StatefulWidget {
  const PharmacyPickupConfirmScreen({super.key});
  @override State<PharmacyPickupConfirmScreen> createState() => _PharmacyPickupConfirmScreenState();
}
class _PharmacyPickupConfirmScreenState extends State<PharmacyPickupConfirmScreen> {
  final _checks = {'Items verified': false, 'Package sealed': false, 'Prescription attached': false, 'Receipt included': false};
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.grey.shade50,
    appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Pickup Confirmation', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Pickup Checklist', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)), const SizedBox(height: 12),
          ..._checks.entries.map((e) => CheckboxListTile(title: Text(e.key, style: const TextStyle(fontSize: 14)), value: e.value, onChanged: (v) => setState(() => _checks[e.key] = v!), activeColor: AppTheme.pharmacyColor, contentPadding: EdgeInsets.zero)),
        ])),
      const SizedBox(height: 16),
      Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12)), child: Row(children: [Icon(Icons.warning_amber, color: Colors.amber.shade700, size: 20), const SizedBox(width: 10),
        Expanded(child: Text('Ensure all Rx medicines are verified before pickup.', style: TextStyle(fontSize: 12, color: Colors.amber.shade800, height: 1.4)))])),
      const SizedBox(height: 24),
      SizedBox(height: 52, child: ElevatedButton(onPressed: _checks.values.every((v) => v) ? () => Navigator.pop(context) : null,
        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, disabledBackgroundColor: Colors.grey.shade300, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
        child: const Text('Confirm Pickup', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)))),
    ]),
  );
}
