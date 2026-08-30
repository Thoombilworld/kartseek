import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Generates custom car-shaped [BitmapDescriptor] markers for Google Maps.
///
/// Paints a top-down car silhouette on a Canvas and caches results
/// so repeated calls for the same color/size return instantly.
///
/// Usage:
/// ```dart
/// final icon = await CarMarkerHelper.getCarIcon(color: Colors.black);
/// Marker(markerId: ..., icon: icon, rotation: heading);
/// ```
class CarMarkerHelper {
  CarMarkerHelper._();

  static final Map<int, BitmapDescriptor> _cache = {};

  /// Get a car-shaped [BitmapDescriptor].
  ///
  /// [color] — Fill color for the car body.
  /// [size] — Width of the rendered icon in logical pixels.
  static Future<BitmapDescriptor> getCarIcon({
    Color color = Colors.black,
    double size = 48,
  }) async {
    final cacheKey = color.toARGB32() ^ size.toInt();
    if (_cache.containsKey(cacheKey)) return _cache[cacheKey]!;

    final descriptor = await _paintCarIcon(color, size);
    _cache[cacheKey] = descriptor;
    return descriptor;
  }

  /// Pre-cache common variants so first render is instant.
  static Future<void> preload() async {
    await Future.wait([
      getCarIcon(color: const Color(0xFF1A1A2E)), // dark navy (available)
      getCarIcon(color: const Color(0xFF2196F3)), // blue (assigned)
      getCarIcon(color: const Color(0xFF4CAF50)), // green (your driver)
    ]);
  }

  /// Get a pickup marker (green dot with white center).
  static Future<BitmapDescriptor> getPickupIcon({double size = 44}) async {
    const key = 0x00FF00AA; // unique
    if (_cache.containsKey(key)) return _cache[key]!;
    final d = await _paintCircleIcon(const Color(0xFF4CAF50), size);
    _cache[key] = d;
    return d;
  }

  /// Get a destination marker (red dot with white center).
  static Future<BitmapDescriptor> getDestinationIcon({double size = 44}) async {
    const key = 0xFF0000AA; // unique
    if (_cache.containsKey(key)) return _cache[key]!;
    final d = await _paintCircleIcon(Colors.red, size);
    _cache[key] = d;
    return d;
  }

  // ── Canvas Painting ─────────────────────────────────────────────────────

  static Future<BitmapDescriptor> _paintCarIcon(Color color, double size) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));

    final bodyPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final outlinePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final shadowPaint = Paint()
      ..color = Colors.black.withAlpha(50)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);

    final cx = size / 2;
    final cy = size / 2;

    // Shadow
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, cy + 1), width: size * 0.48, height: size * 0.80),
        Radius.circular(size * 0.14),
      ),
      shadowPaint,
    );

    // Car body (rectangle with rounded corners, pointing UP = north)
    final bodyRect = Rect.fromCenter(
      center: Offset(cx, cy),
      width: size * 0.45,
      height: size * 0.78,
    );
    final bodyRRect = RRect.fromRectAndRadius(bodyRect, Radius.circular(size * 0.12));
    canvas.drawRRect(bodyRRect, bodyPaint);
    canvas.drawRRect(bodyRRect, outlinePaint);

    // Windshield (top = front of car)
    final windshieldPaint = Paint()
      ..color = Colors.white.withAlpha(200)
      ..style = PaintingStyle.fill;

    final wsRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(cx, cy - size * 0.17),
        width: size * 0.32,
        height: size * 0.16,
      ),
      Radius.circular(size * 0.06),
    );
    canvas.drawRRect(wsRect, windshieldPaint);

    // Rear window
    final rwRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(cx, cy + size * 0.20),
        width: size * 0.30,
        height: size * 0.12,
      ),
      Radius.circular(size * 0.05),
    );
    canvas.drawRRect(rwRect, windshieldPaint);

    // Headlights (two small white dots at front)
    final headlightPaint = Paint()
      ..color = Colors.yellow.shade200
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx - size * 0.14, cy - size * 0.32), size * 0.035, headlightPaint);
    canvas.drawCircle(Offset(cx + size * 0.14, cy - size * 0.32), size * 0.035, headlightPaint);

    // Tail lights (two small red dots at rear)
    final taillightPaint = Paint()
      ..color = Colors.redAccent
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx - size * 0.14, cy + size * 0.33), size * 0.03, taillightPaint);
    canvas.drawCircle(Offset(cx + size * 0.14, cy + size * 0.33), size * 0.03, taillightPaint);

    return _recorderToDescriptor(recorder, size);
  }

  static Future<BitmapDescriptor> _paintCircleIcon(Color color, double size) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, size, size));
    final cx = size / 2;
    final cy = size / 2;

    // Outer circle shadow
    canvas.drawCircle(
      Offset(cx, cy + 1),
      size * 0.38,
      Paint()..color = Colors.black.withAlpha(40)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );

    // Outer colored ring
    canvas.drawCircle(Offset(cx, cy), size * 0.36, Paint()..color = color);

    // Inner white dot
    canvas.drawCircle(Offset(cx, cy), size * 0.16, Paint()..color = Colors.white);

    return _recorderToDescriptor(recorder, size);
  }

  static Future<BitmapDescriptor> _recorderToDescriptor(
    ui.PictureRecorder recorder,
    double size,
  ) async {
    final picture = recorder.endRecording();
    final image = await picture.toImage(size.toInt(), size.toInt());
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(bytes!.buffer.asUint8List());
  }
}
