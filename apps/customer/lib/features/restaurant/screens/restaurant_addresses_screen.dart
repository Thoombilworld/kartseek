import 'package:flutter/material.dart';

/// Restaurant — Delivery Addresses Management Screen.
class RestaurantAddressesScreen extends StatefulWidget {
  const RestaurantAddressesScreen({super.key});
  @override
  State<RestaurantAddressesScreen> createState() => _RestaurantAddressesScreenState();
}

class _RestaurantAddressesScreenState extends State<RestaurantAddressesScreen> {
  static const _brandColor = Color(0xFFEA580C);
  int _defaultIndex = 0;

  final _addresses = [
    {'label': 'Home', 'icon': Icons.home, 'line': '45/2, 100 Feet Road, HAL 2nd Stage', 'city': 'Bengaluru 560008'},
    {'label': 'Office', 'icon': Icons.business, 'line': 'WeWork Galaxy, #43, Residency Road', 'city': 'Bengaluru 560025'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Delivery Addresses', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddDialog,
        backgroundColor: _brandColor,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _addresses.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (ctx, i) {
          final a = _addresses[i];
          final isDefault = i == _defaultIndex;
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDefault ? _brandColor : Colors.grey.shade200, width: isDefault ? 2 : 1),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Icon(a['icon'] as IconData, color: _brandColor, size: 18),
                ),
                const SizedBox(width: 10),
                Text(a['label'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                if (isDefault) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                    child: const Text('DEFAULT', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: _brandColor)),
                  ),
                ],
                const Spacer(),
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_vert, color: Colors.grey.shade400, size: 20),
                  onSelected: (v) {
                    if (v == 'default') setState(() => _defaultIndex = i);
                    if (v == 'delete') setState(() { _addresses.removeAt(i); if (_defaultIndex >= _addresses.length) _defaultIndex = 0; });
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'default', child: Text('Set as Default')),
                    const PopupMenuItem(value: 'edit', child: Text('Edit')),
                    const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                  ],
                ),
              ]),
              const SizedBox(height: 6),
              Text(a['line'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              Text(a['city'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
            ]),
          );
        },
      ),
    );
  }

  void _showAddDialog() {
    final labelCtl = TextEditingController();
    final lineCtl = TextEditingController();
    showModalBottomSheet(context: context, isScrollControlled: true, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Add New Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 16),
          TextField(controller: labelCtl, decoration: InputDecoration(labelText: 'Label (e.g. Home)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
          const SizedBox(height: 12),
          TextField(controller: lineCtl, decoration: InputDecoration(labelText: 'Full Address', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)))),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, height: 48, child: ElevatedButton(
            onPressed: () {
              if (labelCtl.text.isNotEmpty && lineCtl.text.isNotEmpty) {
                setState(() => _addresses.add({'label': labelCtl.text, 'icon': Icons.location_on, 'line': lineCtl.text, 'city': ''}));
                Navigator.pop(ctx);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
            child: const Text('Save Address', style: TextStyle(fontWeight: FontWeight.w800)),
          )),
        ]),
      ),
    );
  }
}
