import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Driver Documents Screen — View and manage KYC/onboarding documents.
///
/// Shows document compliance status, required documents list, upload capability,
/// and status tracking for each document (pending, approved, rejected).
/// For vendor-managed drivers, notes that documents are reviewed by both
/// vendor and Super Admin.
class DriverDocumentsScreen extends StatefulWidget {
  const DriverDocumentsScreen({super.key});
  @override
  State<DriverDocumentsScreen> createState() => _DriverDocumentsScreenState();
}

class _DriverDocumentsScreenState extends State<DriverDocumentsScreen> {
  // Mock document data — in production this comes from the API
  final List<_DocumentItem> _documents = [
    const _DocumentItem(type: 'driving_license', name: 'Driving License', status: DocumentStatus.approved, uploadedAt: '2025-03-15', expiresAt: '2027-03-15'),
    const _DocumentItem(type: 'vehicle_registration', name: 'Vehicle Registration (V5)', status: DocumentStatus.approved, uploadedAt: '2025-03-15', expiresAt: null),
    const _DocumentItem(type: 'vehicle_insurance', name: 'Vehicle Insurance', status: DocumentStatus.approved, uploadedAt: '2025-04-01', expiresAt: '2026-09-30'),
    const _DocumentItem(type: 'identity_proof', name: 'National ID / Passport', status: DocumentStatus.approved, uploadedAt: '2025-03-15', expiresAt: '2030-12-31'),
    const _DocumentItem(type: 'background_check', name: 'Background Check Certificate', status: DocumentStatus.pending, uploadedAt: '2026-06-10', expiresAt: null),
    const _DocumentItem(type: 'profile_photo', name: 'Profile Photo', status: DocumentStatus.approved, uploadedAt: '2025-03-15', expiresAt: null),
    const _DocumentItem(type: 'vehicle_photo', name: 'Vehicle Photos', status: DocumentStatus.rejected, uploadedAt: '2026-06-05', expiresAt: null, rejectionReason: 'Photo quality too low. Please upload a clear photo of the vehicle exterior.'),
    const _DocumentItem(type: 'medical_certificate', name: 'Medical Fitness Certificate', status: DocumentStatus.notUploaded, uploadedAt: null, expiresAt: null),
  ];

  @override
  Widget build(BuildContext context) {
    final approved = _documents.where((d) => d.status == DocumentStatus.approved).length;
    final total = _documents.length;
    final progress = (approved / total * 100).round();

    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20, color: PartnerTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('My Documents', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Compliance Progress
            Container(
              padding: const EdgeInsets.all(16),
              decoration: PartnerTheme.cardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Document Compliance', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: progress == 100
                              ? PartnerTheme.onlineGreen.withValues(alpha: 0.1)
                              : PartnerTheme.warningAmber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$progress% Complete',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: progress == 100 ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: approved / total,
                      minHeight: 6,
                      backgroundColor: PartnerTheme.border,
                      valueColor: AlwaysStoppedAnimation(
                        progress == 100 ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$approved of $total required documents approved',
                    style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Info banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PartnerTheme.infoBlue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: PartnerTheme.infoBlue.withValues(alpha: 0.2)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: PartnerTheme.infoBlue),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Documents are reviewed by the admin team. You\'ll be notified when they\'re approved.',
                      style: TextStyle(fontSize: 12, color: PartnerTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Document List
            const Text('Required Documents', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
            const SizedBox(height: 12),
            ..._documents.map(_documentCard),
          ],
        ),
      ),
    );
  }

  Widget _documentCard(_DocumentItem doc) {
    final statusConfig = _statusConfig(doc.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: statusConfig.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(statusConfig.icon, size: 20, color: statusConfig.color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doc.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    if (doc.uploadedAt != null)
                      Text('Uploaded: ${doc.uploadedAt}', style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
                    if (doc.expiresAt != null)
                      Text('Expires: ${doc.expiresAt}', style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusConfig.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(statusConfig.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusConfig.color)),
              ),
            ],
          ),
          // Rejection reason
          if (doc.status == DocumentStatus.rejected && doc.rejectionReason != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PartnerTheme.offlineRed.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, size: 16, color: PartnerTheme.offlineRed),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(doc.rejectionReason!, style: const TextStyle(fontSize: 12, color: PartnerTheme.offlineRed)),
                  ),
                ],
              ),
            ),
          ],
          // Upload / Resubmit button
          if (doc.status == DocumentStatus.notUploaded || doc.status == DocumentStatus.rejected) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _pickDocument(context, doc),
                icon: Icon(doc.status == DocumentStatus.rejected ? Icons.refresh : Icons.upload_file, size: 16),
                label: Text(doc.status == DocumentStatus.rejected ? 'Resubmit' : 'Upload'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: PartnerTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _pickDocument(BuildContext context, _DocumentItem doc) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36, height: 4,
                decoration: BoxDecoration(color: PartnerTheme.border, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 16),
              Text('Upload ${doc.name}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: PartnerTheme.primary),
                title: const Text('Take Photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: PartnerTheme.primary),
                title: const Text('Choose from Gallery'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );

    if (source == null || !mounted) return;

    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 85);

    if (picked != null && mounted) {
      // In production: upload picked.path to API, then refresh document list
      setState(() {
        final idx = _documents.indexWhere((d) => d.type == doc.type);
        if (idx != -1) {
          _documents[idx] = _DocumentItem(
            type: doc.type,
            name: doc.name,
            status: DocumentStatus.pending,
            uploadedAt: DateTime.now().toString().split(' ')[0],
            expiresAt: doc.expiresAt,
          );
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(this.context).showSnackBar(
          SnackBar(
            content: Text('${doc.name} uploaded — under review'),
            backgroundColor: PartnerTheme.primary,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  _StatusConfig _statusConfig(DocumentStatus status) {
    switch (status) {
      case DocumentStatus.approved:
        return const _StatusConfig('Approved', PartnerTheme.onlineGreen, Icons.check_circle);
      case DocumentStatus.pending:
        return const _StatusConfig('Under Review', PartnerTheme.infoBlue, Icons.schedule);
      case DocumentStatus.rejected:
        return const _StatusConfig('Rejected', PartnerTheme.offlineRed, Icons.cancel);
      case DocumentStatus.notUploaded:
        return const _StatusConfig('Required', PartnerTheme.warningAmber, Icons.upload_file);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  final IconData icon;
  const _StatusConfig(this.label, this.color, this.icon);
}

enum DocumentStatus { approved, pending, rejected, notUploaded }

class _DocumentItem {
  final String type;
  final String name;
  final DocumentStatus status;
  final String? uploadedAt;
  final String? expiresAt;
  final String? rejectionReason;
  const _DocumentItem({
    required this.type, required this.name, required this.status,
    this.uploadedAt, this.expiresAt, this.rejectionReason,
  });
}
