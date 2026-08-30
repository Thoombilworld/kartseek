import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';

/// Marketplace Address Selection Screen — lets user pick a delivery address.
class AddressSelectionScreen extends StatefulWidget {
  const AddressSelectionScreen({super.key});
  @override
  State<AddressSelectionScreen> createState() => _AddressSelectionScreenState();
}

class _AddressSelectionScreenState extends State<AddressSelectionScreen> {
  int _selectedIndex = 0;
  final List<Map<String, String>> _addresses = [
    {'label': 'Home', 'name': 'Amit Kumar', 'line1': '42, Lotus Apartment, Sector 15', 'line2': 'Gurugram, Haryana 122001', 'phone': '+91 98765 43210'},
    {'label': 'Office', 'name': 'Amit Kumar', 'line1': 'WeWork, DLF Cyber Hub, Tower A', 'line2': 'Gurugram, Haryana 122002', 'phone': '+91 98765 43210'},
    {'label': 'Other', 'name': 'Amit Kumar', 'line1': '78, Green Park Colony', 'line2': 'New Delhi, 110016', 'phone': '+91 88888 77777'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(title: const Text('Select Address'), actions: [
        TextButton.icon(
          onPressed: () { /* Opens add-address flow */ },
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Add New', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        ),
      ]),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _addresses.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final addr = _addresses[index];
          final selected = index == _selectedIndex;
          return GestureDetector(
            onTap: () => setState(() => _selectedIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: selected ? AppTheme.marketplaceColor : AppTheme.borderLight, width: selected ? 2 : 1),
                boxShadow: selected ? [BoxShadow(color: AppTheme.marketplaceColor.withValues(alpha: 0.1), blurRadius: 8)] : [],
              ),
              child: Row(children: [
                Container(
                  width: 20, height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: selected ? AppTheme.marketplaceColor : AppTheme.borderLight, width: 2),
                  ),
                  child: selected ? Center(child: Container(width: 10, height: 10, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.marketplaceColor))) : null,
                ),
                const SizedBox(width: 8),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(4)),
                      child: Text(addr['label']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.marketplaceColor)),
                    ),
                    const SizedBox(width: 8),
                    Text(addr['name']!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ]),
                  const SizedBox(height: 6),
                  Text(addr['line1']!, style: AppTheme.bodySM),
                  Text(addr['line2']!, style: AppTheme.bodySM),
                  const SizedBox(height: 4),
                  Text(addr['phone']!, style: AppTheme.caption),
                ])),
                if (selected) const Icon(Icons.check_circle, color: AppTheme.marketplaceColor, size: 22),
              ]),
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, AppRouter.checkout),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, minimumSize: const Size.fromHeight(52)),
            child: const Text('Deliver to this Address', style: AppTheme.buttonText),
          ),
        ),
      ),
    );
  }
}
