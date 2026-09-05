import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// AR Preview Screen — Simulated augmented reality product preview.
class ARPreviewScreen extends StatefulWidget {
  final String? productName;
  const ARPreviewScreen({super.key, this.productName});
  @override
  State<ARPreviewScreen> createState() => _ARPreviewScreenState();
}

class _ARPreviewScreenState extends State<ARPreviewScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  final bool _placed = false;
  double _scale = 1.0;
  double _rotation = 0;

  @override
  void initState() {
    super.initState();
    _pulseCtrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

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
                colors: [Color(0xFF2D1B69), Color(0xFF0D0D0D)]),
          ),
          child: Center(
            child:
                Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              SizedBox(
                  width: 280,
                  height: 280,
                  child: CustomPaint(painter: _GridPainter())),
              const SizedBox(height: 16),
              if (!_placed) ...[
                AnimatedBuilder(
                  animation: _pulseCtrl,
                  builder: (_, __) => Container(
                    width: 60 + _pulseCtrl.value * 20,
                    height: 60 + _pulseCtrl.value * 20,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: Colors.white.withValues(
                                alpha: 0.3 + _pulseCtrl.value * 0.4),
                            width: 2)),
                    child: const Icon(Icons.add, color: Colors.white54),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Tap to place ${widget.productName ?? "product"}',
                    style:
                        const TextStyle(color: Colors.white60, fontSize: 14)),
              ] else ...[
                Transform.scale(
                    scale: _scale,
                    child: Transform.rotate(
                      angle: _rotation * 3.14159 / 180,
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            gradient: const LinearGradient(
                                colors: [AppTheme.marketplaceColor, Color(0xFF4D96FF)]),
                            boxShadow: [
                              BoxShadow(
                                  color: Colors.purple.withValues(alpha: 0.3),
                                  blurRadius: 30,
                                  spreadRadius: 5)
                            ]),
                        child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.view_in_ar,
                                  size: 64, color: Colors.white),
                              const SizedBox(height: 8),
                              Text(widget.productName ?? '3D Preview',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16),
                                  textAlign: TextAlign.center),
                            ]),
                      ),
                    )),
              ],
            ]),
          ),
        ),
        // Top bar
        Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
                child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                      color: Colors.black38,
                                      borderRadius: BorderRadius.circular(12)),
                                  child: const Icon(Icons.arrow_back,
                                      color: Colors.white))),
                          Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                  color: Colors.black38,
                                  borderRadius: BorderRadius.circular(20)),
                              child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.view_in_ar,
                                        color: Colors.white70, size: 16),
                                    SizedBox(width: 6),
                                    Text('AR Preview',
                                        style: TextStyle(
                                            color: Colors.white70,
                                            fontWeight: FontWeight.w600))
                                  ])),
                          Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                  color: Colors.black38,
                                  borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.camera_alt,
                                  color: Colors.white)),
                        ])))),
        // Bottom controls
        if (_placed)
          Positioned(
              bottom: 40,
              left: 16,
              right: 16,
              child: Column(children: [
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _controlBtn(
                      Icons.zoom_out,
                      () => setState(
                          () => _scale = (_scale - 0.1).clamp(0.5, 2.0))),
                  const SizedBox(width: 16),
                  _controlBtn(
                      Icons.rotate_left, () => setState(() => _rotation -= 15)),
                  const SizedBox(width: 16),
                  _controlBtn(Icons.rotate_right,
                      () => setState(() => _rotation += 15)),
                  const SizedBox(width: 16),
                  _controlBtn(
                      Icons.zoom_in,
                      () => setState(
                          () => _scale = (_scale + 0.1).clamp(0.5, 2.0))),
                ]),
                const SizedBox(height: 16),
                SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.marketplaceColor,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14))),
                      child: const Text('Add to Cart',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white)),
                    )),
              ])),
      ]),
    );
  }

  Widget _controlBtn(IconData icon, VoidCallback onTap) => GestureDetector(
      onTap: onTap,
      child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: Colors.white12, borderRadius: BorderRadius.circular(14)),
          child: Icon(icon, color: Colors.white, size: 24)));
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white12
      ..strokeWidth = 0.5;
    for (int i = 0; i <= 10; i++) {
      final y = size.height * i / 10;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
      final x = size.width * i / 10;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
