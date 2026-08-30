import 'package:flutter/material.dart';
/// Pharmacy delivery issue report.
class PharmacyDeliveryIssueScreen extends StatefulWidget {
  const PharmacyDeliveryIssueScreen({super.key});
  @override State<PharmacyDeliveryIssueScreen> createState() => _PharmacyDeliveryIssueScreenState();
}
class _PharmacyDeliveryIssueScreenState extends State<PharmacyDeliveryIssueScreen> {
  String? _issue;
  final _issues = ['Customer not available', 'Wrong address', 'Address not found', 'Customer rejected order', 'Package damaged', 'Cold chain issue', 'Other'];
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.grey.shade50,
    appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Report Issue', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      ..._issues.map((issue) => Padding(padding: const EdgeInsets.only(bottom: 8), child: GestureDetector(onTap: () => setState(() => _issue = issue),
        child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: _issue == issue ? Colors.red.withValues(alpha: 0.06) : Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: _issue == issue ? Colors.red : Colors.grey.shade200)),
          child: Row(children: [Icon(_issue == issue ? Icons.radio_button_checked : Icons.radio_button_off, color: _issue == issue ? Colors.red : Colors.grey.shade400, size: 20), const SizedBox(width: 12),
            Text(issue, style: TextStyle(fontSize: 14, fontWeight: _issue == issue ? FontWeight.w600 : FontWeight.w400))]))))),
      const SizedBox(height: 16),
      TextField(maxLines: 3, decoration: InputDecoration(hintText: 'Additional details...', hintStyle: TextStyle(color: Colors.grey.shade400), filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)))),
      const SizedBox(height: 24),
      SizedBox(height: 52, child: ElevatedButton(onPressed: _issue != null ? () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Issue reported'))); } : null,
        style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white, disabledBackgroundColor: Colors.grey.shade300, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
        child: const Text('Submit Report', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)))),
    ]),
  );
}
