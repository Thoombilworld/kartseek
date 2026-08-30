import 'package:flutter/material.dart';

/// Delivery confirmation — OTP + signature + photo proof.
class PharmacyDeliveryConfirmScreen extends StatefulWidget {
  const PharmacyDeliveryConfirmScreen({super.key});
  @override
  State<PharmacyDeliveryConfirmScreen> createState() => _PharmacyDeliveryConfirmScreenState();
}

class _PharmacyDeliveryConfirmScreenState extends State<PharmacyDeliveryConfirmScreen> {
  final _otpCtrl = TextEditingController();
  bool _photoTaken = false;

  @override
  void dispose() {
    _otpCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Confirm Delivery', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // OTP Entry
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                const Text('Enter Customer OTP', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(4, (i) {
                    return Container(
                      width: 48,
                      height: 52,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: const Center(
                        child: TextField(
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                          keyboardType: TextInputType.number,
                          maxLength: 1,
                          decoration: InputDecoration(border: InputBorder.none, counterText: ''),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Photo capture
          GestureDetector(
            onTap: () => setState(() => _photoTaken = true),
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                color: _photoTaken ? Colors.green.shade50 : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _photoTaken ? Colors.green.shade300 : Colors.grey.shade200),
              ),
              child: Center(
                child: _photoTaken
                    ? Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle, color: Colors.green, size: 40),
                          const SizedBox(height: 8),
                          Text('Photo captured', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w600)),
                        ],
                      )
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.camera_alt, size: 40, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          Text('Take Delivery Photo', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Rx warning
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.amber.shade700, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'For Rx orders, ensure the customer is the person named on the prescription.',
                    style: TextStyle(fontSize: 12, color: Colors.amber.shade800, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Confirm button
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Confirm Delivery', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}
