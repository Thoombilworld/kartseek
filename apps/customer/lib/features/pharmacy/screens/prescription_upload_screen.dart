// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/widgets/camera_capture_screen.dart';

class PrescriptionUploadScreen extends StatefulWidget {
  const PrescriptionUploadScreen({super.key});

  @override
  State<PrescriptionUploadScreen> createState() =>
      _PrescriptionUploadScreenState();
}

class _PrescriptionUploadScreenState extends State<PrescriptionUploadScreen> {
  String _selectedPatient = 'Myself';
  bool _hasUploadedFile = false;
  // _capturedPath is stored for later use when submitting the prescription to the API
  // ignore: unused_field
  String? _capturedPath;

  void _simulateUpload([String? path]) {
    setState(() {
      _hasUploadedFile = true;
      _capturedPath = path;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Prescription securely encrypted and uploaded!',
            style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: Colors.black87,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Future<void> _openCamera() async {
    final path = await Navigator.push<String>(context, MaterialPageRoute(
      builder: (_) => const CameraCaptureScreen(
        title: 'Scan Prescription',
        accentColor: AppTheme.pharmacyColor,
        filePrefix: 'prescription',
        overlayHint: 'Align your prescription within the frame',
      ),
    ));
    if (path != null && mounted) _simulateUpload(path);
  }

  Future<void> _openGallery() async {
    try {
      final picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        imageQuality: 90,
      );
      if (image != null && mounted) _simulateUpload(image.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gallery error: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        surfaceTintColor: Colors.white,
        centerTitle: true,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: const Icon(Icons.arrow_back_ios_new,
              color: Colors.black87, size: 20),
        ),
        title: const Text(
          'Upload Prescription',
          style: TextStyle(
              color: Colors.black87,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Privacy Notice
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.2)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14)),
                    child: const Icon(Icons.shield_rounded,
                        color: AppTheme.pharmacyColor, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Your privacy is protected',
                            style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.pharmacyColor
                                    .withValues(alpha: 0.9),
                                letterSpacing: -0.3)),
                        const SizedBox(height: 6),
                        const Text(
                            'Your prescription is securely encrypted and will only be reviewed by verified pharmacists.',
                            style: TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                                fontWeight: FontWeight.w500,
                                height: 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Upload Area
            GestureDetector(
              onTap: _hasUploadedFile ? null : _openCamera,
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                decoration: BoxDecoration(
                  color: _hasUploadedFile
                      ? const Color(0xFFF0FDF4)
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: _hasUploadedFile
                        ? Colors.green.shade300
                        : const Color(0xFFE2E8F0),
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _hasUploadedFile
                            ? Colors.green.shade100
                            : Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 10,
                              offset: const Offset(0, 4))
                        ],
                      ),
                      child: Icon(
                        _hasUploadedFile
                            ? Icons.check_rounded
                            : Icons.cloud_upload_rounded,
                        size: 40,
                        color: _hasUploadedFile
                            ? Colors.green.shade600
                            : AppTheme.pharmacyColor,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _hasUploadedFile
                          ? 'RX_DOC_102.pdf Attached'
                          : 'Tap to Upload Prescription',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.black87),
                    ),
                    const SizedBox(height: 8),
                    if (!_hasUploadedFile)
                      const Text('Supports JPG, PNG, PDF (Max 5MB)',
                          style: TextStyle(
                              fontSize: 12,
                              color: Colors.black45,
                              fontWeight: FontWeight.w500)),
                    if (!_hasUploadedFile) ...[
                      const SizedBox(height: 32),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _openCamera,
                              icon: const Icon(Icons.camera_alt_rounded,
                                  size: 20),
                              label: const Text('Camera'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.black87,
                                backgroundColor: Colors.white,
                                side:
                                    const BorderSide(color: Color(0xFFE2E8F0)),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16)),
                                textStyle: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _openGallery,
                              icon:
                                  const Icon(Icons.file_copy_rounded, size: 20),
                              label: const Text('Gallery'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.pharmacyColor,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16)),
                                textStyle: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                            ),
                          ),
                        ],
                      )
                    ]
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Patient Selection
            const Text('Patient Details',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Colors.black87,
                    letterSpacing: -0.5)),
            const SizedBox(height: 16),
            DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFF1F5F9)),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                children: [
                  RadioListTile<String>(
                    value: 'Myself',
                    groupValue: _selectedPatient,
                    activeColor: AppTheme.pharmacyColor,
                    title: const Text('Myself',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.black87)),
                    onChanged: (val) => setState(() => _selectedPatient = val!),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  RadioListTile<String>(
                    value: 'Family Member',
                    groupValue: _selectedPatient,
                    activeColor: AppTheme.pharmacyColor,
                    title: const Text('Family Member',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.black87)),
                    onChanged: (val) => setState(() => _selectedPatient = val!),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 20,
                offset: const Offset(0, -5))
          ],
        ),
        child: SizedBox(
          height: 56,
          child: ElevatedButton(
            onPressed: _hasUploadedFile ? () {} : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.pharmacyColor,
              disabledBackgroundColor: const Color(0xFFF1F5F9),
              disabledForegroundColor: Colors.black26,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: const Text('Continue to Verification',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Colors.white)),
          ),
        ),
      ),
    );
  }
}
