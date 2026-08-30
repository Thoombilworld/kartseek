import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';

/// Pharmacy Barcode & Product Scanner
///
/// Three modes:
/// - Barcode: Real-time EAN-13/UPC-A/QR code decoding via camera
/// - Text/OCR: On-device text recognition from medicine packaging
/// - Gallery: Pick an image to extract barcodes or text
class PharmacyScannerScreen extends StatefulWidget {
  const PharmacyScannerScreen({super.key});

  @override
  State<PharmacyScannerScreen> createState() => _PharmacyScannerScreenState();
}

enum _ScanMode { barcode, ocr, gallery }

class _PharmacyScannerScreenState extends State<PharmacyScannerScreen>
    with TickerProviderStateMixin {
  late final MobileScannerController _cameraController;
  final TextRecognizer _textRecognizer = TextRecognizer();
  final ImagePicker _imagePicker = ImagePicker();

  _ScanMode _mode = _ScanMode.barcode;
  bool _isFlashOn = false;
  bool _isProcessingOcr = false;
  String? _detectedText;
  String? _lastOcrText;

  // Scan line animation
  late final AnimationController _scanLineAnim;
  late final Animation<double> _scanLinePosition;

  // Result sheet animation
  late final AnimationController _sheetAnim;

  @override
  void initState() {
    super.initState();

    _cameraController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _scanLineAnim = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _scanLinePosition = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _scanLineAnim, curve: Curves.easeInOut),
    );

    _sheetAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _textRecognizer.close();
    _scanLineAnim.dispose();
    _sheetAnim.dispose();
    super.dispose();
  }

  // ── Barcode Detection Callback ──────────────────────────────────────────────

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_mode != _ScanMode.barcode) return;

    for (final barcode in capture.barcodes) {
      final code = barcode.rawValue;
      if (code == null || code.isEmpty) continue;

      final format = barcode.format.name;

      // Haptic feedback on detection
      HapticFeedback.mediumImpact();

      // Dispatch to bloc
      context.read<PharmacyBloc>().add(ScanBarcode(code: code, format: format));

      // Show result sheet
      _sheetAnim.forward();
      break; // Only process the first valid barcode
    }
  }

  // ── OCR Processing ─────────────────────────────────────────────────────────

  Future<void> _processOcrFrame(BarcodeCapture capture) async {
    if (_mode != _ScanMode.ocr || _isProcessingOcr) return;

    _isProcessingOcr = true;

    try {
      // Process any detected barcodes/text from OCR mode
      for (final barcode in capture.barcodes) {
        final code = barcode.rawValue;
        if (code != null && code.length >= 3) {
          setState(() => _detectedText = code);
          if (code != _lastOcrText) {
            _lastOcrText = code;
            HapticFeedback.lightImpact();
            context.read<PharmacyBloc>().add(ScanTextRecognized(code));
            _sheetAnim.forward();
          }
        }
      }
    } finally {
      _isProcessingOcr = false;
    }
  }

  // ── Gallery Processing ─────────────────────────────────────────────────────

  Future<void> _pickAndProcessImage() async {
    final XFile? file = await _imagePicker.pickImage(source: ImageSource.gallery);
    if (file == null) return;

    setState(() => _mode = _ScanMode.gallery);

    // Process with text recognizer
    final inputImage = InputImage.fromFilePath(file.path);
    final recognized = await _textRecognizer.processImage(inputImage);

    if (recognized.text.isNotEmpty) {
      // Extract the most likely medicine name (longest capitalized phrase)
      final lines = recognized.blocks
          .expand((b) => b.lines)
          .map((l) => l.text.trim())
          .where((t) => t.length >= 3)
          .toList();

      // Sort by length descending — longer lines more likely to be product names
      lines.sort((a, b) => b.length.compareTo(a.length));

      final bestMatch = lines.isNotEmpty ? lines.first : recognized.text;

      setState(() => _detectedText = bestMatch);

      if (mounted) {
        HapticFeedback.mediumImpact();
        context.read<PharmacyBloc>().add(ScanTextRecognized(bestMatch));
        _sheetAnim.forward();
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('No text or barcode found in image'),
            backgroundColor: Colors.red.shade400,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  // ── Flash Toggle ───────────────────────────────────────────────────────────

  void _toggleFlash() {
    _cameraController.toggleTorch();
    setState(() => _isFlashOn = !_isFlashOn);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Camera Preview ──────────────────────────────────────────────
          if (_mode != _ScanMode.gallery)
            MobileScanner(
              controller: _cameraController,
              onDetect: _mode == _ScanMode.barcode
                  ? _onBarcodeDetected
                  : _processOcrFrame,
            )
          else
            Container(
              color: const Color(0xFF111111),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.photo_library_rounded, size: 64,
                        color: AppTheme.pharmacyColor.withValues(alpha: 0.5)),
                    const SizedBox(height: 16),
                    Text('Gallery Mode',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text(
                        _detectedText != null
                            ? 'Detected: $_detectedText'
                            : 'Photo processed for text and barcodes',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.4),
                            fontSize: 13),
                        textAlign: TextAlign.center),
                  ],
                ),
              ),
            ),

          // ── App Bar ─────────────────────────────────────────────────────
          _buildAppBar(),

          // ── Scan Viewfinder Overlay ────────────────────────────────────
          if (_mode != _ScanMode.gallery) _buildViewfinder(),

          // ── Detection Badge ────────────────────────────────────────────
          _buildDetectionBadge(),

          // ── Bottom Controls ────────────────────────────────────────────
          _buildBottomControls(),

          // ── Results Sheet ──────────────────────────────────────────────
          _buildResultsSheet(),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return Positioned(
      top: 0, left: 0, right: 0,
      child: Container(
        padding: EdgeInsets.fromLTRB(8, MediaQuery.of(context).padding.top + 4, 8, 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [Colors.black.withValues(alpha: 0.8), Colors.transparent],
          ),
        ),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 24),
              onPressed: () {
                context.read<PharmacyBloc>().add(const ClearScanResults());
                Navigator.pop(context);
              },
            ),
            const Expanded(
              child: Text('Scan Medicine',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700,
                      color: Colors.white, letterSpacing: -0.3)),
            ),
            IconButton(
              icon: Icon(
                _isFlashOn ? Icons.flash_on : Icons.flash_off,
                color: _isFlashOn ? Colors.amber : Colors.white60,
                size: 22,
              ),
              onPressed: _toggleFlash,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildViewfinder() {
    return Center(
      child: SizedBox(
        width: 280, height: 280,
        child: Stack(
          children: [
            // Corner brackets
            ..._buildCornerBrackets(),

            // Scan line animation
            AnimatedBuilder(
              animation: _scanLinePosition,
              builder: (context, _) => Positioned(
                top: _scanLinePosition.value * 260 + 10,
                left: 10, right: 10,
                child: Container(
                  height: 2,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        AppTheme.pharmacyColor.withValues(alpha: 0.8),
                        AppTheme.pharmacyColor,
                        AppTheme.pharmacyColor.withValues(alpha: 0.8),
                        Colors.transparent,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.pharmacyColor.withValues(alpha: 0.4),
                        blurRadius: 12, spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Center icon
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _mode == _ScanMode.barcode
                        ? Icons.qr_code_scanner_rounded
                        : Icons.text_fields_rounded,
                    size: 48,
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _mode == _ScanMode.barcode
                        ? 'Point at barcode'
                        : 'Point at medicine text',
                    style: TextStyle(
                      fontSize: 13, color: Colors.white.withValues(alpha: 0.6),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildCornerBrackets() {
    const size = 32.0;
    const thickness = 3.5;
    const color = AppTheme.pharmacyColor;

    Widget corner(Alignment align) {
      final isTop = align == Alignment.topLeft || align == Alignment.topRight;
      final isLeft = align == Alignment.topLeft || align == Alignment.bottomLeft;

      return Align(
        alignment: align,
        child: SizedBox(
          width: size, height: size,
          child: CustomPaint(
            painter: _CornerPainter(
              color: color, thickness: thickness,
              isTop: isTop, isLeft: isLeft,
            ),
          ),
        ),
      );
    }

    return [
      corner(Alignment.topLeft),
      corner(Alignment.topRight),
      corner(Alignment.bottomLeft),
      corner(Alignment.bottomRight),
    ];
  }

  Widget _buildDetectionBadge() {
    return BlocBuilder<PharmacyBloc, PharmacyState>(
      buildWhen: (p, c) => p.lastScannedCode != c.lastScannedCode || p.scanStatus != c.scanStatus,
      builder: (context, state) {
        if (state.lastScannedCode == null) return const SizedBox.shrink();

        return Positioned(
          top: MediaQuery.of(context).padding.top + 60,
          left: 20, right: 20,
          child: AnimatedOpacity(
            opacity: 1.0,
            duration: const Duration(milliseconds: 300),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: state.scanStatus == PharmacyStatus.loading
                      ? Colors.amber.withValues(alpha: 0.5)
                      : AppTheme.pharmacyColor.withValues(alpha: 0.5),
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: state.scanStatus == PharmacyStatus.loading
                          ? Colors.amber.withValues(alpha: 0.2)
                          : AppTheme.pharmacyColor.withValues(alpha: 0.2),
                    ),
                    child: Icon(
                      state.scanStatus == PharmacyStatus.loading
                          ? Icons.hourglass_top_rounded
                          : Icons.check_circle_rounded,
                      color: state.scanStatus == PharmacyStatus.loading
                          ? Colors.amber
                          : AppTheme.pharmacyColor,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          state.lastScanFormat == 'TEXT_OCR' ? 'Text Recognized' : 'Code Detected',
                          style: const TextStyle(fontSize: 11, color: Colors.white60,
                              fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          state.lastScannedCode!.length > 30
                              ? '${state.lastScannedCode!.substring(0, 30)}...'
                              : state.lastScannedCode!,
                          style: const TextStyle(fontSize: 14, color: Colors.white,
                              fontWeight: FontWeight.w700, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                  if (state.scanStatus == PharmacyStatus.loading)
                    const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.amber,
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBottomControls() {
    return Positioned(
      bottom: 0, left: 0, right: 0,
      child: Container(
        padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).padding.bottom + 20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [Colors.transparent, Colors.black.withValues(alpha: 0.9)],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Mode selector
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _modeButton(Icons.qr_code_rounded, 'Barcode', _ScanMode.barcode),
                const SizedBox(width: 24),
                _modeButton(Icons.text_fields_rounded, 'Text/OCR', _ScanMode.ocr),
                const SizedBox(width: 24),
                _modeButton(Icons.photo_library_rounded, 'Gallery', _ScanMode.gallery),
              ],
            ),
            const SizedBox(height: 16),

            // Mode description
            Text(
              _mode == _ScanMode.barcode
                  ? 'Point camera at a barcode or QR code'
                  : _mode == _ScanMode.ocr
                      ? 'Point camera at medicine text'
                      : 'Pick a photo of medicine packaging',
              style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5)),
            ),

            // Gallery button
            if (_mode == _ScanMode.gallery) ...[
              const SizedBox(height: 20),
              GestureDetector(
                onTap: _pickAndProcessImage,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.pharmacyColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.pharmacyColor.withValues(alpha: 0.4),
                        blurRadius: 16, offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.upload_rounded, color: Colors.white, size: 20),
                      SizedBox(width: 10),
                      Text('Choose Photo',
                          style: TextStyle(color: Colors.white, fontSize: 15,
                              fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ],

            // OCR capture button
            if (_mode == _ScanMode.ocr) ...[
              const SizedBox(height: 20),
              GestureDetector(
                onTap: _pickAndProcessImage,  // Use gallery picker for OCR too
                child: Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.15),
                    border: Border.all(color: AppTheme.pharmacyColor, width: 3),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 28),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _modeButton(IconData icon, String label, _ScanMode mode) {
    final isActive = _mode == mode;
    return GestureDetector(
      onTap: () {
        setState(() => _mode = mode);
        context.read<PharmacyBloc>().add(const ClearScanResults());
        _sheetAnim.reverse();
        if (mode == _ScanMode.gallery) {
          _pickAndProcessImage();
        }
      },
      child: Column(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            width: 52, height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? AppTheme.pharmacyColor : Colors.white.withValues(alpha: 0.1),
              boxShadow: isActive
                  ? [BoxShadow(color: AppTheme.pharmacyColor.withValues(alpha: 0.4),
                       blurRadius: 12, spreadRadius: 1)]
                  : null,
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 6),
          Text(label,
              style: TextStyle(
                fontSize: 11,
                color: isActive ? Colors.white : Colors.white54,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
              )),
        ],
      ),
    );
  }

  Widget _buildResultsSheet() {
    return BlocBuilder<PharmacyBloc, PharmacyState>(
      buildWhen: (p, c) => p.scanResults != c.scanResults || p.scanStatus != c.scanStatus,
      builder: (context, state) {
        if (state.scanStatus == PharmacyStatus.initial) return const SizedBox.shrink();

        return AnimatedBuilder(
          animation: _sheetAnim,
          builder: (context, _) {
            final offset = (1 - _sheetAnim.value) * 400;
            return Positioned(
              bottom: offset > 300 ? -400 : -offset,
              left: 0, right: 0,
              child: _buildResultsContent(state),
            );
          },
        );
      },
    );
  }

  Widget _buildResultsContent(PharmacyState state) {
    final cs = RegionService.instance.currentCountry.currencySymbol;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.45,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 24, offset: const Offset(0, -8)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40, height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                Icon(
                  state.scanStatus == PharmacyStatus.loading
                      ? Icons.search_rounded
                      : state.scanResults.isNotEmpty
                          ? Icons.check_circle_rounded
                          : Icons.error_outline_rounded,
                  color: state.scanResults.isNotEmpty ? AppTheme.pharmacyColor : Colors.red.shade400,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        state.scanStatus == PharmacyStatus.loading
                            ? 'Searching...'
                            : state.scanResults.isNotEmpty
                                ? '${state.scanResults.length} product${state.scanResults.length > 1 ? 's' : ''} found'
                                : 'No products found',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.black87),
                      ),
                      if (state.scanMatchType != null)
                        Text(
                          'via ${state.scanMatchType!.replaceAll('_', ' ')}',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: () {
                    _sheetAnim.reverse();
                    context.read<PharmacyBloc>().add(const ClearScanResults());
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Loading indicator
          if (state.scanStatus == PharmacyStatus.loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: CircularProgressIndicator(color: AppTheme.pharmacyColor),
            ),

          // Empty state
          if (state.scanStatus == PharmacyStatus.empty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
              child: Column(
                children: [
                  Icon(Icons.search_off_rounded, size: 48, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  const Text('No matching products found',
                      style: TextStyle(fontSize: 14, color: Colors.black45, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, '/pharmacy/search');
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('Search Manually',
                          style: TextStyle(color: AppTheme.pharmacyColor,
                              fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),

          // Results list
          if (state.scanResults.isNotEmpty)
            Flexible(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                shrinkWrap: true,
                itemCount: state.scanResults.length,
                itemBuilder: (ctx, i) => _scanResultTile(ctx, state.scanResults[i], cs),
              ),
            ),
        ],
      ),
    );
  }

  Widget _scanResultTile(BuildContext context, PharmacyProduct product, String cs) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.medicineDetail, arguments: product.name),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            // Product icon
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(
                color: AppTheme.pharmacyColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(Icons.medication_rounded, color: AppTheme.pharmacyColor.withValues(alpha: 0.6), size: 24),
            ),
            const SizedBox(width: 14),
            // Product info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(product.name,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.black87),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                      if (product.needsRx) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('Rx', style: TextStyle(
                              fontSize: 9, fontWeight: FontWeight.w900,
                              color: Colors.red.shade600)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text('${product.brand} • ${product.pack}',
                      style: const TextStyle(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text('$cs ${product.price.toInt()}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.black87)),
                      if (product.discount > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('${product.discount}% OFF',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800,
                                  color: Colors.green.shade700)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Add button
            GestureDetector(
              onTap: () {
                if (product.inStock && !product.needsRx) {
                  context.read<PharmacyBloc>().add(AddMedicineToCart(
                    medicineId: product.id,
                    storeId: product.storeId,
                    storeName: product.storeId,
                  ));
                  HapticFeedback.lightImpact();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${product.name} added to cart'),
                      backgroundColor: AppTheme.pharmacyColor,
                      duration: const Duration(seconds: 1),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  );
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: !product.inStock
                      ? Colors.grey.shade100
                      : product.needsRx
                          ? const Color(0xFFFFF7ED)
                          : AppTheme.pharmacyColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  !product.inStock
                      ? 'N/A'
                      : product.needsRx
                          ? 'View'
                          : 'Add',
                  style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w800,
                    color: !product.inStock
                        ? Colors.black38
                        : product.needsRx
                            ? Colors.orange.shade700
                            : Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Corner Painter ────────────────────────────────────────────────────────────

class _CornerPainter extends CustomPainter {
  final Color color;
  final double thickness;
  final bool isTop;
  final bool isLeft;

  _CornerPainter({
    required this.color,
    required this.thickness,
    required this.isTop,
    required this.isLeft,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    if (isTop && isLeft) {
      path.moveTo(0, size.height);
      path.lineTo(0, 0);
      path.lineTo(size.width, 0);
    } else if (isTop && !isLeft) {
      path.moveTo(0, 0);
      path.lineTo(size.width, 0);
      path.lineTo(size.width, size.height);
    } else if (!isTop && isLeft) {
      path.moveTo(0, 0);
      path.lineTo(0, size.height);
      path.lineTo(size.width, size.height);
    } else {
      path.moveTo(size.width, 0);
      path.lineTo(size.width, size.height);
      path.lineTo(0, size.height);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
