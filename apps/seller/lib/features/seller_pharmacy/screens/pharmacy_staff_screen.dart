import 'package:flutter/material.dart';
/// Staff management — list, add, remove team members.
class PharmacyStaffScreen extends StatelessWidget {
  const PharmacyStaffScreen({super.key});
  @override Widget build(BuildContext context) {
    final staff = [
      {'name': 'Dr. Sarah Kimani', 'role': 'Pharmacist', 'status': 'Active', 'since': 'Jan 2024'},
      {'name': 'James Otieno', 'role': 'Dispenser', 'status': 'Active', 'since': 'Mar 2024'},
      {'name': 'Grace Wanjiru', 'role': 'Cashier', 'status': 'Active', 'since': 'Jun 2024'},
      {'name': 'Peter Mwangi', 'role': 'Delivery', 'status': 'Inactive', 'since': 'Sep 2023'},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Staff', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [IconButton(icon: const Icon(Icons.person_add, color: Colors.blue), onPressed: () {})]),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: staff.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) { final s = staff[i]; final active = s['status'] == 'Active';
          return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              CircleAvatar(backgroundColor: active ? Colors.green.shade50 : Colors.grey.shade100, child: Text(s['name']![0], style: TextStyle(fontWeight: FontWeight.w700, color: active ? Colors.green : Colors.grey))),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s['name']!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                Text('${s['role']} • Since ${s['since']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ])),
              Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: (active ? Colors.green : Colors.grey).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                child: Text(s['status']!, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: active ? Colors.green : Colors.grey))),
            ]),
          );
        }),
    );
  }
}
