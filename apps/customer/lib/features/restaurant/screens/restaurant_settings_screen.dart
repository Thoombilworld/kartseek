import 'package:flutter/material.dart';

/// Restaurant — Settings Screen.
class RestaurantSettingsScreen extends StatefulWidget {
  const RestaurantSettingsScreen({super.key});
  @override
  State<RestaurantSettingsScreen> createState() => _RestaurantSettingsScreenState();
}

class _RestaurantSettingsScreenState extends State<RestaurantSettingsScreen> {
  static const _brandColor = Color(0xFFEA580C);
  bool _orderNotifs = true, _dealNotifs = true, _priceAlerts = false, _darkMode = false;

  final _dietary = {'Vegetarian': false, 'Vegan': false, 'Halal': true, 'Gluten-Free': false, 'Nut-Free': false};
  final _cuisines = {'Indian': true, 'Italian': true, 'Chinese': false, 'Japanese': false, 'Mexican': false, 'Thai': true};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _sectionTitle('Dietary Preferences'),
        Wrap(spacing: 8, runSpacing: 8, children: _dietary.entries.map((e) =>
          GestureDetector(
            onTap: () => setState(() => _dietary[e.key] = !e.value),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: e.value ? _brandColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: e.value ? _brandColor : Colors.grey.shade300),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (e.value) const Icon(Icons.check, size: 14, color: _brandColor),
                if (e.value) const SizedBox(width: 4),
                Text(e.key, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: e.value ? _brandColor : Colors.grey.shade600)),
              ]),
            ),
          )).toList()),
        const SizedBox(height: 16),

        _sectionTitle('Cuisine Preferences'),
        Wrap(spacing: 8, runSpacing: 8, children: _cuisines.entries.map((e) =>
          GestureDetector(
            onTap: () => setState(() => _cuisines[e.key] = !e.value),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: e.value ? _brandColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: e.value ? _brandColor : Colors.grey.shade300),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (e.value) const Icon(Icons.check, size: 14, color: _brandColor),
                if (e.value) const SizedBox(width: 4),
                Text(e.key, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: e.value ? _brandColor : Colors.grey.shade600)),
              ]),
            ),
          )).toList()),
        const SizedBox(height: 16),

        _sectionTitle('Notifications'),
        Container(
          decoration: _cardDecoration,
          child: Column(children: [
            _toggleTile('Order Updates', 'Status changes, delivery alerts', Icons.delivery_dining, _orderNotifs, (v) => setState(() => _orderNotifs = v)),
            _divider,
            _toggleTile('Deal Alerts', 'Flash deals, restaurant offers', Icons.local_offer, _dealNotifs, (v) => setState(() => _dealNotifs = v)),
            _divider,
            _toggleTile('Price Drop Alerts', 'Favorite restaurant specials', Icons.trending_down, _priceAlerts, (v) => setState(() => _priceAlerts = v)),
          ]),
        ),
        const SizedBox(height: 16),

        _sectionTitle('Display'),
        Container(
          decoration: _cardDecoration,
          child: Column(children: [
            _toggleTile('Dark Mode', 'Use dark theme', Icons.dark_mode, _darkMode, (v) => setState(() => _darkMode = v)),
          ]),
        ),
        const SizedBox(height: 24),
        Center(child: Text('KARTSEEK Food v1.0.0', style: TextStyle(fontSize: 11, color: Colors.grey.shade400))),
        const SizedBox(height: 24),
      ]),
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
      trailing: Switch(value: value, onChanged: onChanged, activeThumbColor: _brandColor),
      dense: true,
    );
  }
}
