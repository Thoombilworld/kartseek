import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Grocery Settings Screen — Preferences, dietary, notifications, theme.
class GrocerySettingsScreen extends StatefulWidget {
  const GrocerySettingsScreen({super.key});
  @override
  State<GrocerySettingsScreen> createState() => _GrocerySettingsScreenState();
}

class _GrocerySettingsScreenState extends State<GrocerySettingsScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  bool _orderNotifs = true;
  bool _dealNotifs = true;
  bool _priceAlerts = false;
  String _units = 'Metric (kg, L)';
  bool _darkMode = false;

  final _dietary = <String, bool>{'Vegetarian': false, 'Vegan': false, 'Halal': true, 'Gluten-Free': false, 'Organic Preferred': true};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Dietary Preferences
          _sectionTitle('Dietary Preferences'),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: _cardDecoration,
            child: Wrap(spacing: 8, runSpacing: 8, children: _dietary.entries.map((e) => GestureDetector(
              onTap: () => setState(() => _dietary[e.key] = !e.value),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: e.value ? _groceryColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: e.value ? _groceryColor : Colors.grey.shade300),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (e.value) const Icon(Icons.check, size: 14, color: _groceryColor),
                  if (e.value) const SizedBox(width: 4),
                  Text(e.key, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: e.value ? _groceryColor : Colors.grey.shade600)),
                ]),
              ),
            )).toList()),
          ),
          const SizedBox(height: 16),

          // Notifications
          _sectionTitle('Notifications'),
          Container(
            decoration: _cardDecoration,
            child: Column(children: [
              _toggleTile('Order Updates', 'Status changes, delivery alerts', Icons.shopping_bag, _orderNotifs, (v) => setState(() => _orderNotifs = v)),
              _divider,
              _toggleTile('Deal Alerts', 'Flash deals, new offers', Icons.local_offer, _dealNotifs, (v) => setState(() => _dealNotifs = v)),
              _divider,
              _toggleTile('Price Drop Alerts', 'Wishlist item price changes', Icons.trending_down, _priceAlerts, (v) => setState(() => _priceAlerts = v)),
            ]),
          ),
          const SizedBox(height: 16),

          // Display
          _sectionTitle('Display'),
          Container(
            decoration: _cardDecoration,
            child: Column(children: [
              ListTile(
                leading: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.straighten, size: 18, color: Colors.grey)),
                title: const Text('Units', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                subtitle: Text(_units, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400),
                dense: true,
                onTap: () => setState(() => _units = _units.contains('Metric') ? 'Imperial (lb, oz)' : 'Metric (kg, L)'),
              ),
              _divider,
              _toggleTile('Dark Mode', 'Use dark theme', Icons.dark_mode, _darkMode, (v) => setState(() => _darkMode = v)),
            ]),
          ),
          const SizedBox(height: 16),

          // More
          _sectionTitle('More'),
          Container(
            decoration: _cardDecoration,
            child: Column(children: [
              _navTile('Language', Icons.translate, () {}),
              _divider,
              _navTile('Privacy Policy', Icons.privacy_tip, () {}),
              _divider,
              _navTile('Terms of Service', Icons.description, () {}),
              _divider,
              _navTile('Rate the App', Icons.star, () {}),
            ]),
          ),
          const SizedBox(height: 24),

          Center(child: Text('KARTSEEK Grocery v1.0.0', style: TextStyle(fontSize: 11, color: Colors.grey.shade400))),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  BoxDecoration get _cardDecoration => BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200));
  Widget get _divider => Divider(height: 1, color: Colors.grey.shade100);

  Widget _sectionTitle(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
  );

  Widget _toggleTile(String title, String sub, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return ListTile(
      leading: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 18, color: Colors.grey)),
      title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      subtitle: Text(sub, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      trailing: Switch(value: value, onChanged: onChanged, activeThumbColor: _groceryColor),
      dense: true,
    );
  }

  Widget _navTile(String title, IconData icon, VoidCallback onTap) {
    return ListTile(
      leading: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 18, color: Colors.grey)),
      title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400),
      dense: true,
      onTap: onTap,
    );
  }
}
