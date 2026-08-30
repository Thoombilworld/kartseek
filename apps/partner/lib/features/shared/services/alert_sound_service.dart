import 'dart:async';
import 'package:flutter/services.dart';

/// KARTSEEK Partner App — Alert Sound Service
///
/// Provides audible + haptic alerts for incoming ride requests and delivery tasks.
/// Uses Flutter's built-in SystemSound and HapticFeedback to avoid native plugin
/// dependencies. In production, swap with `audioplayers` or `just_audio` for
/// custom notification tones.
class AlertSoundService {
  AlertSoundService._();
  static final AlertSoundService _instance = AlertSoundService._();
  static AlertSoundService get instance => _instance;

  Timer? _alertTimer;
  bool _isPlaying = false;

  /// Whether an alert is currently active.
  bool get isPlaying => _isPlaying;

  /// Play a repeating alert pattern for incoming ride requests.
  /// Uses system click + heavy haptic to simulate an urgent alert tone.
  void playRideRequestAlert() {
    stop();
    _isPlaying = true;
    _playAlertPattern(
      interval: const Duration(milliseconds: 800),
      burstCount: 2,
    );
  }

  /// Play a repeating alert pattern for incoming delivery tasks.
  /// Uses a softer pattern than ride requests.
  void playDeliveryRequestAlert() {
    stop();
    _isPlaying = true;
    _playAlertPattern(
      interval: const Duration(milliseconds: 1200),
      burstCount: 1,
    );
  }

  /// Stop all alert sounds and vibrations.
  void stop() {
    _alertTimer?.cancel();
    _alertTimer = null;
    _isPlaying = false;
  }

  /// Internal alert pattern player.
  void _playAlertPattern({
    required Duration interval,
    required int burstCount,
  }) {
    int repeats = 0;
    const maxRepeats = 30; // Auto-stop after ~30 cycles

    _alertTimer = Timer.periodic(interval, (timer) {
      if (repeats >= maxRepeats) {
        stop();
        return;
      }

      for (int i = 0; i < burstCount; i++) {
        Future.delayed(Duration(milliseconds: i * 150), () {
          SystemSound.play(SystemSoundType.click);
          HapticFeedback.heavyImpact();
        });
      }

      repeats++;
    });
  }

  /// Play a one-shot success haptic (e.g. ride accepted).
  void playSuccessHaptic() {
    HapticFeedback.mediumImpact();
    Future.delayed(const Duration(milliseconds: 100), HapticFeedback.lightImpact);
  }

  /// Play an error/rejection haptic.
  void playErrorHaptic() {
    HapticFeedback.heavyImpact();
  }

  /// Dispose of all timers.
  void dispose() {
    stop();
  }
}
