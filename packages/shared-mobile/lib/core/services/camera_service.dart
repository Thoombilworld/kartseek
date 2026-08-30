import 'dart:io';
import 'dart:ui' show Offset;
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

/// KARTSEEK Camera Service — unified camera access for all modules.
///
/// Usage per module:
///   • **Marketplace** — Visual search (scan product/barcode), review photo upload
///   • **Grocery** — Scan product barcodes, report product issues
///   • **Restaurant** — Food photo upload for reviews, scan QR for table ordering
///   • **Pharmacy** — Prescription photo capture, medicine barcode scanning
///   • **Doctor** — Upload symptom photos, video consultation preview
///   • **Taxi** — Scan license plates, capture ride safety screenshots
///
/// This service wraps the `camera` plugin and provides:
///   1. A singleton with lazy initialization
///   2. Camera enumeration and selection (front/back)
///   3. Image capture with auto-path management
///   4. Video recording start/stop
///   5. Flash control
///   6. Proper lifecycle management (dispose/resume)
///   7. Runtime permission requests with retry support
class CameraService {
  CameraService._();
  static final CameraService _instance = CameraService._();
  static CameraService get instance => _instance;

  List<CameraDescription> _cameras = [];
  CameraController? _controller;
  bool _isInitialized = false;

  /// All available cameras on the device.
  List<CameraDescription> get cameras => _cameras;

  /// Whether the camera service has been initialized.
  bool get isInitialized => _isInitialized;

  /// The active camera controller (null if not initialized).
  CameraController? get controller => _controller;

  /// Whether the controller is ready and streaming.
  bool get isReady => _controller?.value.isInitialized ?? false;

  /// Current camera lens direction.
  CameraLensDirection? get lensDirection => _controller?.description.lensDirection;

  // ── Permission ────────────────────────────────────────────────────────

  /// Request camera permission at runtime. Returns true if granted.
  Future<bool> requestPermission() async {
    final status = await Permission.camera.status;
    if (status.isGranted) return true;

    final result = await Permission.camera.request();
    debugPrint('[CameraService] 📋 Permission: $result');
    return result.isGranted;
  }

  /// Whether camera permission has been permanently denied.
  Future<bool> get isPermissionPermanentlyDenied async =>
      await Permission.camera.isPermanentlyDenied;

  // ── Initialization ──────────────────────────────────────────────────────

  /// Discover available cameras on the device.
  /// Retries on each call if cameras list is empty (e.g. permission was
  /// denied on first attempt but granted later).
  Future<void> discoverCameras() async {
    // If cameras are already found, skip re-discovery
    if (_cameras.isNotEmpty) return;

    try {
      _cameras = await availableCameras();
      debugPrint('[CameraService] 📷 Found ${_cameras.length} cameras');
    } catch (e) {
      debugPrint('[CameraService] ⚠️ Camera discovery failed: $e');
      _cameras = [];
    }
  }

  /// Initialize a camera controller for the given lens direction.
  /// Defaults to back camera. Resolution defaults to medium for fast init.
  ///
  /// Automatically requests camera permission if not already granted.
  Future<CameraController?> initialize({
    CameraLensDirection lens = CameraLensDirection.back,
    ResolutionPreset resolution = ResolutionPreset.medium,
    bool enableAudio = false,
  }) async {
    // Request permission first
    final hasPermission = await requestPermission();
    if (!hasPermission) {
      debugPrint('[CameraService] ❌ Camera permission denied');
      return null;
    }

    // Discover cameras (retries if list was empty from prior call)
    await discoverCameras();

    if (_cameras.isEmpty) {
      debugPrint('[CameraService] ❌ No cameras available on this device');
      return null;
    }

    // Find the requested camera
    final camera = _cameras.firstWhere(
      (c) => c.lensDirection == lens,
      orElse: () => _cameras.first,
    );

    // Dispose previous controller if any
    await dispose();

    _controller = CameraController(
      camera,
      resolution,
      enableAudio: enableAudio,
      imageFormatGroup: Platform.isAndroid
          ? ImageFormatGroup.nv21
          : ImageFormatGroup.bgra8888,
    );

    try {
      await _controller!.initialize();
      _isInitialized = true;
      debugPrint('[CameraService] ✅ Camera initialized: ${camera.lensDirection} (${camera.name})');
      return _controller;
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Camera init failed: ${e.code} — ${e.description}');
      _controller = null;
      _isInitialized = false;
      return null;
    }
  }

  // ── Photo Capture ───────────────────────────────────────────────────────

  /// Capture a still image and save to temporary directory.
  /// Returns the file path, or null on failure.
  ///
  /// [prefix] — filename prefix for organizing by module (e.g. 'prescription', 'review').
  Future<String?> captureImage({String prefix = 'kartseek'}) async {
    if (_controller == null || !_controller!.value.isInitialized) {
      debugPrint('[CameraService] ❌ Controller not ready for capture');
      return null;
    }
    if (_controller!.value.isTakingPicture) {
      debugPrint('[CameraService] ⏳ Already capturing...');
      return null;
    }

    try {
      final XFile image = await _controller!.takePicture();
      final dir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final newPath = '${dir.path}/${prefix}_$timestamp.jpg';
      final savedFile = await File(image.path).copy(newPath);
      debugPrint('[CameraService] 📸 Captured: ${savedFile.path}');
      return savedFile.path;
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Capture failed: ${e.code} — ${e.description}');
      return null;
    }
  }

  // ── Video Recording ─────────────────────────────────────────────────────

  /// Start video recording. Returns true on success.
  /// Used by: Doctor video consultation, Taxi ride safety.
  Future<bool> startVideoRecording() async {
    if (_controller == null || !_controller!.value.isInitialized) return false;
    if (_controller!.value.isRecordingVideo) return false;

    try {
      await _controller!.startVideoRecording();
      debugPrint('[CameraService] 🎬 Recording started');
      return true;
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Video start failed: ${e.code}');
      return false;
    }
  }

  /// Stop video recording. Returns the file path, or null on failure.
  Future<String?> stopVideoRecording({String prefix = 'kartseek_video'}) async {
    if (_controller == null || !_controller!.value.isRecordingVideo) return null;

    try {
      final XFile video = await _controller!.stopVideoRecording();
      final dir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final newPath = '${dir.path}/${prefix}_$timestamp.mp4';
      final savedFile = await File(video.path).copy(newPath);
      debugPrint('[CameraService] 🎬 Recorded: ${savedFile.path}');
      return savedFile.path;
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Video stop failed: ${e.code}');
      return null;
    }
  }

  // ── Flash Control ───────────────────────────────────────────────────────

  /// Set flash mode. Useful for scanning barcodes/prescriptions in low light.
  Future<void> setFlashMode(FlashMode mode) async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      await _controller!.setFlashMode(mode);
      debugPrint('[CameraService] 🔦 Flash: $mode');
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Flash failed: ${e.code}');
    }
  }

  /// Toggle flash between off and torch.
  Future<FlashMode> toggleFlash() async {
    final current = _controller?.value.flashMode ?? FlashMode.off;
    final next = current == FlashMode.off ? FlashMode.torch : FlashMode.off;
    await setFlashMode(next);
    return next;
  }

  // ── Camera Switching ────────────────────────────────────────────────────

  /// Switch between front and back cameras.
  /// Used by: Doctor video consultation (switch during call).
  Future<CameraController?> switchCamera({
    ResolutionPreset resolution = ResolutionPreset.medium,
    bool enableAudio = false,
  }) async {
    if (_cameras.length < 2) return _controller;
    final currentLens = _controller?.description.lensDirection ?? CameraLensDirection.back;
    final newLens = currentLens == CameraLensDirection.back
        ? CameraLensDirection.front
        : CameraLensDirection.back;
    return initialize(lens: newLens, resolution: resolution, enableAudio: enableAudio);
  }

  // ── Zoom Control ────────────────────────────────────────────────────────

  /// Set zoom level (1.0 = no zoom).
  Future<void> setZoom(double zoom) async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      final minZoom = await _controller!.getMinZoomLevel();
      final maxZoom = await _controller!.getMaxZoomLevel();
      await _controller!.setZoomLevel(zoom.clamp(minZoom, maxZoom));
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Zoom failed: ${e.code}');
    }
  }

  /// Get the zoom level range [min, max].
  Future<(double, double)> getZoomRange() async {
    if (_controller == null || !_controller!.value.isInitialized) return (1.0, 1.0);
    final min = await _controller!.getMinZoomLevel();
    final max = await _controller!.getMaxZoomLevel();
    return (min, max);
  }

  // ── Focus Control ───────────────────────────────────────────────────────

  /// Set focus point (for tap-to-focus). Coordinates are 0.0–1.0.
  Future<void> setFocusPoint(double x, double y) async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      await _controller!.setFocusPoint(Offset(x, y));
      await _controller!.setFocusMode(FocusMode.auto);
    } on CameraException catch (e) {
      debugPrint('[CameraService] ❌ Focus failed: ${e.code}');
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /// Pause the camera (call in didChangeAppLifecycleState when paused).
  Future<void> pause() async {
    if (_controller != null && _controller!.value.isInitialized) {
      await _controller!.pausePreview();
    }
  }

  /// Resume the camera (call in didChangeAppLifecycleState when resumed).
  Future<void> resume() async {
    if (_controller != null && _controller!.value.isInitialized) {
      await _controller!.resumePreview();
    }
  }

  /// Dispose the camera controller. Call when leaving camera screens.
  Future<void> dispose() async {
    if (_controller != null) {
      if (_controller!.value.isInitialized) {
        try {
          await _controller!.dispose();
        } catch (_) {}
      }
      _controller = null;
      _isInitialized = false;
      debugPrint('[CameraService] 🔌 Camera disposed');
    }
  }
}
