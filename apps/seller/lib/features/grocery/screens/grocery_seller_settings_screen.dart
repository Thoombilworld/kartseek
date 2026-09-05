import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Seller Settings — Store config, currency, delivery options, etc.
class GrocerySellerSettingsScreen extends StatelessWidget {
  const GrocerySellerSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final country = RegionService.instance.currentCountry;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          return ListView(padding: const EdgeInsets.all(16), children: [
            // Store Status
            _section('Store', [
              _toggle('Store Open', state.isOpen, (v) => context.read<GrocerySellerBloc>().add(ToggleGroceryStore(v))),
            ]),
            const SizedBox(height: 12),
            _section('Region', [
              _row(Icons.flag, 'Country', '${country.flag} ${country.name}'),
              _row(Icons.monetization_on, 'Currency', country.currencySymbol),
              _row(Icons.language, 'Locale', country.code),
            ]),
            const SizedBox(height: 12),
            _section('Delivery', [
              _row(Icons.timer, 'Avg Pack Time', '12 min'),
              _row(Icons.delivery_dining, 'Delivery Range', '5 km'),
              _row(Icons.schedule, 'Auto-close', '11:00 PM'),
            ]),
            const SizedBox(height: 12),
            _section('Notifications', [
              _toggle('Order Alerts', true, (_) {}),
              _toggle('Low Stock Alerts', true, (_) {}),
              _toggle('Review Notifications', true, (_) {}),
            ]),
            const SizedBox(height: 24),
            SizedBox(height: 44, child: OutlinedButton(onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/seller/login', (_) => false),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.w700)),
            )),
          ]);
        },
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Container(
    padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)), const SizedBox(height: 6), ...children]),
  );
  Widget _row(IconData i, String l, String v) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [Icon(i, size: 16, color: Colors.grey.shade400), const SizedBox(width: 8), Text(l, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)), const Spacer(), Text(v, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))]));
  Widget _toggle(String l, bool v, ValueChanged<bool> cb) => Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(children: [Expanded(child: Text(l, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))), Switch(value: v, activeThumbColor: SellerTheme.grocery, onChanged: cb)]));
}
