import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// KARTSEEK — Connectivity-aware offline banner & online status indicator
///
/// Wraps child content and provides:
///   • Persistent top banner when device loses connectivity
///   • Green "Back Online" toast when connectivity is restored (Amazon-style)
///   • Animated slide transitions for both states
///   • Connection type indicator (WiFi/Mobile Data)
///   • Auto-retry callback when connection restores
class OfflineBanner extends StatefulWidget {
  final Widget child;
  final VoidCallback? onBackOnline;

  const OfflineBanner({super.key, required this.child, this.onBackOnline});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner>
    with TickerProviderStateMixin {
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  late final AnimationController _offlineAnimController;
  late final Animation<Offset> _offlineSlideAnim;

  late final AnimationController _onlineAnimController;
  late final Animation<Offset> _onlineSlideAnim;

  bool _isOffline = false;
  bool _showBackOnline = false;
  bool _wasOffline = false;
  String _connectionType = '';
  Timer? _backOnlineTimer;

  @override
  void initState() {
    super.initState();

    // Offline banner animation (slides down from top)
    _offlineAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _offlineSlideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _offlineAnimController,
      curve: Curves.easeOutCubic,
    ));

    // "Back Online" toast animation (slides down then auto-hides)
    _onlineAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _onlineSlideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _onlineAnimController,
      curve: Curves.easeOutBack,
    ));

    _initConnectivity();
  }

  void _initConnectivity() {
    try {
      _subscription = Connectivity().onConnectivityChanged.listen(
        _handleConnectivityChange,
        onError: (e) {
          debugPrint('[OfflineBanner] Connectivity stream error: $e');
        },
      );
      _checkInitialConnectivity();
    } catch (e) {
      debugPrint('[OfflineBanner] Failed to init connectivity: $e');
    }
  }

  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
    final connectionType = _getConnectionType(results);

    if (offline != _isOffline && mounted) {
      setState(() {
        _isOffline = offline;
        _connectionType = connectionType;
      });

      if (offline) {
        _wasOffline = true;
        _offlineAnimController.forward();
        // Hide any "back online" toast
        _hideBackOnlineToast();
      } else {
        _offlineAnimController.reverse();
        // Show "Back Online" toast only if we were previously offline
        if (_wasOffline) {
          _showBackOnlineToast();
          _wasOffline = false;
          widget.onBackOnline?.call();
        }
      }
    }
  }

  String _getConnectionType(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.wifi)) return 'WiFi';
    if (results.contains(ConnectivityResult.mobile)) return 'Mobile Data';
    if (results.contains(ConnectivityResult.ethernet)) return 'Ethernet';
    if (results.contains(ConnectivityResult.vpn)) return 'VPN';
    return '';
  }

  void _showBackOnlineToast() {
    if (!mounted) return;
    setState(() => _showBackOnline = true);
    _onlineAnimController.forward();

    _backOnlineTimer?.cancel();
    _backOnlineTimer = Timer(const Duration(seconds: 3), _hideBackOnlineToast);
  }

  void _hideBackOnlineToast() {
    _backOnlineTimer?.cancel();
    if (mounted && _showBackOnline) {
      _onlineAnimController.reverse().then((_) {
        if (mounted) setState(() => _showBackOnline = false);
      });
    }
  }

  Future<void> _checkInitialConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
      if (offline && mounted) {
        setState(() {
          _isOffline = true;
          _wasOffline = true;
        });
        _offlineAnimController.forward();
      }
    } catch (e) {
      debugPrint('[OfflineBanner] Initial connectivity check failed: $e');
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _backOnlineTimer?.cancel();
    _offlineAnimController.dispose();
    _onlineAnimController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Offline banner
        SlideTransition(
          position: _offlineSlideAnim,
          child: _isOffline ? _buildOfflineBanner() : const SizedBox.shrink(),
        ),
        // "Back Online" toast
        SlideTransition(
          position: _onlineSlideAnim,
          child: _showBackOnline ? _buildBackOnlineBanner() : const SizedBox.shrink(),
        ),
        Expanded(child: widget.child),
      ],
    );
  }

  Widget _buildOfflineBanner() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        bottom: 10,
        left: 16,
        right: 16,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.wifi_off_rounded,
              color: Colors.white,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'You\'re offline',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Check your connection. Some features may be unavailable.',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFFECACA),
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: _checkInitialConnectivity,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Retry',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackOnlineBanner() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        bottom: 10,
        left: 16,
        right: 16,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF10B981)],
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.wifi_rounded,
              color: Colors.white,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Back Online',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                if (_connectionType.isNotEmpty)
                  Text(
                    'Connected via $_connectionType',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFFA7F3D0),
                    ),
                  ),
              ],
            ),
          ),
          const Icon(
            Icons.check_circle_rounded,
            color: Colors.white,
            size: 22,
          ),
        ],
      ),
    );
  }
}

/// A small connectivity status dot indicator for app bars.
///
/// Shows a green dot when online, red dot when offline.
/// Place this in the AppBar actions or title row.
///
/// Usage:
/// ```dart
/// AppBar(
///   title: Row(
///     children: [
///       Text('KARTSEEK'),
///       const SizedBox(width: 8),
///       const ConnectivityDot(),
///     ],
///   ),
/// )
/// ```
class ConnectivityDot extends StatefulWidget {
  final double size;

  const ConnectivityDot({super.key, this.size = 8});

  @override
  State<ConnectivityDot> createState() => _ConnectivityDotState();
}

class _ConnectivityDotState extends State<ConnectivityDot>
    with SingleTickerProviderStateMixin {
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _isOnline = true;
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _pulseAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _pulseController.repeat(reverse: true);

    try {
      _subscription = Connectivity().onConnectivityChanged.listen((results) {
        final online = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
        if (online != _isOnline && mounted) {
          setState(() => _isOnline = online);
        }
      });
      _checkInitial();
    } catch (e) {
      debugPrint('[ConnectivityDot] Init failed: $e');
    }
  }

  Future<void> _checkInitial() async {
    try {
      final results = await Connectivity().checkConnectivity();
      final online = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
      if (mounted) setState(() => _isOnline = online);
    } catch (_) {}
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (_, __) => Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _isOnline
              ? Color.lerp(
                  const Color(0xFF10B981),
                  const Color(0xFF34D399),
                  _pulseAnimation.value,
                )
              : const Color(0xFFEF4444),
          boxShadow: [
            BoxShadow(
              color: (_isOnline ? const Color(0xFF10B981) : const Color(0xFFEF4444))
                  .withValues(alpha: 0.4 * _pulseAnimation.value),
              blurRadius: widget.size * 0.8,
              spreadRadius: widget.size * 0.2,
            ),
          ],
        ),
      ),
    );
  }
}
