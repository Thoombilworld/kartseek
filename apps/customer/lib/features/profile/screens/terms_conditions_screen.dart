import 'package:flutter/material.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & Conditions')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('1. Introduction', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            SizedBox(height: 8),
            Text('These Terms and Conditions govern your use of the KARTSEEK Super App and its associated services...'),
            SizedBox(height: 16),
            Text('2. User Accounts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            SizedBox(height: 8),
            Text('You must create an account to use most features of the platform. You are responsible for maintaining the confidentiality of your account credentials...'),
            SizedBox(height: 16),
            Text('3. Privacy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            SizedBox(height: 8),
            Text('Your privacy is important to us. Please refer to our Privacy Policy for information on how we collect and use data.'),
          ],
        ),
      ),
    );
  }
}
