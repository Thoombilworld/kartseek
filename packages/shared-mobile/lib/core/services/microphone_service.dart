import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';

/// KARTSEEK Microphone Service — unified voice input for all modules.
///
/// Usage per module:
///   • **Marketplace** — Voice search for products, brands, categories
///   • **Grocery** — Voice search for groceries, "Add milk, bread, eggs"
///   • **Restaurant** — Voice search for restaurants, cuisines, dishes
///   • **Pharmacy** — Voice search for medicines, voice prescription notes
///   • **Doctor** — Voice search + symptom voice notes for consultation
///   • **Taxi** — Voice destination input, "Take me to airport"
///
/// This service provides:
///   1. A singleton with lazy initialization
///   2. Speech-to-text recognition (voice search)
///   3. Locale/language support
///   4. Runtime permission request with retry support
///   5. Proper lifecycle management
class MicrophoneService {
  MicrophoneService._();
  static final MicrophoneService _instance = MicrophoneService._();
  static MicrophoneService get instance => _instance;

  final SpeechToText _speech = SpeechToText();

  bool _speechInitialized = false;
  bool _isListening = false;

  /// Available locales for speech recognition.
  List<LocaleName> _locales = [];

  /// Whether speech-to-text has been initialized.
  bool get isInitialized => _speechInitialized;

  /// Whether currently listening for speech.
  bool get isListening => _isListening;

  /// Available speech recognition locales.
  List<LocaleName> get locales => _locales;

  // ── Permission ────────────────────────────────────────────────────────

  /// Request microphone permission at runtime. Returns true if granted.
  Future<bool> requestPermission() async {
    final status = await Permission.microphone.status;
    if (status.isGranted) return true;

    final result = await Permission.microphone.request();
    debugPrint('[MicService] 📋 Permission: $result');
    return result.isGranted;
  }

  /// Whether mic permission has been permanently denied.
  Future<bool> get isPermissionPermanentlyDenied async =>
      await Permission.microphone.isPermanentlyDenied;

  // ── Speech-to-Text Initialization ──────────────────────────────────────

  /// Initialize speech recognition engine.
  /// Retries on each call if previous init failed (e.g. permission denied).
  Future<bool> initialize() async {
    // If already initialized, skip
    if (_speechInitialized) return true;

    // Request microphone permission first
    final hasPermission = await requestPermission();
    if (!hasPermission) {
      debugPrint('[MicService] ❌ Microphone permission denied');
      return false;
    }

    try {
      _speechInitialized = await _speech.initialize(
        onError: (error) {
          debugPrint('[MicService] ⚠️ Speech error: ${error.errorMsg}');
          _isListening = false;
        },
        onStatus: (status) {
          debugPrint('[MicService] 📢 Status: $status');
          if (status == 'notListening' || status == 'done') {
            _isListening = false;
          }
        },
        debugLogging: false,
      );

      if (_speechInitialized) {
        _locales = await _speech.locales();
        debugPrint('[MicService] ✅ Speech initialized — ${_locales.length} locales available');
      } else {
        debugPrint('[MicService] ⚠️ Speech not available on this device');
      }
    } catch (e) {
      debugPrint('[MicService] ⚠️ Speech init failed: $e');
      _speechInitialized = false;
    }

    return _speechInitialized;
  }

  // ── Voice Search (Speech-to-Text) ─────────────────────────────────────

  /// Start listening for speech and stream recognized words.
  ///
  /// [onResult] — called with each recognition result (partial + final).
  /// [localeId] — BCP-47 locale (e.g. 'en_US', 'hi_IN', 'sw_KE'). Defaults to device locale.
  /// [listenFor] — max duration. Defaults to 30 seconds.
  /// [pauseFor] — auto-stop after silence. Defaults to 1.5 seconds.
  Future<bool> startListening({
    required void Function(String text, bool isFinal) onResult,
    String? localeId,
    Duration listenFor = const Duration(seconds: 30),
    Duration pauseFor = const Duration(milliseconds: 1500),
  }) async {
    if (!_speechInitialized) {
      final ok = await initialize();
      if (!ok) return false;
    }

    if (_isListening) {
      debugPrint('[MicService] ⏳ Already listening...');
      return true;
    }

    try {
      _isListening = true;
      _speech.listen(
        onResult: (SpeechRecognitionResult result) {
          onResult(result.recognizedWords, result.finalResult);
        },
        listenOptions: SpeechListenOptions(
          localeId: localeId,
          listenFor: listenFor,
          pauseFor: pauseFor,
          listenMode: ListenMode.confirmation,
          cancelOnError: true,
          partialResults: true,
        ),
      );
      debugPrint('[MicService] 🎙️ Listening started (locale: ${localeId ?? "default"})');
      return true;
    } catch (e) {
      debugPrint('[MicService] ❌ Listen failed: $e');
      _isListening = false;
      return false;
    }
  }

  /// Stop listening for speech.
  Future<void> stopListening() async {
    if (!_isListening) return;
    try {
      await _speech.stop();
      _isListening = false;
      debugPrint('[MicService] ⏹️ Listening stopped');
    } catch (e) {
      debugPrint('[MicService] ❌ Stop failed: $e');
      _isListening = false;
    }
  }

  /// Cancel the current listening session without a final result.
  Future<void> cancelListening() async {
    if (!_isListening) return;
    try {
      await _speech.cancel();
      _isListening = false;
      debugPrint('[MicService] 🚫 Listening cancelled');
    } catch (e) {
      debugPrint('[MicService] ❌ Cancel failed: $e');
      _isListening = false;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  /// Dispose all resources. Call when the app is shutting down.
  Future<void> dispose() async {
    await stopListening();
    debugPrint('[MicService] 🔌 Microphone service disposed');
  }
}
