import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kartseek_shared_mobile/core/services/camera_service.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// KARTSEEK Camera Capture Screen — reusable camera UI for all modules.
///
/// Returns the captured file path via [Navigator.pop(context, filePath)].
///
/// Usage:
/// ```dart
/// final path = await Navigator.push<String>(context,
///   MaterialPageRoute(builder: (_) => CameraCaptureScreen(
///     title: 'Scan Prescription',
///     accentColor: AppTheme.pharmacyColor,
///     captureMode: CameraCaptureMode.photo,
///     overlayHint: 'Align prescription within the frame',
///   )),
/// );
/// if (path != null) { /* use captured image */ }
/// ```
class CameraCaptureScreen extends StatefulWidget {
  /// Title shown in the app bar.
  final String title;

  /// Accent color for the module (e.g. pharmacyColor, doctorColor).
  final Color accentColor;

  /// Whether to capture photo or video.
  final CameraCaptureMode captureMode;

  /// Filename prefix for saved files.
  final String filePrefix;

  /// Optional overlay hint text shown above the capture button.
  final String? overlayHint;

  /// Whether to show a grid overlay (useful for product photos).
  final bool showGrid;

  /// Initial camera direction.
  final CameraLensDirection initialLens;

  const CameraCaptureScreen({
    super.key,
    this.title = 'Camera',
    this.accentColor = AppTheme.marketplaceColor,
    this.captureMode = CameraCaptureMode.photo,
    this.filePrefix = 'kartseek',
    this.overlayHint,
    this.showGrid = false,
    this.initialLens = CameraLensDirection.back,
  });

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

/// Capture mode for the camera.
enum CameraCaptureMode { photo, video }

class _CameraCaptureScreenState extends State<CameraCaptureScreen>
    with WidgetsBindingObserver {
  final _cameraService = CameraService.instance;
  bool _isLoading = true;
  bool _isCapturing = false;
  bool _isRecording = false;
  FlashMode _flashMode = FlashMode.off;
  String? _capturedPath;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  Future<void> _initCamera() async {
    await _cameraService.initialize(
      lens: widget.initialLens,
      enableAudio: widget.captureMode == CameraCaptureMode.video,
    );
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_cameraService.isReady) return;
    if (state == AppLifecycleState.paused) {
      _cameraService.pause();
    } else if (state == AppLifecycleState.resumed) {
      _cameraService.resume();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: _isLoading
          ? Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                CircularProgressIndicator(color: widget.accentColor),
                const SizedBox(height: 16),
                const Text('Initializing camera...', style: TextStyle(color: Colors.white70, fontSize: 14)),
              ]),
            )
          : !_cameraService.isReady
              ? _buildError()
              : _capturedPath != null
                  ? _buildPreview()
                  : _buildCameraView(),
    );
  }

  Widget _buildCameraView() {
    final controller = _cameraService.controller!;
    return Stack(
      fit: StackFit.expand,
      children: [
        // Camera preview
        Center(
          child: AspectRatio(
            aspectRatio: 1 / controller.value.aspectRatio,
            child: CameraPreview(controller),
          ),
        ),

        // Grid overlay
        if (widget.showGrid)
          CustomPaint(painter: _GridPainter()),

        // Top bar
        Positioned(
          top: 0, left: 0, right: 0,
          child: Container(
            padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 8, left: 16, right: 16, bottom: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
                colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
              ),
            ),
            child: Row(children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(color: Colors.black38, shape: BoxShape.circle),
                  child: const Icon(Icons.close, color: Colors.white, size: 22),
                ),
              ),
              const Spacer(),
              Text(widget.title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
              const Spacer(),
              // Flash toggle
              GestureDetector(
                onTap: () async {
                  final mode = await _cameraService.toggleFlash();
                  if (mounted) setState(() => _flashMode = mode);
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(color: Colors.black38, shape: BoxShape.circle),
                  child: Icon(
                    _flashMode == FlashMode.off ? Icons.flash_off : Icons.flash_on,
                    color: _flashMode == FlashMode.off ? Colors.white : Colors.amber,
                    size: 22,
                  ),
                ),
              ),
            ]),
          ),
        ),

        // Overlay hint
        if (widget.overlayHint != null)
          Positioned(
            bottom: 160, left: 40, right: 40,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(12)),
              child: Text(widget.overlayHint!, textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
            ),
          ),

        // Bottom controls
        Positioned(
          bottom: 0, left: 0, right: 0,
          child: Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom + 16, top: 20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter, end: Alignment.topCenter,
                colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
              ),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              // Gallery shortcut (placeholder)
              GestureDetector(
                onTap: () async {
                  final picked = await ImagePicker().pickImage(
                    source: ImageSource.gallery,
                    imageQuality: 90,
                  );
                  if (picked != null && mounted) {
                    setState(() => _capturedPath = picked.path);
                  }
                },
                child: Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white38, width: 2),
                    color: Colors.black26,
                  ),
                  child: const Icon(Icons.photo_library, color: Colors.white, size: 22),
                ),
              ),

              // Capture button
              GestureDetector(
                onTap: _isCapturing ? null : _onCapture,
                child: Container(
                  width: 76, height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: Container(
                    margin: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isRecording ? Colors.red : widget.accentColor,
                    ),
                    child: _isCapturing
                        ? const Padding(
                            padding: EdgeInsets.all(18),
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : Icon(
                            widget.captureMode == CameraCaptureMode.video
                                ? (_isRecording ? Icons.stop : Icons.videocam)
                                : Icons.camera_alt,
                            color: Colors.white, size: 28),
                  ),
                ),
              ),

              // Flip camera
              GestureDetector(
                onTap: () async {
                  setState(() => _isLoading = true);
                  await _cameraService.switchCamera(
                    enableAudio: widget.captureMode == CameraCaptureMode.video,
                  );
                  if (mounted) setState(() => _isLoading = false);
                },
                child: Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black26,
                    border: Border.all(color: Colors.white38, width: 2),
                  ),
                  child: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 22),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }

  Future<void> _onCapture() async {
    setState(() => _isCapturing = true);

    if (widget.captureMode == CameraCaptureMode.video) {
      if (_isRecording) {
        final path = await _cameraService.stopVideoRecording(prefix: widget.filePrefix);
        if (mounted) {
          setState(() { _isRecording = false; _isCapturing = false; _capturedPath = path; });
        }
      } else {
        final started = await _cameraService.startVideoRecording();
        if (mounted) {
          setState(() { _isRecording = started; _isCapturing = false; });
        }
      }
    } else {
      final path = await _cameraService.captureImage(prefix: widget.filePrefix);
      if (mounted) {
        setState(() { _isCapturing = false; _capturedPath = path; });
      }
    }
  }

  Widget _buildPreview() {
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.file(File(_capturedPath!), fit: BoxFit.contain),
        Positioned(
          top: MediaQuery.of(context).padding.top + 16, left: 16, right: 16,
          child: Row(children: [
            GestureDetector(
              onTap: () => setState(() => _capturedPath = null),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(10)),
                child: const Row(children: [
                  Icon(Icons.replay, color: Colors.white, size: 18),
                  SizedBox(width: 6),
                  Text('Retake', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
            const Spacer(),
            GestureDetector(
              onTap: () => Navigator.pop(context, _capturedPath),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(color: widget.accentColor, borderRadius: BorderRadius.circular(10)),
                child: const Row(children: [
                  Icon(Icons.check, color: Colors.white, size: 18),
                  SizedBox(width: 6),
                  Text('Use Photo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
          ]),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.camera_alt_outlined, size: 64, color: Colors.grey.shade600),
        const SizedBox(height: 16),
        const Text('Camera unavailable', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text('Please grant camera permission\nand try again', textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => _initCamera(),
          style: ElevatedButton.styleFrom(backgroundColor: widget.accentColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          child: const Text('Retry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}

/// Grid overlay painter for camera.
class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white24
      ..strokeWidth = 0.5;

    // Vertical lines (rule of thirds)
    canvas.drawLine(Offset(size.width / 3, 0), Offset(size.width / 3, size.height), paint);
    canvas.drawLine(Offset(2 * size.width / 3, 0), Offset(2 * size.width / 3, size.height), paint);

    // Horizontal lines
    canvas.drawLine(Offset(0, size.height / 3), Offset(size.width, size.height / 3), paint);
    canvas.drawLine(Offset(0, 2 * size.height / 3), Offset(size.width, 2 * size.height / 3), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
