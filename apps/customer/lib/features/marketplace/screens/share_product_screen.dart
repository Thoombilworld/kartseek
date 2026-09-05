import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Share Product Screen — Share product link via social media / messaging.
class ShareProductScreen extends StatelessWidget {
  final String? productName;
  const ShareProductScreen({super.key, this.productName});

  @override
  Widget build(BuildContext context) {
    final channels = [
      _SC('WhatsApp', Icons.chat, const Color(0xFF25D366)),
      _SC('Instagram', Icons.camera_alt, const Color(0xFFE4405F)),
      _SC('Facebook', Icons.facebook, const Color(0xFF1877F2)),
      _SC('Twitter', Icons.alternate_email, const Color(0xFF1DA1F2)),
      _SC('Telegram', Icons.send, const Color(0xFF0088CC)),
      _SC('Email', Icons.email, const Color(0xFFEA4335)),
      _SC('SMS', Icons.sms, AppTheme.marketplaceColor),
      _SC('Copy Link', Icons.link, AppTheme.textSecondary),
    ];
    return Container(
      decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: AppTheme.borderLight,
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 20),
        const Text('Share Product',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        const SizedBox(height: 8),
        Text(productName ?? 'Share with friends!',
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
            textAlign: TextAlign.center),
        const SizedBox(height: 24),
        GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: channels
                .map((c) => GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                  color: c.color.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(14)),
                              child: Icon(c.icon, color: c.color, size: 26)),
                          const SizedBox(height: 6),
                          Text(c.name,
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.textSecondary)),
                        ])))
                .toList()),
        const SizedBox(height: 16),
      ]),
    );
  }
}

class _SC {
  final String name;
  final IconData icon;
  final Color color;
  _SC(this.name, this.icon, this.color);
}
