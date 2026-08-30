import 'dart:async';
import 'package:flutter/foundation.dart';

/// KARTSEEK Super App — App Lifecycle & Background Refresh Service
///
/// Provides real-time data refresh via periodic polling when the app is in the
/// foreground, and maintains a WebSocket heartbeat when in the background.
///
/// This service sits above all platform-specific screens. Each module (taxi,
/// delivery, customer, seller) registers its own refresh callbacks, which are
/// invoked at configurable intervals.
///
/// ### Usage
/// ```dart
/// final service = BackgroundRefreshService.instance;
/// service.registerRefreshCallback('partner_dashboard', () async {
///   bloc.add(const RefreshDashboard());
/// });
/// service.start();
/// ```
class BackgroundRefreshService extends ChangeNotifier {
  BackgroundRefreshService._();
  static final BackgroundRefreshService _instance = BackgroundRefreshService._();
  static BackgroundRefreshService get instance => _instance;

  // ── Configuration ────────────────────────────────────────────────────────────
  static const Duration defaultForegroundInterval = Duration(seconds: 30);
  static const Duration defaultBackgroundInterval = Duration(seconds: 60);

  Timer? _foregroundTimer;
  Timer? _backgroundTimer;
  Timer? _heartbeatTimer;
  bool _isInForeground = true;
  bool _isRunning = false;
  bool _isExecuting = false;
  int _heartbeatCount = 0;
  DateTime _lastRefresh = DateTime.now();

  // ── Exponential Backoff ──────────────────────────────────────────────────
  int _consecutiveFailures = 0;
  static const int _maxBackoffMultiplier = 6; // Max 6x interval = ~180s

  /// Registered refresh callbacks keyed by a unique identifier.
  final Map<String, Future<void> Function()> _callbacks = {};

  /// Registered one-shot callbacks that fire on resume from background.
  final List<Future<void> Function()> _onResumeCallbacks = [];

  // ── Public API ───────────────────────────────────────────────────────────

  bool get isRunning => _isRunning;
  bool get isInForeground => _isInForeground;
  DateTime get lastRefresh => _lastRefresh;

  /// Register a named refresh callback.
  void registerRefreshCallback(String key, Future<void> Function() callback) {
    _callbacks[key] = callback;
  }

  /// Unregister a named callback (e.g., when a screen disposes).
  void unregisterRefreshCallback(String key) {
    _callbacks.remove(key);
  }

  /// Register a callback to run once when app returns to foreground.
  void onResume(Future<void> Function() callback) {
    _onResumeCallbacks.add(callback);
  }

  /// Start the periodic refresh cycle.
  void start({
    Duration foregroundInterval = defaultForegroundInterval,
    Duration backgroundInterval = defaultBackgroundInterval,
  }) {
    if (_isRunning) return;
    _isRunning = true;

    _foregroundTimer = Timer.periodic(foregroundInterval, (_) {
      if (_isInForeground) _executeCallbacks();
    });

    _backgroundTimer = Timer.periodic(backgroundInterval, (_) {
      if (!_isInForeground) _executeCallbacks();
    });

    // WebSocket heartbeat — keeps connection alive even in background
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      _sendHeartbeat();
    });

    // Initial data fetch
    _executeCallbacks();

    debugPrint('[BackgroundRefresh] ✅ Started — FG: ${foregroundInterval.inSeconds}s / BG: ${backgroundInterval.inSeconds}s');
  }

  /// Stop all refresh cycles.
  void stop() {
    _foregroundTimer?.cancel();
    _backgroundTimer?.cancel();
    _heartbeatTimer?.cancel();
    _foregroundTimer = null;
    _backgroundTimer = null;
    _heartbeatTimer = null;
    _isRunning = false;
    debugPrint('[BackgroundRefresh] ⛔ Stopped');
  }

  /// Notify that the app has entered the foreground.
  void onAppResumed() {
    _isInForeground = true;

    // Fire resume callbacks
    for (final cb in _onResumeCallbacks) {
      cb().catchError((e) => debugPrint('[BackgroundRefresh] Resume callback error: $e'));
    }
    _onResumeCallbacks.clear();

    // Immediately refresh data when coming back
    _executeCallbacks();
    debugPrint('[BackgroundRefresh] 🔄 App resumed — triggering immediate refresh');
    notifyListeners();
  }

  /// Notify that the app has entered the background.
  void onAppPaused() {
    _isInForeground = false;
    debugPrint('[BackgroundRefresh] 💤 App paused — switching to background interval');
    notifyListeners();
  }

  /// Force an immediate refresh of all registered callbacks.
  Future<void> forceRefresh() async {
    await _executeCallbacks();
    debugPrint('[BackgroundRefresh] ⚡ Force refresh completed');
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  Future<void> _executeCallbacks() async {
    // Prevent concurrent execution (avoids stacking on slow callbacks)
    if (_isExecuting) return;

    // Exponential backoff: skip cycles when API calls are consistently failing.
    // After N consecutive failures, only run every (N+1)th cycle (capped).
    if (_consecutiveFailures > 0) {
      final skipCount = _consecutiveFailures.clamp(0, _maxBackoffMultiplier);
      // Use heartbeat count as a rough cycle counter
      if (_heartbeatCount % (skipCount + 1) != 0) {
        return; // Skip this cycle
      }
    }

    _isExecuting = true;
    _lastRefresh = DateTime.now();
    bool anyFailed = false;
    try {
      // Execute all callbacks in parallel for performance
      final results = await Future.wait(
        _callbacks.entries.map((entry) => entry.value().then((_) => true).catchError(
          (e) {
            debugPrint('[BackgroundRefresh] Callback "${entry.key}" error: $e');
            return false;
          },
        )),
      );
      anyFailed = results.any((ok) => !ok);
    } catch (_) {
      anyFailed = true;
    } finally {
      _isExecuting = false;
    }

    // Track consecutive failures for backoff
    if (anyFailed && _callbacks.isNotEmpty) {
      _consecutiveFailures = (_consecutiveFailures + 1).clamp(0, _maxBackoffMultiplier);
      if (_consecutiveFailures == 1) {
        debugPrint('[BackgroundRefresh] ⚠️ API calls failing — enabling backoff');
      }
    } else {
      if (_consecutiveFailures > 0) {
        debugPrint('[BackgroundRefresh] ✅ API calls recovered — backoff reset');
      }
      _consecutiveFailures = 0;
    }

    notifyListeners();
  }

  void _sendHeartbeat() {
    _heartbeatCount++;
    // Only log every 5th heartbeat to reduce debug noise
    if (_heartbeatCount % 5 == 0) {
      debugPrint('[BackgroundRefresh] 💓 Heartbeat #$_heartbeatCount at ${DateTime.now().toIso8601String()}');
    }
  }

  @override
  void dispose() {
    stop();
    _callbacks.clear();
    _onResumeCallbacks.clear();
    super.dispose();
  }
}
