import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

class AboutKartseekScreen extends StatelessWidget {
  const AboutKartseekScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('About KARTSEEK')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                color: AppTheme.primaryGreen,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.shopping_bag, size: 48, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text('KARTSEEK Super App', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Version 1.0.0 (Build 42)', style: TextStyle(color: AppTheme.textMuted)),
            const SizedBox(height: 32),
            const Text('© 2026 KARTSEEK Technologies', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            const Text('All Rights Reserved.'),
            const SizedBox(height: 48),
            OutlinedButton(
              onPressed: () {},
              child: const Text('Visit Our Website'),
            ),
          ],
        ),
      ),
    );
  }
}
