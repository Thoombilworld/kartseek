import 'dart:async';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:kartseek_shared_mobile/core/services/microphone_service.dart';

/// KARTSEEK Voice Search Bottom Sheet — animated voice input UI.
///
/// A beautiful, reusable bottom sheet that provides voice search
/// functionality across all modules. Features:
///   • Animated pulsing microphone indicator
///   • Real-time partial recognition text
///   • Module-specific accent colors and hints
///   • Auto-closes on final recognition
///   • Graceful fallback when mic is unavailable
///
/// Usage:
/// ```dart
/// VoiceSearchSheet.show(
///   context: context,
///   accentColor: AppTheme.marketplaceColor,
///   hintText: 'Try "iPhone 15" or "red shoes"',
///   onResult: (text) {
///     // Use recognized text
///   },
/// );
/// ```
class VoiceSearchSheet extends StatefulWidget {
  final Color accentColor;
  final String hintText;
  final String? localeId;
  final void Function(String text) onResult;

  const VoiceSearchSheet({
    super.key,
    required this.accentColor,
    required this.hintText,
    required this.onResult,
    this.localeId,
  });

  /// Show the voice search bottom sheet.
  static Future<void> show({
    required BuildContext context,
    required Color accentColor,
    required String hintText,
    required void Function(String text) onResult,
    String? localeId,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => VoiceSearchSheet(
        accentColor: accentColor,
        hintText: hintText,
        onResult: onResult,
        localeId: localeId,
      ),
    );
  }

  @override
  State<VoiceSearchSheet> createState() => _VoiceSearchSheetState();
}

class _VoiceSearchSheetState extends State<VoiceSearchSheet>
    with TickerProviderStateMixin {
  final MicrophoneService _mic = MicrophoneService.instance;

  String _recognizedText = '';
  bool _isListening = false;
  bool _hasError = false;
  bool _isAutoSubmitting = false;
  String _errorMessage = '';
  bool _isInitializing = true;

  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  late final AnimationController _waveController;
  late final Animation<double> _waveAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _waveController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _waveAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _waveController, curve: Curves.easeInOut),
    );

    _startListening();
  }

  Future<void> _startListening() async {
    setState(() {
      _isInitializing = true;
      _hasError = false;
    });

    final started = await _mic.startListening(
      onResult: (text, isFinal) {
        if (!mounted) return;
        setState(() {
          _recognizedText = text;
        });
        if (isFinal && text.isNotEmpty) {
          // Show auto-submit state before closing
          setState(() => _isAutoSubmitting = true);
          _pulseController.stop();
          _waveController.stop();
          widget.onResult(text);
          Future.delayed(const Duration(milliseconds: 600), () {
            if (mounted) Navigator.pop(context);
          });
        }
      },
      localeId: widget.localeId,
    );

    if (!mounted) return;

    if (started) {
      setState(() {
        _isListening = true;
        _isInitializing = false;
      });
      _pulseController.repeat(reverse: true);
      _waveController.repeat(reverse: true);
    } else {
      // Check if permission is permanently denied
      final permDenied = await _mic.isPermissionPermanentlyDenied;
      setState(() {
        _hasError = true;
        _isInitializing = false;
        _errorMessage = permDenied
            ? 'Microphone permission was denied. Please enable it in Settings.'
            : 'Voice search is not available. Please grant microphone permission.';
      });
    }
  }

  @override
  void dispose() {
    _mic.stopListening();
    _pulseController.dispose();
    _waveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom +
            MediaQuery.of(context).padding.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),

          // Title
          Text(
            _isAutoSubmitting
                ? 'Searching...'
                : _isInitializing
                    ? 'Initializing...'
                    : _hasError
                        ? 'Microphone Unavailable'
                        : _isListening
                            ? 'Listening...'
                            : 'Processing...',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: _isAutoSubmitting
                  ? widget.accentColor
                  : _hasError
                      ? Colors.red.shade400
                      : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),

          // Hint or recognized text
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Column(
              children: [
                Text(
                  _recognizedText.isNotEmpty
                      ? '"$_recognizedText"'
                      : _hasError
                          ? _errorMessage
                          : widget.hintText,
                  style: TextStyle(
                    fontSize: _recognizedText.isNotEmpty ? 18 : 14,
                    fontWeight: _recognizedText.isNotEmpty
                        ? FontWeight.w700
                        : FontWeight.w500,
                    color: _recognizedText.isNotEmpty
                        ? widget.accentColor
                        : Colors.grey.shade500,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                if (_isAutoSubmitting) ...[
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 14, height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2, color: widget.accentColor,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('Auto-submitting...',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ] else if (_isListening && _recognizedText.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Pause speaking to auto-search',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400,
                        fontWeight: FontWeight.w500),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 36),

          // Microphone button with pulse
          if (_hasError)
            _buildErrorState()
          else if (_isInitializing)
            SizedBox(
              width: 80,
              height: 80,
              child: CircularProgressIndicator(
                color: widget.accentColor,
                strokeWidth: 3,
              ),
            )
          else
            _buildMicButton(),

          const SizedBox(height: 28),

          // Cancel / Retry
          GestureDetector(
            onTap: () {
              if (_hasError) {
                _startListening();
              } else {
                _mic.cancelListening();
                Navigator.pop(context);
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Text(
                _hasError ? 'Retry' : 'Cancel',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildMicButton() {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (_, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer pulse ring
            Transform.scale(
              scale: _pulseAnimation.value,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.accentColor.withValues(alpha: 0.08),
                ),
              ),
            ),
            // Inner pulse ring
            AnimatedBuilder(
              animation: _waveAnimation,
              builder: (_, __) => Transform.scale(
                scale: 1.0 + (_waveAnimation.value * 0.15),
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.accentColor.withValues(alpha: 0.12),
                  ),
                ),
              ),
            ),
            // Main mic button
            GestureDetector(
              onTap: () async {
                if (_isListening) {
                  await _mic.stopListening();
                  if (mounted) {
                    setState(() => _isListening = false);
                    _pulseController.stop();
                    _waveController.stop();
                  }
                } else {
                  _startListening();
                }
              },
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      widget.accentColor,
                      widget.accentColor.withValues(alpha: 0.8),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: widget.accentColor.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(
                  _isListening ? Icons.mic : Icons.mic_off,
                  color: Colors.white,
                  size: 30,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildErrorState() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.red.shade50,
          ),
          child: Icon(Icons.mic_off, color: Colors.red.shade300, size: 36),
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: () => openAppSettings(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: BoxDecoration(
              color: widget.accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Open Settings',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: widget.accentColor,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
