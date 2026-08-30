import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Privacy Policy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22)),
            SizedBox(height: 16),
            Text('Last updated: June 2026', style: TextStyle(color: Colors.grey)),
            SizedBox(height: 24),
            Text('1. Information Collection', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            SizedBox(height: 8),
            Text('We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us...'),
            SizedBox(height: 16),
            Text('2. Use of Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            SizedBox(height: 8),
            Text('We use the information we collect to provide, maintain, and improve our services, such as to facilitate payments, send receipts, provide products and services you request...'),
          ],
        ),
      ),
    );
  }
}
