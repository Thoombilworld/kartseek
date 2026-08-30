import 'package:flutter/material.dart';

/// Missing or wrong item complaint screen.
class PharmacyMissingItemComplaintScreen extends StatefulWidget {
  final String orderId;
  const PharmacyMissingItemComplaintScreen(
      {super.key, this.orderId = 'PH-2026-1234'});
  @override
  State<PharmacyMissingItemComplaintScreen> createState() =>
      _PharmacyMissingItemComplaintScreenState();
}

class _PharmacyMissingItemComplaintScreenState
    extends State<PharmacyMissingItemComplaintScreen> {
  final _detailsCtrl = TextEditingController();
  final Set<int> _selectedItems = {};
  bool _submitting = false;

  final _orderItems = [
    ('Paracetamol 500mg', 'Strip of 10', '₹35.00', '💊'),
    ('Crocin Advance', 'Pack of 20', '₹89.00', '💊'),
    ('Betadine Ointment', '15g tube', '₹62.00', '🧴'),
    ('ORS Sachets', 'Pack of 5', '₹45.00', '📦'),
    ('Digital Thermometer', '1 unit', '₹220.00', '🌡️'),
  ];

  @override
  void dispose() {
    _detailsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedItems.isEmpty) return;
    setState(() => _submitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('Complaint submitted successfully'),
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
        title: const Text('Missing / Wrong Item',
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
              // Info
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Icon(Icons.info_outline,
                      color: Colors.blue.shade600, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                      child: Text(
                          'Select the items that were missing or wrong in your delivery.',
                          style: TextStyle(
                              fontSize: 13,
                              color: Colors.blue.shade700,
                              fontWeight: FontWeight.w500))),
                ]),
              ),
              const SizedBox(height: 20),

              Text('Order #${widget.orderId}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 15)),
              const SizedBox(height: 12),

              // Items
              ...List.generate(_orderItems.length, (i) {
                final (name, desc, price, emoji) = _orderItems[i];
                final selected = _selectedItems.contains(i);
                return GestureDetector(
                  onTap: () => setState(() {
                    selected ? _selectedItems.remove(i) : _selectedItems.add(i);
                  }),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: selected ? Colors.red.shade50 : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: selected
                              ? Colors.red.shade300
                              : Colors.grey.shade200,
                          width: selected ? 1.5 : 1),
                    ),
                    child: Row(children: [
                      // Checkbox
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: selected
                              ? Colors.red.shade600
                              : Colors.transparent,
                          border: Border.all(
                              color: selected
                                  ? Colors.red.shade600
                                  : Colors.grey.shade300,
                              width: 2),
                        ),
                        child: selected
                            ? const Icon(Icons.check,
                                color: Colors.white, size: 14)
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Text(emoji, style: const TextStyle(fontSize: 28)),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 14)),
                            Text(desc,
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey.shade500)),
                          ])),
                      Text(price,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                    ]),
                  ),
                );
              }),
              const SizedBox(height: 20),

              // Issue type
              const Text('What happened?',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                _chip('Item missing from bag'),
                _chip('Received wrong medicine'),
                _chip('Wrong quantity'),
                _chip('Wrong dosage/variant'),
              ]),
              const SizedBox(height: 16),

              // Additional details
              TextField(
                controller: _detailsCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Additional details (optional)',
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
              const SizedBox(height: 16),

              // Photo upload
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: Colors.grey.shade200, style: BorderStyle.solid),
                ),
                child: Column(children: [
                  Icon(Icons.add_a_photo_outlined,
                      size: 36, color: Colors.grey.shade400),
                  const SizedBox(height: 8),
                  Text('Upload photo evidence',
                      style: TextStyle(
                          color: Colors.grey.shade600,
                          fontWeight: FontWeight.w600,
                          fontSize: 13)),
                  Text('(Optional)',
                      style:
                          TextStyle(color: Colors.grey.shade400, fontSize: 11)),
                ]),
              ),
            ],
          ),
        ),

        // Submit
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
              onPressed: _selectedItems.isEmpty || _submitting ? null : _submit,
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
                  : Text(
                      'Report ${_selectedItems.length} Item${_selectedItems.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _chip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
          color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
      child: Text(label,
          style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700)),
    );
  }
}
