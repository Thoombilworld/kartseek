import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Prescription detail — image, extracted medicines, pharmacist notes, status.
class PharmacyPrescriptionDetailScreen extends StatelessWidget {
  final String prescriptionId;
  const PharmacyPrescriptionDetailScreen({super.key, required this.prescriptionId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Prescription Detail', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          final rx = state.prescriptionDetail ?? PharmacyMockData.prescriptions.first;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Image placeholder
              Container(
                height: 240,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200, borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.image_outlined, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text('Prescription Image', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                  ],
                )),
              ),
              const SizedBox(height: 16),
              // Status card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        const Spacer(),
                        _statusBadge(rx.status),
                      ],
                    ),
                    if (rx.patientName != null) ...[const SizedBox(height: 12), _infoRow('Patient', rx.patientName!)],
                    if (rx.patientAge != null) ...[const SizedBox(height: 8), _infoRow('Age', '${rx.patientAge} years')],
                    const SizedBox(height: 8),
                    _infoRow('Uploaded', _formatDate(rx.createdAt)),
                    if (rx.verifiedAt != null) ...[const SizedBox(height: 8), _infoRow('Verified', _formatDate(rx.verifiedAt!))],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Extracted medicines
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Extracted Medicines', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        const Spacer(),
                        Text('${rx.extractedMedicines.length} items', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...rx.extractedMedicines.map((m) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppTheme.pharmacyColor, shape: BoxShape.circle)),
                          const SizedBox(width: 10),
                          Expanded(child: Text(m, style: const TextStyle(fontSize: 13))),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
              // Pharmacist notes
              if (rx.pharmacistNotes != null || rx.rejectionReason != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: rx.isRejected ? Colors.red.shade50 : Colors.green.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: rx.isRejected ? Colors.red.shade200 : Colors.green.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(rx.isRejected ? 'Rejection Reason' : 'Pharmacist Notes',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: rx.isRejected ? Colors.red.shade800 : Colors.green.shade800)),
                      const SizedBox(height: 8),
                      Text(rx.rejectionReason ?? rx.pharmacistNotes ?? '',
                        style: TextStyle(fontSize: 13, color: rx.isRejected ? Colors.red.shade700 : Colors.green.shade700, height: 1.4)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              // Re-upload if rejected
              if (rx.isRejected)
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.upload_file, size: 18),
                    label: const Text('Re-upload Prescription'),
                    onPressed: () => Navigator.pushNamed(context, '/pharmacy/prescription'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _statusBadge(String status) {
    final cfg = <String, Map<String, dynamic>>{
      'VERIFIED_APPROVED': {'label': 'Approved', 'color': Colors.green},
      'PENDING_VERIFICATION': {'label': 'Pending Verification', 'color': Colors.amber},
      'VERIFIED_REJECTED': {'label': 'Rejected', 'color': Colors.red},
    };
    final c = cfg[status] ?? cfg['PENDING_VERIFICATION']!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: (c['color'] as Color).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(c['label'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: c['color'] as Color)),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
