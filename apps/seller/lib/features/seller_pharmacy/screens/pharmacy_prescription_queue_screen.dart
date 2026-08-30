import 'package:flutter/material.dart';

/// Prescription queue — verify/approve/reject incoming prescriptions.
class PharmacyPrescriptionQueueScreen extends StatelessWidget {
  const PharmacyPrescriptionQueueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final queue = [
      {'id': 'RX-001', 'patient': 'John Doe', 'age': 34, 'medicines': 2, 'status': 'PENDING', 'time': '5 min ago'},
      {'id': 'RX-002', 'patient': 'Sarah K.', 'age': 28, 'medicines': 3, 'status': 'PENDING', 'time': '15 min ago'},
      {'id': 'RX-003', 'patient': 'Amit G.', 'age': 45, 'medicines': 1, 'status': 'APPROVED', 'time': '1 hr ago'},
      {'id': 'RX-004', 'patient': 'Priya S.', 'age': 62, 'medicines': 4, 'status': 'REJECTED', 'time': '2 hr ago'},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Prescription Queue', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [Container(margin: const EdgeInsets.only(right: 12), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(20)),
          child: Text('${queue.where((q) => q['status'] == 'PENDING').length} Pending', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.red.shade700)))]),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: queue.length, separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final q = queue[i];
          final isPending = q['status'] == 'PENDING';
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: isPending ? Colors.amber.shade50 : Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: isPending ? Colors.amber.shade200 : Colors.grey.shade200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Text('${q['id']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), const Spacer(),
                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: (q['status'] == 'APPROVED' ? Colors.green : q['status'] == 'REJECTED' ? Colors.red : Colors.amber).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                  child: Text('${q['status']}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: q['status'] == 'APPROVED' ? Colors.green : q['status'] == 'REJECTED' ? Colors.red : Colors.amber.shade700)))]),
              const SizedBox(height: 8),
              Text('${q['patient']} • Age ${q['age']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              Text('${q['medicines']} medicines • ${q['time']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              if (isPending) ...[const SizedBox(height: 12), Row(children: [
                Expanded(child: SizedBox(height: 36, child: ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))), child: const Text('Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))))),
                const SizedBox(width: 8),
                Expanded(child: SizedBox(height: 36, child: OutlinedButton(onPressed: () {}, style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))), child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700))))),
              ])],
            ]),
          );
        },
      ),
    );
  }
}
