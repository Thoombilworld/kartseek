import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Barcode Scanner Screen — Scan product barcodes to find items.
class GroceryBarcodeScannerScreen extends StatefulWidget {
  const GroceryBarcodeScannerScreen({super.key});
  @override
  State<GroceryBarcodeScannerScreen> createState() => _GroceryBarcodeScannerScreenState();
}

class _GroceryBarcodeScannerScreenState extends State<GroceryBarcodeScannerScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  bool _scanning = true;
  String? _scannedCode;
  Map<String, dynamic>? _foundProduct;

  // Demo product lookup
  static const _demoProducts = {
    '8901030793158': {'name': 'Amul Butter 500g', 'price': 275, 'emoji': '🧈', 'store': 'D-Mart'},
    '8901063029910': {'name': 'Tata Salt 1kg', 'price': 28, 'emoji': '🧂', 'store': 'FreshMart'},
    '8904063200075': {'name': 'Fortune Sunlite Oil 1L', 'price': 189, 'emoji': '🫒', 'store': 'FreshMart'},
  };

  void _simulateScan() {
    setState(() {
      _scannedCode = '8901030793158';
      _foundProduct = _demoProducts[_scannedCode];
      _scanning = false;
    });
  }

  void _resetScan() {
    setState(() {
      _scanning = true;
      _scannedCode = null;
      _foundProduct = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Scan Barcode', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(icon: const Icon(Icons.flash_on, color: Colors.white), onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Flash toggled')))),
        ],
      ),
      body: Column(
        children: [
          // Camera preview placeholder
          Expanded(
            flex: 3,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  color: Colors.grey.shade900,
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.qr_code_scanner, color: Colors.white24, size: 80),
                        SizedBox(height: 12),
                        Text('Camera preview', style: TextStyle(color: Colors.white38, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
                // Scan frame
                Container(
                  width: 260,
                  height: 160,
                  decoration: BoxDecoration(
                    border: Border.all(color: _groceryColor, width: 3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                // Scan line animation
                if (_scanning)
                  const Positioned(
                    child: Text('Point camera at barcode', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
          ),

          // Bottom panel
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: _foundProduct != null
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
                            child: Center(child: Text(_foundProduct!['emoji'] as String, style: const TextStyle(fontSize: 28))),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_foundProduct!['name'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                Text(_foundProduct!['store'] as String, style: const TextStyle(fontSize: 11, color: _groceryColor, fontWeight: FontWeight.w600)),
                                Text('${RegionService.instance.currentCountry.currencySymbol} ${_foundProduct!['price']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${_foundProduct!['name']} added to cart'))); _resetScan(); },
                            style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            child: const Text('ADD TO CART', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextButton(onPressed: _resetScan, child: const Text('Scan Another', style: TextStyle(color: _groceryColor, fontWeight: FontWeight.w700))),
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Scan a product barcode', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
                      const SizedBox(height: 4),
                      Text('Aim the camera at any product barcode', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      const SizedBox(height: 16),
                      // Demo button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _simulateScan,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: _groceryColor),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: const Text('Demo Scan', style: TextStyle(color: _groceryColor, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
