import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Settings screen — account preferences, app settings, and support.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text('Settings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _section('Account', [
            _tile(Icons.person_outline, 'Edit Profile', null),
            _tile(Icons.location_on_outlined, 'Saved Addresses', '3 addresses'),
            _tile(Icons.payment_outlined, 'Payment Methods', 'M-Pesa, Cash'),
            _tile(Icons.security_outlined, 'Security', 'Password, 2FA'),
          ]),
          const SizedBox(height: 16),
          _section('Preferences', [
            _toggle(Icons.notifications_outlined, 'Push Notifications', true),
            _toggle(Icons.email_outlined, 'Email Notifications', false),
            _tile(Icons.language, 'Language', 'English'),
            _tile(Icons.dark_mode_outlined, 'Theme', 'System default'),
          ]),
          const SizedBox(height: 16),
          _section('Support', [
            _tile(Icons.help_outline, 'Help Center', null),
            _tile(Icons.chat_bubble_outline, 'Live Chat', null),
            _tile(Icons.info_outline, 'About KARTSEEK', 'v1.0.0'),
            _tile(Icons.description_outlined, 'Terms & Privacy', null),
          ]),
          const SizedBox(height: 24),
          Container(
            width: double.infinity, height: 52,
            decoration: BoxDecoration(border: Border.all(color: AppTheme.errorRed.withValues(alpha: 0.3)), borderRadius: BorderRadius.circular(14)),
            child: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Checking for updates...')),
                );
              },
              child: const Text('Sign Out', style: TextStyle(color: AppTheme.errorRed, fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 60),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textMuted, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        DecoratedBox(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _tile(IconData icon, String label, String? value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6), width: 1))),
      child: Row(
        children: [
          Icon(icon, size: 22, color: AppTheme.textSecondary),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
          if (value != null) Text(value, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
        ],
      ),
    );
  }

  Widget _toggle(IconData icon, String label, bool value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6), width: 1))),
      child: Row(
        children: [
          Icon(icon, size: 22, color: AppTheme.textSecondary),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
          Switch(value: value, onChanged: (_) {}, activeThumbColor: AppTheme.primaryGreen),
        ],
      ),
    );
  }
}
