import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// KARTSEEK Partner — Connectivity-aware offline banner
///
/// Critical for drivers and delivery partners — they must know immediately
/// when they lose connectivity since it affects ride/delivery assignments.
/// Shows a persistent top banner with animated slide-in when offline,
/// auto-dismisses when connectivity is restored.
class OfflineBanner extends StatefulWidget {
  final Widget child;

  const OfflineBanner({super.key, required this.child});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner>
    with SingleTickerProviderStateMixin {
  late final StreamSubscription<List<ConnectivityResult>> _subscription;
  late final AnimationController _animController;
  late final Animation<Offset> _slideAnim;
  bool _isOffline = false;

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));

    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
      if (offline != _isOffline) {
        setState(() => _isOffline = offline);
        if (offline) {
          _animController.forward();
        } else {
          _animController.reverse();
        }
      }
    });

    // Check initial state
    _checkInitialConnectivity();
  }

  Future<void> _checkInitialConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    final offline = results.contains(ConnectivityResult.none) || results.isEmpty;
    if (offline && mounted) {
      setState(() => _isOffline = true);
      _animController.forward();
    }
  }

  @override
  void dispose() {
    _subscription.cancel();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SlideTransition(
          position: _slideAnim,
          child: _isOffline
              ? MaterialBanner(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  backgroundColor: const Color(0xFFFEE2E2), // Red-tinted for urgency
                  leading: const Icon(
                    Icons.wifi_off_rounded,
                    color: Color(0xFFDC2626),
                    size: 20,
                  ),
                  content: const Text(
                    'You\'re offline — ride & delivery requests paused',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF991B1B),
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: _checkInitialConnectivity,
                      child: const Text(
                        'Retry',
                        style: TextStyle(
                          color: Color(0xFFDC2626),
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                )
              : const SizedBox.shrink(),
        ),
        Expanded(child: widget.child),
      ],
    );
  }
}
