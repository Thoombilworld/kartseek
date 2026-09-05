import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant Seller Login Screen.
class RestaurantSellerLoginScreen extends StatefulWidget {
  const RestaurantSellerLoginScreen({super.key});
  @override
  State<RestaurantSellerLoginScreen> createState() => _State();
}

class _State extends State<RestaurantSellerLoginScreen> {
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
          decoration: BoxDecoration(color: SellerTheme.restaurant.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
          child: const Icon(Icons.restaurant, color: SellerTheme.restaurant, size: 36),
        )),
        const SizedBox(height: 16),
        const Center(child: Text('Restaurant Partner', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900))),
        Center(child: Text('Sign in to manage your restaurant', style: TextStyle(fontSize: 13, color: Colors.grey.shade500))),
        const SizedBox(height: 32),
        TextField(
          controller: _phoneCtl, keyboardType: TextInputType.phone,
          decoration: InputDecoration(prefixIcon: Padding(padding: const EdgeInsets.all(14), child: Text(_flag, style: const TextStyle(fontSize: 18))),
            hintText: 'Phone number', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: SellerTheme.restaurant))),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passCtl, obscureText: _obscure,
          decoration: InputDecoration(prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _obscure = !_obscure)),
            hintText: 'Password', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: SellerTheme.restaurant))),
        ),
        const SizedBox(height: 20),
        SizedBox(height: 48, child: ElevatedButton(
          onPressed: () {
            final phone = _phoneCtl.text.trim();
            final pass = _passCtl.text.trim();
            if (phone.isEmpty || pass.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Please enter your phone number and password'),
                backgroundColor: Colors.red,
                behavior: SnackBarBehavior.floating,
              ));
              return;
            }
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Signing in\u2026'),
              backgroundColor: SellerTheme.restaurant,
              behavior: SnackBarBehavior.floating,
              duration: Duration(seconds: 1),
            ));
            final nav = Navigator.of(context);
            // Navigate to restaurant dashboard after brief delay
            Future.delayed(const Duration(milliseconds: 800), () {
              if (mounted) nav.pushReplacementNamed('/seller/restaurant');
            });
          },
          style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.restaurant, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
          child: const Text('Sign In', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        )),
      ])),
    );
  }
}
