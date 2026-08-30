import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Coupon / promotion selection screen during checkout.
class PharmacyCouponSelectionScreen extends StatefulWidget {
  final double cartTotal;
  const PharmacyCouponSelectionScreen({super.key, this.cartTotal = 456.00});
  @override State<PharmacyCouponSelectionScreen> createState() => _PharmacyCouponSelectionScreenState();
}

class _PharmacyCouponSelectionScreenState extends State<PharmacyCouponSelectionScreen> {
  final _codeCtrl = TextEditingController();
  String? _selectedCode;
  bool _applying = false;

  final _coupons = [
    _Coupon('FIRST50', '50% off on first order', 'Up to ₹150 discount', 150.0, 'New users only', true, DateTime(2026, 8, 1)),
    _Coupon('MEDS10', '10% off on medicines', 'Min. order ₹300', 100.0, 'Prescription items only', true, DateTime(2026, 7, 31)),
    _Coupon('FREEDELIVERY', 'Free delivery', 'On orders above ₹200', 40.0, 'All pharmacy orders', true, DateTime(2026, 12, 31)),
    _Coupon('WELLNESS20', '20% off wellness products', 'Max discount ₹200', 200.0, 'Wellness category only', false, DateTime(2026, 7, 15)),
    _Coupon('SAVE30', '₹30 off', 'No minimum order', 30.0, 'All products', true, DateTime(2026, 7, 20)),
  ];

  Future<void> _apply(String code) async {
    setState(() { _selectedCode = code; _applying = true; });
    await Future.delayed(const Duration(milliseconds: 800));
    if (mounted) Navigator.pop(context, code);
  }

  @override
  void dispose() { _codeCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Apply Coupon', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Manual code entry
          Row(children: [
            Expanded(
              child: TextField(
                controller: _codeCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  hintText: 'Enter coupon code',
                  hintStyle: TextStyle(color: Colors.grey.shade400),
                  filled: true, fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _codeCtrl.text.isEmpty ? null : () => _apply(_codeCtrl.text.trim()),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ]),
          const SizedBox(height: 24),

          // Available coupons
          Row(children: [
            const Text('Available Coupons', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const Spacer(),
            Text('${_coupons.where((c) => c.eligible).length} available', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ]),
          const SizedBox(height: 12),

          ...List.generate(_coupons.length, (i) {
            final c = _coupons[i];
            final selected = _selectedCode == c.code;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(16),
                border: Border.all(color: selected ? AppTheme.pharmacyColor : (c.eligible ? Colors.grey.shade200 : Colors.grey.shade100), width: selected ? 2 : 1),
              ),
              child: Column(children: [
                // Top section with dashed border
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Row(children: [
                    // Code badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: c.eligible ? AppTheme.pharmacyColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: c.eligible ? AppTheme.pharmacyColor.withValues(alpha: 0.3) : Colors.grey.shade200, style: BorderStyle.solid),
                      ),
                      child: Text(c.code, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: c.eligible ? AppTheme.pharmacyColor : Colors.grey.shade400, letterSpacing: 0.5)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c.title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: c.eligible ? Colors.black87 : Colors.grey.shade400)),
                      Text(c.subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ])),
                  ]),
                ),
                // Divider
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(children: List.generate(30, (_) => Expanded(child: Container(height: 1, margin: const EdgeInsets.symmetric(horizontal: 2), color: Colors.grey.shade200)))),
                ),
                // Bottom section
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c.terms, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      Text('Save up to ₹${c.maxSaving.toStringAsFixed(0)}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.eligible ? Colors.green.shade600 : Colors.grey.shade400)),
                    ])),
                    SizedBox(
                      height: 36,
                      child: c.eligible
                          ? ElevatedButton(
                              onPressed: _applying ? null : () => _apply(c.code),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(horizontal: 20)),
                              child: selected && _applying
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            )
                          : Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                              child: Text('Not eligible', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                            ),
                    ),
                  ]),
                ),
              ]),
            );
          }),
        ],
      ),
    );
  }
}

class _Coupon {
  final String code, title, subtitle, terms;
  final double maxSaving;
  final bool eligible;
  final DateTime expiry;
  const _Coupon(this.code, this.title, this.subtitle, this.maxSaving, this.terms, this.eligible, this.expiry);
}
