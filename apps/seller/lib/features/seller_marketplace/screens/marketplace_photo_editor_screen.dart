import 'package:flutter/material.dart';

/// Photo Editor Screen — Edit product photos — crop, brightness, watermark.
class MarketplacePhotoEditorScreen extends StatelessWidget {
  const MarketplacePhotoEditorScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Photo Editor',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: Column(children: [
        Expanded(
            child: Container(
                color: Colors.grey[200],
                child: const Center(
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                      Icon(Icons.image, size: 80, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Tap to select product photo',
                          style: TextStyle(color: Colors.grey, fontSize: 14)),
                    ])))),
        Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  {'tool': 'Crop', 'icon': Icons.crop},
                  {'tool': 'Brightness', 'icon': Icons.brightness_6},
                  {'tool': 'Contrast', 'icon': Icons.contrast},
                  {'tool': 'Rotate', 'icon': Icons.rotate_right},
                  {'tool': 'Watermark', 'icon': Icons.branding_watermark},
                  {'tool': 'Filter', 'icon': Icons.filter}
                ]
                    .map((t) => Column(children: [
                          IconButton(
                              onPressed: () {},
                              icon: Icon(t['icon'] as IconData, color: _mp)),
                          Text(t['tool'] as String,
                              style: const TextStyle(fontSize: 11)),
                        ]))
                    .toList())),
        SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(12),
                child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                        backgroundColor: _mp,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12))),
                    child: const Text('Save Photo',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700))))),
      ]),
    );
  }
}
