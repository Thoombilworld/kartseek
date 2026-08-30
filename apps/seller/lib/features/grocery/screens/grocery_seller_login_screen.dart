import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Seller Login — Grocery module.
class GrocerySellerLoginScreen extends StatefulWidget {
  const GrocerySellerLoginScreen({super.key});
  @override
  State<GrocerySellerLoginScreen> createState() => _State();
}

class _State extends State<GrocerySellerLoginScreen> {
  final _phoneCtl = TextEditingController();
  final _passCtl = TextEditingController();
  bool _obscure = true;

  String get _flag => RegionService.instance.currentCountry.flag;

  @override
  void dispose() { _phoneCtl.dispose(); _passCtl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: SafeArea(child: ListView(padding: const EdgeInsets.all(24), children: [
        const SizedBox(height: 40),
        Center(child: Container(
          width: 80, height: 80,
          decoration: BoxDecoration(color: SellerTheme.grocery.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
          child: const Icon(Icons.store, color: SellerTheme.grocery, size: 36),
        )),
        const SizedBox(height: 16),
        const Text('Grocery Seller', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
        Text('$_flag Sign in to manage your store', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
        const SizedBox(height: 32),
        _field(_phoneCtl, 'Phone Number', Icons.phone, TextInputType.phone),
        const SizedBox(height: 12),
        _field(_passCtl, 'Password', Icons.lock, TextInputType.visiblePassword, obscure: _obscure, suffix: IconButton(icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, size: 18), onPressed: () => setState(() => _obscure = !_obscure))),
        const SizedBox(height: 8),
        Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please contact support to reset your password.'))), child: const Text('Forgot password?', style: TextStyle(fontSize: 12, color: SellerTheme.grocery)))),
        const SizedBox(height: 12),
        SizedBox(height: 50, child: ElevatedButton(
          onPressed: () => Navigator.pushReplacementNamed(context, '/seller/grocery'),
          style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.grocery, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
          child: const Text('Sign In', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        )),
      ])),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon, TextInputType type, {bool obscure = false, Widget? suffix}) => Container(
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: TextField(controller: c, keyboardType: type, obscureText: obscure,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade400), suffixIcon: suffix, border: InputBorder.none, contentPadding: const EdgeInsets.all(14))),
  );
}
