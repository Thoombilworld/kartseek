import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Barcode Scanner Screen — Simulated barcode scanning with text input fallback.
class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});
  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen>
    with SingleTickerProviderStateMixin {
  final _barcodeCtrl = TextEditingController();
  late AnimationController _scanAnim;
  bool _scanning = true;
  String? _result;

  @override
  void initState() {
    super.initState();
    _scanAnim =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat();
  }

  @override
  void dispose() {
    _scanAnim.dispose();
    _barcodeCtrl.dispose();
    super.dispose();
  }

  void _search(String code) => setState(() {
        _scanning = false;
        _result = code;
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        Container(
            decoration: const BoxDecoration(
                gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFF1a1a2e), Color(0xFF0D0D0D)]))),
        Center(
            child:
                Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (_scanning) ...[
            SizedBox(
                width: 260,
                height: 180,
                child: Stack(children: [
                  Container(
                      decoration: BoxDecoration(
                          border: Border.all(
                              color: AppTheme.marketplaceColor, width: 2),
                          borderRadius: BorderRadius.circular(16))),
                  AnimatedBuilder(
                      animation: _scanAnim,
                      builder: (_, __) => Positioned(
                            top: _scanAnim.value * 170,
                            left: 8,
                            right: 8,
                            child: Container(
                                height: 2,
                                decoration: const BoxDecoration(
                                    gradient: LinearGradient(colors: [
                                  Colors.transparent,
                                  AppTheme.marketplaceColor,
                                  Colors.transparent
                                ]))),
                          )),
                ])),
            const SizedBox(height: 20),
            const Text('Point camera at product barcode',
                style: TextStyle(color: Colors.white60, fontSize: 14)),
          ] else ...[
            const Icon(Icons.check_circle, color: Color(0xFF6BCB77), size: 64),
            const SizedBox(height: 12),
            Text('Found: $_result',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            ElevatedButton(
                onPressed: () => setState(() {
                      _scanning = true;
                      _result = null;
                    }),
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.marketplaceColor,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12))),
                child: const Text('Scan Again',
                    style: TextStyle(color: Colors.white))),
          ],
        ])),
        Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
                child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                  color: Colors.white12,
                                  borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.arrow_back,
                                  color: Colors.white))),
                      const SizedBox(width: 12),
                      const Text('Barcode Scanner',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w700)),
                    ])))),
        Positioned(
            bottom: 40,
            left: 16,
            right: 16,
            child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  const Text('Or enter barcode manually',
                      style: TextStyle(color: Colors.white54, fontSize: 12)),
                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(
                        child: TextField(
                            controller: _barcodeCtrl,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                                hintText: 'Enter barcode number',
                                hintStyle:
                                    const TextStyle(color: Colors.white30),
                                filled: true,
                                fillColor: Colors.white10,
                                border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide.none),
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10)))),
                    const SizedBox(width: 8),
                    ElevatedButton(
                        onPressed: () {
                          if (_barcodeCtrl.text.isNotEmpty) {
                            _search(_barcodeCtrl.text);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.marketplaceColor,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10))),
                        child: const Text('Search',
                            style: TextStyle(color: Colors.white))),
                  ]),
                ]))),
      ]),
    );
  }
}
