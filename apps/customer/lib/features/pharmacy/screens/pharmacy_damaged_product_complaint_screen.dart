import 'package:flutter/material.dart';

/// Damaged / expired product complaint screen.
class PharmacyDamagedProductComplaintScreen extends StatefulWidget {
  final String orderId;
  const PharmacyDamagedProductComplaintScreen(
      {super.key, this.orderId = 'PH-2026-1234'});
  @override
  State<PharmacyDamagedProductComplaintScreen> createState() =>
      _PharmacyDamagedProductComplaintScreenState();
}

class _PharmacyDamagedProductComplaintScreenState
    extends State<PharmacyDamagedProductComplaintScreen> {
  final _detailsCtrl = TextEditingController();
  String? _issueType;
  int _photoCount = 0;
  bool _submitting = false;

  final _issueTypes = [
    (
      'Damaged packaging',
      Icons.broken_image_outlined,
      'Package was torn, crushed, or leaking'
    ),
    ('Expired medicine', Icons.event_busy, 'Product past its expiry date'),
    ('Tampered seal', Icons.security, 'Safety seal broken or missing'),
    (
      'Temperature damage',
      Icons.thermostat,
      'Medicine requires cold storage and arrived warm'
    ),
    (
      'Wrong batch/lot',
      Icons.qr_code_scanner,
      'Batch number doesn\'t match prescription'
    ),
  ];

  @override
  void dispose() {
    _detailsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_issueType == null) return;
    setState(() => _submitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text(
            'Complaint submitted — we\'ll process your refund within 24 hours'),
        backgroundColor: Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ));
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => Navigator.pop(context)),
        title: const Text('Report Quality Issue',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.black87)),
      ),
      body: Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Safety alert
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200)),
                child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.health_and_safety,
                          color: Colors.red.shade600, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text('Safety First',
                                style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: Colors.red.shade800)),
                            const SizedBox(height: 4),
                            Text(
                                'Do NOT consume damaged or expired medicines. We take quality issues very seriously and will process a full refund.',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.red.shade700,
                                    height: 1.5)),
                          ])),
                    ]),
              ),
              const SizedBox(height: 24),

              // Issue type
              const Text('What\'s the issue?',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 12),
              ...List.generate(_issueTypes.length, (i) {
                final (label, icon, desc) = _issueTypes[i];
                final selected = _issueType == label;
                return GestureDetector(
                  onTap: () => setState(() => _issueType = label),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: selected ? Colors.red.shade50 : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: selected
                              ? Colors.red.shade400
                              : Colors.grey.shade200,
                          width: selected ? 1.5 : 1),
                    ),
                    child: Row(children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: selected
                                ? Colors.red.shade100
                                : Colors.grey.shade100),
                        child: Icon(icon,
                            size: 20,
                            color: selected
                                ? Colors.red.shade600
                                : Colors.grey.shade500),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(label,
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: selected
                                        ? Colors.red.shade700
                                        : Colors.black87)),
                            Text(desc,
                                style: TextStyle(
                                    fontSize: 11, color: Colors.grey.shade500)),
                          ])),
                      if (selected)
                        Icon(Icons.check_circle,
                            color: Colors.red.shade600, size: 22),
                    ]),
                  ),
                );
              }),
              const SizedBox(height: 20),

              // Photo evidence
              const Text('Photo Evidence',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 4),
              Text('Photos help us process your refund faster',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              const SizedBox(height: 12),
              Row(children: [
                GestureDetector(
                  onTap: () => setState(
                      () => _photoCount = (_photoCount + 1).clamp(0, 4)),
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: Colors.grey.shade300,
                            style: BorderStyle.solid)),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.camera_alt_outlined,
                              color: Colors.grey.shade500, size: 24),
                          Text('Add',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.w600)),
                        ]),
                  ),
                ),
                const SizedBox(width: 10),
                ...List.generate(
                    _photoCount,
                    (i) => Container(
                          width: 80,
                          height: 80,
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                              color: Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(12)),
                          child: Stack(children: [
                            Center(
                                child: Icon(Icons.image,
                                    color: Colors.grey.shade400, size: 28)),
                            Positioned(
                                top: 4,
                                right: 4,
                                child: GestureDetector(
                                  onTap: () => setState(() => _photoCount--),
                                  child: Container(
                                    padding: const EdgeInsets.all(2),
                                    decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Colors.red),
                                    child: const Icon(Icons.close,
                                        color: Colors.white, size: 12),
                                  ),
                                )),
                          ]),
                        )),
              ]),
              const SizedBox(height: 20),

              // Details
              TextField(
                controller: _detailsCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Describe the issue in detail...',
                  hintStyle: TextStyle(color: Colors.grey.shade400),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200)),
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: EdgeInsets.fromLTRB(
              16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, -2))
          ]),
          child: SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: _issueType == null || _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: Colors.white))
                  : const Text('Submit Complaint',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
        ),
      ]),
    );
  }
}
