import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Add new delivery address for pharmacy orders.
class PharmacyAddAddressScreen extends StatefulWidget {
  const PharmacyAddAddressScreen({super.key});
  @override
  State<PharmacyAddAddressScreen> createState() =>
      _PharmacyAddAddressScreenState();
}

class _PharmacyAddAddressScreenState extends State<PharmacyAddAddressScreen> {
  final _formKey = GlobalKey<FormState>();
  final _labelCtrl = TextEditingController();
  final _line1Ctrl = TextEditingController();
  final _line2Ctrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _addressType = 'Home';
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [
      _labelCtrl,
      _line1Ctrl,
      _line2Ctrl,
      _cityCtrl,
      _stateCtrl,
      _pinCtrl,
      _phoneCtrl
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) Navigator.pop(context, true);
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
        title: const Text('Add New Address',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.black87)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Map placeholder
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: AppTheme.pharmacyColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.2)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.map_rounded,
                      size: 48,
                      color: AppTheme.pharmacyColor.withValues(alpha: 0.5)),
                  const SizedBox(height: 8),
                  const Text('Tap to select location on map',
                      style: TextStyle(
                          color: AppTheme.pharmacyColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Address type chips
            Wrap(
              spacing: 10,
              children: ['Home', 'Work', 'Other']
                  .map((type) => ChoiceChip(
                        label: Text(type),
                        selected: _addressType == type,
                        onSelected: (s) => setState(() => _addressType = type),
                        selectedColor:
                            AppTheme.pharmacyColor.withValues(alpha: 0.15),
                        labelStyle: TextStyle(
                          color: _addressType == type
                              ? AppTheme.pharmacyColor
                              : Colors.grey.shade600,
                          fontWeight: _addressType == type
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 20),

            _field(_labelCtrl, 'Address Label', 'e.g. My Home',
                Icons.bookmark_outline),
            _field(_line1Ctrl, 'Address Line 1 *', 'Building, Street',
                Icons.home_outlined,
                required: true),
            _field(_line2Ctrl, 'Address Line 2', 'Area, Landmark',
                Icons.location_on_outlined),
            Row(
              children: [
                Expanded(
                    child: _field(
                        _cityCtrl, 'City *', 'City', Icons.location_city,
                        required: true)),
                const SizedBox(width: 12),
                Expanded(
                    child: _field(
                        _stateCtrl, 'State', 'State', Icons.flag_outlined)),
              ],
            ),
            Row(
              children: [
                Expanded(
                    child: _field(_pinCtrl, 'PIN / ZIP *', 'Code',
                        Icons.pin_drop_outlined,
                        required: true, keyboard: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(
                    child: _field(
                        _phoneCtrl, 'Phone *', '+91 ...', Icons.phone_outlined,
                        required: true, keyboard: TextInputType.phone)),
              ],
            ),
            const SizedBox(height: 32),

            SizedBox(
              height: 54,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.pharmacyColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white))
                    : const Text('Save Address',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _field(
      TextEditingController ctrl, String label, String hint, IconData icon,
      {bool required = false, TextInputType? keyboard}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: ctrl,
        keyboardType: keyboard,
        validator: required
            ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null
            : null,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon, size: 20, color: Colors.grey.shade500),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  const BorderSide(color: AppTheme.pharmacyColor, width: 1.5)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }
}
