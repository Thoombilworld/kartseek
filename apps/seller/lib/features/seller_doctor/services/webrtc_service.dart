import 'dart:async';
import 'package:flutter/foundation.dart';

/// Pure-Dart WebRTC signalling stub for the Doctor module.
///
/// This replaces the native flutter_webrtc implementation until the package
/// is buildable on Windows dev machines (objective_c build hook currently
/// fails on paths containing spaces — e.g. "C:\Users\Your Name\...").
///
/// Signalling contract (unchanged):
///   - join_call_room  → /seller namespace socket event
///   - call_offer      → RTCSessionDescription (JSON)
///   - call_answer     → RTCSessionDescription (JSON)
///   - ice_candidate   → RTCIceCandidate (JSON)
///   - call_ended      → hang-up event
///
/// When flutter_webrtc is re-enabled, swap this class back to the native
/// implementation in webrtc_service_native.dart.
class WebRtcService extends ChangeNotifier {
  // ── Call state ─────────────────────────────────────────────────────────────
  bool _isMicMuted    = false;
  bool _isCameraOff   = false;
  bool _isConnected   = false;
  bool _isInitialized = false;

  bool get isMicMuted    => _isMicMuted;
  bool get isCameraOff   => _isCameraOff;
  bool get isConnected   => _isConnected;
  bool get isInitialized => _isInitialized;

  /// Placeholder — will be an RTCVideoRenderer in the native version.
  Object? get localRenderer  => null;
  Object? get remoteRenderer => null;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /// Initialize renderers and request camera/mic permissions.
  Future<void> initialize() async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    _isInitialized = true;
    notifyListeners();
  }

  /// Start local camera + microphone stream.
  Future<void> startLocalStream() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    _isCameraOff = false;
    _isMicMuted  = false;
    _isConnected = true;
    notifyListeners();
  }

  // ── WebRTC signalling ───────────────────────────────────────────────────────

  /// Create and send an SDP offer to the remote peer via the /seller socket.
  Future<void> createOffer(String roomId) async {
    // TODO: emit 'call_offer' via SellerOrderSocketService
    debugPrint('[WebRtcService] createOffer → room: $roomId');
  }

  /// Handle incoming SDP answer from the remote peer.
  Future<void> handleAnswer(Map<String, dynamic> sdpJson) async {
    debugPrint('[WebRtcService] handleAnswer: ${sdpJson['type']}');
  }

  /// Handle incoming SDP offer from the remote peer (for callee path).
  Future<void> handleOffer(Map<String, dynamic> sdpJson) async {
    debugPrint('[WebRtcService] handleOffer: ${sdpJson['type']}');
  }

  /// Add a remote ICE candidate.
  Future<void> addIceCandidate(Map<String, dynamic> candidateJson) async {
    debugPrint('[WebRtcService] addIceCandidate');
  }

  // ── Controls ────────────────────────────────────────────────────────────────

  void toggleMic() {
    _isMicMuted = !_isMicMuted;
    notifyListeners();
  }

  void toggleCamera() {
    _isCameraOff = !_isCameraOff;
    notifyListeners();
  }

  Future<void> switchCamera() async {
    debugPrint('[WebRtcService] switchCamera');
  }

  void hangUp() {
    _isConnected   = false;
    _isInitialized = false;
    notifyListeners();
    // TODO: emit 'call_ended' via SellerOrderSocketService
    debugPrint('[WebRtcService] hangUp');
  }

  @override
  void dispose() {
    hangUp();
    super.dispose();
  }
}
