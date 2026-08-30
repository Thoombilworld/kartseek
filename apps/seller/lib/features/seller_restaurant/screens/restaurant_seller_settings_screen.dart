import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Seller Settings Screen — hours, prep time, delivery radius.
class RestaurantSellerSettingsScreen extends StatefulWidget {
  const RestaurantSellerSettingsScreen({super.key});
  @override
  State<RestaurantSellerSettingsScreen> createState() => _State();
}

class _State extends State<RestaurantSellerSettingsScreen> {
  bool _isOnline = true, _autoAccept = false, _dineIn = true, _takeaway = true, _delivery = true;
  double _prepTime = 25, _deliveryRadius = 5;

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _sectionTitle('Restaurant Status'),
        _card([
          _toggleTile('Online Status', _isOnline ? 'Open for orders' : 'Closed', Icons.power_settings_new, _isOnline, (v) => setState(() => _isOnline = v)),
          _div, _toggleTile('Auto-Accept Orders', 'Automatically accept new orders', Icons.flash_on, _autoAccept, (v) => setState(() => _autoAccept = v)),
        ]),
        const SizedBox(height: 16),
        _sectionTitle('Service Modes'),
        _card([
          _toggleTile('Dine-In', 'Accept dine-in customers', Icons.restaurant, _dineIn, (v) => setState(() => _dineIn = v)),
          _div, _toggleTile('Takeaway', 'Accept takeaway orders', Icons.takeout_dining, _takeaway, (v) => setState(() => _takeaway = v)),
          _div, _toggleTile('Delivery', 'Accept delivery orders', Icons.delivery_dining, _delivery, (v) => setState(() => _delivery = v)),
        ]),
        const SizedBox(height: 16),
        _sectionTitle('Preparation Time'),
        _card([ListTile(
          leading: Container(width: 36, height: 36, decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)), child: Icon(Icons.timer, color: c, size: 18)),
          title: Text('${_prepTime.round()} minutes', style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Slider(value: _prepTime, min: 10, max: 90, divisions: 16, activeColor: c, label: '${_prepTime.round()} min', onChanged: (v) => setState(() => _prepTime = v)),
        )]),
        const SizedBox(height: 16),
        _sectionTitle('Delivery Radius'),
        _card([ListTile(
          leading: Container(width: 36, height: 36, decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)), child: Icon(Icons.radar, color: c, size: 18)),
          title: Text('${_deliveryRadius.toStringAsFixed(1)} km', style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Slider(value: _deliveryRadius, min: 1, max: 20, divisions: 38, activeColor: c, label: '${_deliveryRadius.toStringAsFixed(1)} km', onChanged: (v) => setState(() => _deliveryRadius = v)),
        )]),
        const SizedBox(height: 24),
      ]),
    );
  }

  Widget _sectionTitle(String t) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(t, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)));
  Widget _card(List<Widget> children) => Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)), child: Column(children: children));
  Widget get _div => Divider(height: 1, color: Colors.grey.shade100);
  Widget _toggleTile(String title, String sub, IconData icon, bool val, ValueChanged<bool> cb) => ListTile(
    leading: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 18, color: Colors.grey)),
    title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
    subtitle: Text(sub, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
    trailing: Switch(value: val, onChanged: cb, activeThumbColor: SellerTheme.restaurant), dense: true,
  );
}
