// lib/core/services/socket_service.dart
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'package:shared_mobile/core/constants.dart';

/// Connection states for the WebSocket.
enum SocketStatus { disconnected, connecting, connected, error }

/// Base interface for all namespace-specific socket services.
/// Each namespace keeps one socket singleton, auto-reconnects, and exposes
/// typed event streams via [StreamController]s.
abstract class BaseSocketService extends ChangeNotifier {
  /// Override to return the namespace path, e.g. '/tracking'
  String get namespace;

  io.Socket? _socket;
  SocketStatus _status = SocketStatus.disconnected;

  SocketStatus get status => _status;
  bool get isConnected => _status == SocketStatus.connected;
  io.Socket? get socket => _socket;

  // ── Connection Management ─────────────────────────────────────────────────

  /// Connect to the namespace with optional query parameters.
  Future<void> connect({
    required String userId,
    String? userType,
    String? role,
    String? token,
  }) async {
    if (_socket?.connected == true) return;

    _setStatus(SocketStatus.connecting);

    final Map<String, dynamic> query = {'userId': userId};
    if (userType != null) query['userType'] = userType;
    if (role != null) query['role'] = role;

    _socket = io.io(
      '${AppConstants.wsBaseUrl}$namespace',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setQuery(query)
          .enableAutoConnect()
          .enableReconnection()
          // FIX 7: Prevent reconnect storms on flaky mobile networks.
          // Old: 1s delay, 10s max, 20s timeout → rapid-fire reconnects.
          // New: 3s delay, 30s max, 15s timeout with randomization.
          .setReconnectionAttempts(8)
          .setReconnectionDelay(3000)
          .setReconnectionDelayMax(30000)
          .setTimeout(15000)
          .setExtraHeaders({'randomizationFactor': '0.5'})
          .build(),
    );

    _socket!
      ..onConnect((_) {
        debugPrint('[WS$namespace] ✅ Connected — ${_socket!.id}');
        _setStatus(SocketStatus.connected);
        onConnected();
      })
      ..onDisconnect((_) {
        debugPrint('[WS$namespace] ❌ Disconnected');
        _setStatus(SocketStatus.disconnected);
        onDisconnected();
      })
      ..onConnectError((err) {
        debugPrint('[WS$namespace] ⚠️ Error: $err');
        _setStatus(SocketStatus.error);
      })
      ..onReconnect((_) {
        debugPrint('[WS$namespace] 🔄 Reconnected');
        _setStatus(SocketStatus.connected);
        onConnected();
      });

    _registerHandlers(_socket!);
    _socket!.connect();
  }

  /// Disconnect and clean up.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _setStatus(SocketStatus.disconnected);
    onDisconnected();
  }

  /// Emit an event with optional data.
  void emit(String event, [dynamic data]) {
    if (_socket?.connected != true) {
      debugPrint('[WS$namespace] ⚠️ Emit "$event" skipped — not connected');
      return;
    }
    _socket!.emit(event, data);
  }

  // ── Latency Measurement ─────────────────────────────────────────────────

  StreamController<int>? _latencyController;

  /// Stream of measured RTT latencies in milliseconds.
  Stream<int> get latencyStream =>
      (_latencyController ??= StreamController<int>.broadcast()).stream;

  /// Measure end-to-end WebSocket latency (client → server → client).
  /// Emits the result in milliseconds on [latencyStream].
  /// Returns the RTT in ms, or -1 if the measurement fails.
  Future<int> measureLatency() async {
    if (_socket?.connected != true) return -1;

    final clientTimestamp = DateTime.now().millisecondsSinceEpoch;
    final completer = Completer<int>();

    // Listen for the server's pong response
    void handler(dynamic data) {
      try {
        final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
        final originalTimestamp = (map['clientTimestamp'] as num?)?.toInt() ?? 0;
        if (originalTimestamp == clientTimestamp) {
          final rtt = DateTime.now().millisecondsSinceEpoch - clientTimestamp;
          _latencyController?.add(rtt);
          if (!completer.isCompleted) completer.complete(rtt);
        }
      } catch (e) {
        debugPrint('[WS$namespace] Latency parse error: $e');
        if (!completer.isCompleted) completer.complete(-1);
      }
    }

    _socket!.on('pong_latency', handler);

    // Send ping
    _socket!.emit('ping_latency', {'clientTimestamp': clientTimestamp});

    // Timeout after 10 seconds
    Future.delayed(const Duration(seconds: 10), () {
      if (!completer.isCompleted) {
        completer.complete(-1);
      }
    });

    final rtt = await completer.future;
    _socket!.off('pong_latency', handler);
    debugPrint('[WS$namespace] ⏱️ Latency: ${rtt}ms');
    return rtt;
  }

  // ── Overridable Hooks ─────────────────────────────────────────────────────

  /// Called after successfully connecting. Subscribe to events here.
  void onConnected() {}

  /// Called on disconnect. Clean up any room state here.
  void onDisconnected() {}

  /// Register all event listeners. Called once when socket is created.
  void _registerHandlers(io.Socket socket) => registerHandlers(socket);

  /// Subclasses override this to register their specific event handlers.
  void registerHandlers(io.Socket socket);

  void _setStatus(SocketStatus s) {
    if (_status == s) return;
    _status = s;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
