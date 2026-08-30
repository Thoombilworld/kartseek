import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/map_navigation_service.dart';
import 'package:kartseek_partner/features/shared/widgets/map_picker_sheet.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Partner Settings Screen — Preferences for notifications, map app, job behavior.
class PartnerSettingsScreen extends StatefulWidget {
  const PartnerSettingsScreen({super.key});
  @override
  State<PartnerSettingsScreen> createState() => _PartnerSettingsScreenState();
}

class _PartnerSettingsScreenState extends State<PartnerSettingsScreen> {
  bool _notif = true;
  bool _sound = true;
  bool _vibration = true;
  bool _autoAccept = false;
  bool _backgroundRefresh = true;

  @override
  Widget build(BuildContext context) {
    final mapService = MapNavigationService.instance;

    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Settings'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          // ── Notifications Section ──────────────────────────────────────────
          const Text('Notifications', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted)),
          const SizedBox(height: 8),
          _toggle('Push Notifications', 'Receive ride/delivery alerts', _notif, (v) => setState(() => _notif = v)),
          _toggle('Sound', 'Play sound on new requests', _sound, (v) => setState(() => _sound = v)),
          _toggle('Vibration', 'Vibrate on new requests', _vibration, (v) => setState(() => _vibration = v)),
          const SizedBox(height: 20),

          // ── Navigation Section ─────────────────────────────────────────────
          const Text('Navigation', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted)),
          const SizedBox(height: 8),
          _mapPreferenceItem(context, mapService),
          const SizedBox(height: 20),

          // ── Background & Sync Section ──────────────────────────────────────
          const Text('Background & Sync', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted)),
          const SizedBox(height: 8),
          _toggle(
            'Background Refresh',
            'Keep data updated even when the app is minimized',
            _backgroundRefresh,
            (v) => setState(() => _backgroundRefresh = v),
          ),
          _infoCard(
            icon: Icons.sync,
            title: 'Real-time Sync',
            subtitle: 'Connected to KARTSEEK servers via WebSocket',
            color: PartnerTheme.onlineGreen,
          ),
          const SizedBox(height: 20),

          // ── Job Preferences Section ────────────────────────────────────────
          const Text('Job Preferences', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted)),
          const SizedBox(height: 8),
          _toggle('Auto-Accept', 'Automatically accept nearby jobs', _autoAccept, (v) => setState(() => _autoAccept = v)),
          const SizedBox(height: 20),

          // ── Account Section ────────────────────────────────────────────────
          const Text('Account', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted)),
          const SizedBox(height: 8),
          _menuItem(Icons.language, 'Language', 'English'),
          _menuItem(Icons.lock_outline, 'Change Password', ''),
          _menuItem(Icons.info_outline, 'About KARTSEEK', 'v1.0.0'),
          _menuItem(Icons.description_outlined, 'Terms of Service', ''),
          _menuItem(Icons.privacy_tip_outlined, 'Privacy Policy', ''),
          const SizedBox(height: 24),

          // ── Logout / Delete ────────────────────────────────────────────────
          SizedBox(
            width: double.infinity, height: 50,
            child: OutlinedButton(
              onPressed: () => Navigator.pushNamedAndRemoveUntil(context, PartnerRouter.partnerLogin, (r) => false),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: PartnerTheme.offlineRed), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Logout', style: TextStyle(color: PartnerTheme.offlineRed, fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity, height: 50,
            child: TextButton(
              onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
              child: const Text('Delete Account', style: TextStyle(color: PartnerTheme.textMuted, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _toggle(String title, String desc, bool value, ValueChanged<bool> onChanged) => Container(
    margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        Text(desc, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
      ])),
      Switch(value: value, onChanged: onChanged, activeThumbColor: PartnerTheme.primary),
    ]),
  );

  Widget _mapPreferenceItem(BuildContext context, MapNavigationService mapService) {
    final app = mapService.preferredApp;
    Color iconColor;
    switch (app) {
      case PreferredMapApp.googleMaps: iconColor = const Color(0xFF4285F4); break;
      case PreferredMapApp.waze: iconColor = const Color(0xFF33CCFF); break;
      case PreferredMapApp.appleMaps: iconColor = const Color(0xFF34C759); break;
    }

    IconData iconData;
    switch (app) {
      case PreferredMapApp.googleMaps: iconData = Icons.map; break;
      case PreferredMapApp.waze: iconData = Icons.navigation; break;
      case PreferredMapApp.appleMaps: iconData = Icons.explore; break;
    }

    return GestureDetector(
      onTap: () async {
        final selected = await MapPickerSheet.show(context);
        if (selected != null) setState(() {});
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: PartnerTheme.cardDecoration(),
        child: Row(
          children: [
            Container(
              width: 42, height: 42,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(iconData, size: 22, color: iconColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Preferred Map App', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  Text(
                    app.displayName,
                    style: TextStyle(fontSize: 12, color: iconColor, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 20, color: PartnerTheme.textMuted),
          ],
        ),
      ),
    );
  }

  Widget _infoCard({required IconData icon, required String title, required String subtitle, required Color color}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: PartnerTheme.cardDecoration(),
      child: Row(
        children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 22, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
            child: Text('Active', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ),
        ],
      ),
    );
  }

  Widget _menuItem(IconData icon, String title, String trailing) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    child: ListTile(
      leading: Icon(icon, size: 20, color: PartnerTheme.textSecondary),
      title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        if (trailing.isNotEmpty) Text(trailing, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
        const SizedBox(width: 4),
        const Icon(Icons.chevron_right, size: 20, color: PartnerTheme.textMuted),
      ]),
      tileColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onTap: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
    ),
  );
}
