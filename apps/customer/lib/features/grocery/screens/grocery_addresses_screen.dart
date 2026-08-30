import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';

/// Delivery Addresses Management Screen.
class GroceryAddressesScreen extends StatefulWidget {
  const GroceryAddressesScreen({super.key});
  @override
  State<GroceryAddressesScreen> createState() => _GroceryAddressesScreenState();
}

class _GroceryAddressesScreenState extends State<GroceryAddressesScreen> {
  static const _groceryColor = AppTheme.groceryColor;
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
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('My Addresses', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryAddressPicker),
        backgroundColor: _groceryColor,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add New', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: _addresses.length,
        itemBuilder: (context, i) {
          final addr = _addresses[i];
          final isDefault = i == _defaultIndex;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDefault ? _groceryColor : Colors.grey.shade200, width: isDefault ? 2 : 1),
            ),
            child: Row(children: [
              Container(
                width: 42, height: 42,
                decoration: BoxDecoration(color: isDefault ? _groceryColor.withValues(alpha: 0.1) : Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
                child: Icon(addr['icon'] as IconData, color: isDefault ? _groceryColor : Colors.grey, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(addr['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: isDefault ? _groceryColor : Colors.grey.shade800)),
                  if (isDefault) ...[const SizedBox(width: 6), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)), child: const Text('Default', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _groceryColor)))],
                ]),
                const SizedBox(height: 2),
                Text(addr['line'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                Text(addr['city'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ])),
              PopupMenuButton<String>(
                onSelected: (v) { if (v == 'default') setState(() => _defaultIndex = i); },
                itemBuilder: (_) => [
                  if (!isDefault) const PopupMenuItem(value: 'default', child: Text('Set as Default')),
                  const PopupMenuItem(value: 'edit', child: Text('Edit')),
                  const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                ],
                child: Icon(Icons.more_vert, color: Colors.grey.shade400, size: 20),
              ),
            ]),
          );
        },
      ),
    );
  }
}
