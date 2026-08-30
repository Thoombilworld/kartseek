import 'package:flutter/material.dart';

class MarketplaceBarcodeScannerScreen extends StatefulWidget {
  const MarketplaceBarcodeScannerScreen({super.key});
  @override
  State<MarketplaceBarcodeScannerScreen> createState() => _State();
}

class _State extends State<MarketplaceBarcodeScannerScreen> {
  final _ctrl = TextEditingController();
  String? _result;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
          backgroundColor: const Color(0xFF6C3FC8),
          foregroundColor: Colors.white,
          title: const Text('Barcode Scanner',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: Center(
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        if (_result == null) ...[
          Container(
              width: 260,
              height: 180,
              decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF6C3FC8), width: 2),
                  borderRadius: BorderRadius.circular(16)),
              child: const Center(
                  child: Text('Camera Feed',
                      style: TextStyle(color: Colors.white38)))),
          const SizedBox(height: 20),
          const Text('Point camera at barcode',
              style: TextStyle(color: Colors.white60)),
        ] else ...[
          const Icon(Icons.check_circle, color: Color(0xFF6BCB77), size: 64),
          const SizedBox(height: 12),
          const Text('Product Found!',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w700)),
          Text(_result!,
              style: const TextStyle(color: Colors.white60, fontSize: 14)),
        ],
        const SizedBox(height: 30),
        Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Row(children: [
              Expanded(
                  child: TextField(
                      controller: _ctrl,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                          hintText: 'Enter barcode',
                          hintStyle: const TextStyle(color: Colors.white30),
                          filled: true,
                          fillColor: Colors.white10,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide.none)))),
              const SizedBox(width: 8),
              ElevatedButton(
                  onPressed: () => setState(() =>
                      _result = _ctrl.text.isEmpty ? 'SKU-12345' : _ctrl.text),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6C3FC8)),
                  child: const Text('Search',
                      style: TextStyle(color: Colors.white))),
            ])),
      ])),
    );
  }
}
