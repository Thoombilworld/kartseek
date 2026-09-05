import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Location permission screen — requests GPS access via the platform
/// [MethodChannel] before showing nearby pharmacies.
///
/// On success, triggers [RegionService.detectFromGps] to lock the region
/// and returns `true` to the calling route. On failure/skip, returns `false`.
class PharmacyLocationPermissionScreen extends StatefulWidget {
  const PharmacyLocationPermissionScreen({super.key});
  @override State<PharmacyLocationPermissionScreen> createState() => _PharmacyLocationPermissionScreenState();
}

class _PharmacyLocationPermissionScreenState extends State<PharmacyLocationPermissionScreen> with SingleTickerProviderStateMixin {
  static const _locationChannel = MethodChannel('com.kartseek.app/location');
  late AnimationController _pulseCtrl;
  bool _requesting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  }

  @override
  void dispose() { _pulseCtrl.dispose(); super.dispose(); }

  /// Requests platform-level GPS permission and location.
  ///
  /// Flow:
  /// 1. Request permission via the native MethodChannel
  /// 2. If granted, get hardware location
  /// 3. Trigger RegionService.detectFromGps() to lock region
  /// 4. Pop screen with success=true
  Future<void> _requestPermission() async {
    setState(() {
      _requesting = true;
      _errorMessage = null;
    });

    try {
      // 1. Request permission from native platform
      final permResult = await _locationChannel.invokeMethod('requestLocationPermission');
      final granted = permResult == true || permResult == 'granted';

      if (!granted) {
        if (mounted) {
          setState(() {
            _requesting = false;
            _errorMessage = 'Location permission denied. You can enable it in Settings.';
          });
        }
        return;
      }

      // 2. Get hardware GPS coordinates
      final hardwareLoc = await _locationChannel.invokeMethod('getHardwareLocation');
      double lat = RegionService.instance.currentCountry.defaultLat;
      double lng = RegionService.instance.currentCountry.defaultLng;

      if (hardwareLoc != null) {
        lat = (hardwareLoc['lat'] as num).toDouble();
        lng = (hardwareLoc['lng'] as num).toDouble();
        debugPrint('[LocationPermission] 🛰️ GPS locked: $lat, $lng');
      }

      // 3. Detect region from GPS coordinates
      await RegionService.instance.detectFromGps(lat, lng);
      debugPrint('[LocationPermission] 🌍 Region: ${RegionService.instance.currentCountry.flag} ${RegionService.instance.currentCountry.name}');

      // 4. Pop with success
      if (mounted) Navigator.pop(context, true);

    } on PlatformException catch (e) {
      debugPrint('[LocationPermission] ⚠️ Platform error: $e');
      if (mounted) {
        // Fall back to IP-based detection
        try {
          await RegionService.instance.detectFromIp();
          if (!mounted) return;
          Navigator.pop(context, true);
        } catch (_) {
          setState(() {
            _requesting = false;
            _errorMessage = 'GPS unavailable. Using approximate location.';
          });
          // Still usable — pop after short delay
          await Future.delayed(const Duration(seconds: 2));
          if (mounted) Navigator.pop(context, true);
        }
      }
    } catch (e) {
      debugPrint('[LocationPermission] ❌ Unexpected error: $e');
      if (mounted) {
        setState(() {
          _requesting = false;
          _errorMessage = 'Could not detect location. Please try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(flex: 2),

              // Animated location icon
              AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, __) => Container(
                  width: 140 + (_pulseCtrl.value * 20),
                  height: 140 + (_pulseCtrl.value * 20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.08 + (_pulseCtrl.value * 0.06)),
                  ),
                  child: Center(
                    child: Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(colors: [AppTheme.pharmacyColor, AppTheme.pharmacyColor.withValues(alpha: 0.7)]),
                        boxShadow: [BoxShadow(color: AppTheme.pharmacyColor.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
                      ),
                      child: const Icon(Icons.location_on_rounded, color: Colors.white, size: 40),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 40),

              const Text(
                'Find Pharmacies\nNear You',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.black87, letterSpacing: -0.8, height: 1.2),
              ),
              const SizedBox(height: 16),
              Text(
                'Enable location access to discover nearby pharmacies, get accurate delivery times, and find the best medicine deals in your area.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Colors.grey.shade600, height: 1.6),
              ),

              // Error message
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: Colors.amber.shade700),
                      const SizedBox(width: 10),
                      Expanded(child: Text(_errorMessage!, style: TextStyle(fontSize: 13, color: Colors.amber.shade900, fontWeight: FontWeight.w500))),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 48),

              // Enable location button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _requesting ? null : _requestPermission,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _requesting
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.my_location_rounded, size: 20),
                            SizedBox(width: 10),
                            Text('Enable Location', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 16),

              // Skip button
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('Enter address manually', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
              ),
              const Spacer(flex: 3),
            ],
          ),
        ),
      ),
    );
  }
}
