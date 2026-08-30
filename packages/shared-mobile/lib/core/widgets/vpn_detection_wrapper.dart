import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/geo_security_service.dart';

/// A widget that wraps your app and shows a VPN/proxy detection overlay
/// when the GeoSecurityService detects a blocked connection.
///
/// Usage:
/// ```dart
/// VpnDetectionWrapper(
///   child: MaterialApp(...),
/// )
/// ```
class VpnDetectionWrapper extends StatefulWidget {
  final Widget child;
  final bool checkOnLaunch;
  final Duration recheckInterval;

  const VpnDetectionWrapper({
    super.key,
    required this.child,
    this.checkOnLaunch = true,
    this.recheckInterval = const Duration(minutes: 10),
  });

  @override
  State<VpnDetectionWrapper> createState() => _VpnDetectionWrapperState();
}

class _VpnDetectionWrapperState extends State<VpnDetectionWrapper> with WidgetsBindingObserver {
  final _geoSecurity = GeoSecurityService();
  GeoCheckResult? _currentResult;
  bool _isChecking = false;
  bool _showOverlay = false;
  StreamSubscription? _vpnSub;
  Timer? _recheckTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Listen for VPN detection events
    _vpnSub = _geoSecurity.onVpnDetected.listen((result) {
      if (mounted && result.isBlocked) {
        setState(() {
          _currentResult = result;
          _showOverlay = true;
        });
      }
    });

    // Initial check on launch
    if (widget.checkOnLaunch) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _performCheck());
    }

    // Periodic recheck
    _recheckTimer = Timer.periodic(widget.recheckInterval, (_) => _performCheck());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _vpnSub?.cancel();
    _recheckTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Recheck when app comes to foreground (user may have disabled VPN)
      _performCheck();
    }
  }

  Future<void> _performCheck() async {
    if (_isChecking) return;
    setState(() => _isChecking = true);

    try {
      final result = await _geoSecurity.fullSecurityCheck();
      if (mounted) {
        setState(() {
          _currentResult = result;
          _showOverlay = result.isBlocked;
          _isChecking = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  Future<void> _retryCheck() async {
    _geoSecurity.clearCache();
    await _performCheck();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Stack(
        children: [
          // Main app content
          widget.child,

          // VPN warning banner (non-blocking for 'warn' level)
          if (_currentResult?.isWarned == true && !_showOverlay)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: _VpnWarningBanner(
                  message: _currentResult!.message ?? 'VPN detected — some services may be limited.',
                  onDismiss: () => setState(() => _currentResult = null),
                ),
              ),
            ),

          // Full-screen block overlay
          if (_showOverlay)
            _VpnBlockOverlay(
              result: _currentResult!,
              isRetrying: _isChecking,
              onRetry: _retryCheck,
            ),
        ],
      ),
    );
  }
}

// ─── Warning Banner ──────────────────────────────────────────────────────────

class _VpnWarningBanner extends StatelessWidget {
  final String message;
  final VoidCallback onDismiss;

  const _VpnWarningBanner({required this.message, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        border: Border.all(color: Colors.amber.shade300),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.amber.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.amber.shade700, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: Colors.amber.shade900,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          GestureDetector(
            onTap: onDismiss,
            child: Icon(Icons.close, color: Colors.amber.shade700, size: 18),
          ),
        ],
      ),
    );
  }
}

// ─── Block Overlay ───────────────────────────────────────────────────────────

class _VpnBlockOverlay extends StatelessWidget {
  final GeoCheckResult result;
  final bool isRetrying;
  final VoidCallback onRetry;

  const _VpnBlockOverlay({
    required this.result,
    required this.isRetrying,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black87,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withValues(alpha: 0.15),
                    blurRadius: 40,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Shield icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.shield_outlined,
                      size: 42,
                      color: Colors.red.shade600,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title
                  Text(
                    'VPN / Proxy Detected',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Colors.grey.shade900,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),

                  // Message
                  Text(
                    result.message ?? 'VPN or proxy detected. Please disable your VPN to continue using KARTSEEK services.',
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.grey.shade600,
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),

                  // Threat details
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        _DetailRow(label: 'IP Address', value: _maskIp(result.ip)),
                        if (result.country != null)
                          _DetailRow(label: 'Detected Country', value: result.country!),
                        _DetailRow(
                          label: 'Detection',
                          value: [
                            if (result.isVpn) 'VPN',
                            if (result.isProxy) 'Proxy',
                            if (result.isTor) 'TOR',
                            if (result.isDatacenter) 'Datacenter',
                          ].join(', '),
                        ),
                        _DetailRow(label: 'Threat Level', value: result.threatLevel.toUpperCase()),
                      ],
                    ),
                  ),

                  // Services affected
                  Text(
                    'The following services are unavailable:',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    alignment: WrapAlignment.center,
                    children: [
                      _ServiceChip('🚕 Taxi'),
                      _ServiceChip('🍔 Restaurant'),
                      _ServiceChip('🛒 Grocery'),
                      _ServiceChip('💊 Pharmacy'),
                      _ServiceChip('🏥 Doctor'),
                      _ServiceChip('🏪 Stores'),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Retry button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: isRetrying ? null : onRetry,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: isRetrying
                          ? const SizedBox(
                              width: 22, height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.refresh_rounded, size: 20),
                                SizedBox(width: 8),
                                Text('Retry Location Check', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Help text
                  Text(
                    'Disable your VPN, then tap "Retry" to continue.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _maskIp(String ip) {
    final parts = ip.split('.');
    if (parts.length == 4) return '${parts[0]}.${parts[1]}.***.**';
    return ip.length > 6 ? '${ip.substring(0, 6)}...' : ip;
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade800)),
        ],
      ),
    );
  }
}

class _ServiceChip extends StatelessWidget {
  final String label;
  const _ServiceChip(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Text(label, style: TextStyle(fontSize: 12, color: Colors.red.shade700, fontWeight: FontWeight.w500)),
    );
  }
}
