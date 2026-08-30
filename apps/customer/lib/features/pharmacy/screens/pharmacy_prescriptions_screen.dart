import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';

/// My Prescriptions — upload history, verification status badges.
class PharmacyPrescriptionsScreen extends StatefulWidget {
  const PharmacyPrescriptionsScreen({super.key});
  @override State<PharmacyPrescriptionsScreen> createState() => _PharmacyPrescriptionsScreenState();
}

class _PharmacyPrescriptionsScreenState extends State<PharmacyPrescriptionsScreen> {
  @override
  void initState() { super.initState(); context.read<PharmacyBloc>().add(const LoadMyPrescriptions()); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('My Prescriptions', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.upload_file, size: 18),
            label: const Text('Upload', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            style: TextButton.styleFrom(foregroundColor: AppTheme.pharmacyColor),
            onPressed: () => Navigator.pushNamed(context, '/pharmacy/prescription'),
          ),
        ],
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          if (state.prescriptions.isEmpty) {
            return Center(child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.description_outlined, size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                Text('No prescriptions yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                const SizedBox(height: 8),
                Text('Upload your prescription to order Rx medicines', style: TextStyle(fontSize: 13, color: Colors.grey.shade400)),
              ],
            ));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: state.prescriptions.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final rx = state.prescriptions[i];
              final statusCfg = <String, Map<String, dynamic>>{
                'VERIFIED_APPROVED': {'label': 'Approved', 'color': Colors.green, 'icon': Icons.check_circle},
                'PENDING_VERIFICATION': {'label': 'Pending', 'color': Colors.amber, 'icon': Icons.hourglass_top},
                'VERIFIED_REJECTED': {'label': 'Rejected', 'color': Colors.red, 'icon': Icons.cancel},
              };
              final cfg = statusCfg[rx.status] ?? statusCfg['PENDING_VERIFICATION']!;
              return GestureDetector(
                onTap: () {
                  context.read<PharmacyBloc>().add(LoadPrescriptionDetail(rx.id));
                  Navigator.pushNamed(context, '/pharmacy/prescription-detail', arguments: rx.id);
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                  child: Row(
                    children: [
                      Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(color: Colors.cyan.shade50, borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.description, color: Colors.cyan, size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(rx.patientName ?? 'Prescription', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text('${rx.extractedMedicines.length} medicines • ${_timeAgo(rx.createdAt)}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (cfg['color'] as Color).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(cfg['icon'] as IconData, size: 14, color: cfg['color'] as Color),
                          const SizedBox(width: 4),
                          Text(cfg['label'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: cfg['color'] as Color)),
                        ]),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
