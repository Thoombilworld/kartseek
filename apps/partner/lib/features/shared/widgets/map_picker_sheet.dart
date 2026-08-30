import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/map_navigation_service.dart';

/// KARTSEEK Partner App — Preferred Map Picker Widget
///
/// A bottom sheet that lets the driver choose their preferred map application
/// for turn-by-turn navigation. Persists the selection in [MapNavigationService].
class MapPickerSheet extends StatelessWidget {
  const MapPickerSheet({super.key});

  /// Show the map picker sheet. Returns the selected [PreferredMapApp].
  static Future<PreferredMapApp?> show(BuildContext context) {
    return showModalBottomSheet<PreferredMapApp>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const MapPickerSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final service = MapNavigationService.instance;
    final current = service.preferredApp;
    final available = service.availableApps;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Choose Navigation App',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: PartnerTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Select your preferred map for navigation',
              style: TextStyle(fontSize: 13, color: PartnerTheme.textMuted),
            ),
            const SizedBox(height: 20),
            ...available.map((app) => _MapOption(
              app: app,
              isSelected: app == current,
              onTap: () {
                service.setPreferredApp(app);
                Navigator.pop(context, app);
              },
            )),
          ],
        ),
      ),
    );
  }
}

class _MapOption extends StatelessWidget {
  final PreferredMapApp app;
  final bool isSelected;
  final VoidCallback onTap;

  const _MapOption({
    required this.app,
    required this.isSelected,
    required this.onTap,
  });

  IconData get _icon {
    switch (app) {
      case PreferredMapApp.googleMaps:
        return Icons.map;
      case PreferredMapApp.waze:
        return Icons.navigation;
      case PreferredMapApp.appleMaps:
        return Icons.explore;
    }
  }

  Color get _color {
    switch (app) {
      case PreferredMapApp.googleMaps:
        return const Color(0xFF4285F4);
      case PreferredMapApp.waze:
        return const Color(0xFF33CCFF);
      case PreferredMapApp.appleMaps:
        return const Color(0xFF34C759);
    }
  }

  String get _subtitle {
    switch (app) {
      case PreferredMapApp.googleMaps:
        return 'Most popular • Turn-by-turn voice nav';
      case PreferredMapApp.waze:
        return 'Community-driven • Real-time traffic';
      case PreferredMapApp.appleMaps:
        return 'iOS native • Privacy-focused';
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? _color.withValues(alpha: 0.08) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? _color : PartnerTheme.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_icon, color: _color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    app.displayName,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? _color : PartnerTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: PartnerTheme.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: _color, size: 24)
            else
              const Icon(Icons.radio_button_unchecked, color: PartnerTheme.border, size: 24),
          ],
        ),
      ),
    );
  }
}
