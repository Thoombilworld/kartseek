import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Address Picker Screen — Select or add delivery address.
class GroceryAddressPickerScreen extends StatefulWidget {
  const GroceryAddressPickerScreen({super.key});
  @override
  State<GroceryAddressPickerScreen> createState() => _GroceryAddressPickerScreenState();
}

class _GroceryAddressPickerScreenState extends State<GroceryAddressPickerScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  int _selectedIndex = 0;

  final _addresses = [
    {'label': 'Home', 'icon': Icons.home, 'name': 'KARTSEEK User', 'line': '45/2, 100 Feet Road, HAL 2nd Stage', 'city': 'Bengaluru 560008', 'isDefault': true},
    {'label': 'Office', 'icon': Icons.business, 'name': 'KARTSEEK User', 'line': 'WeWork Galaxy, #43, Residency Road', 'city': 'Bengaluru 560025', 'isDefault': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Delivery Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(
        children: [
          // Map placeholder
          Container(
            height: 180,
            color: Colors.grey.shade100,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map, size: 48, color: _groceryColor.withValues(alpha: 0.3)),
                  const SizedBox(height: 8),
                  Text('Map pin selector', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                ],
              ),
            ),
          ),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Saved addresses
                  ..._addresses.asMap().entries.map((entry) {
                  final i = entry.key;
                  final addr = entry.value;
                  final isSelected = i == _selectedIndex;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedIndex = i),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isSelected ? _groceryColor : Colors.grey.shade200, width: isSelected ? 2 : 1),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: isSelected ? _groceryColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(addr['icon'] as IconData, color: isSelected ? _groceryColor : Colors.grey, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(addr['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: isSelected ? _groceryColor : Colors.grey.shade800)),
                                    if (addr['isDefault'] as bool) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                                        child: const Text('Default', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _groceryColor)),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(addr['line'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                                Text(addr['city'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                              ],
                            ),
                          ),
                          Container(
                            width: 20, height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: isSelected ? _groceryColor : Colors.grey.shade400, width: 2),
                              color: isSelected ? _groceryColor : Colors.transparent,
                            ),
                            child: isSelected ? const Icon(Icons.circle, size: 10, color: Colors.white) : null,
                          ),
                        ],
                      ),
                    ),
                  );
                }),

                // Add new address
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200, style: BorderStyle.solid),
                  ),
                  child: ListTile(
                    leading: Container(
                      width: 42, height: 42,
                      decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(10)),
                      child: Icon(Icons.add_location_alt, color: Colors.blue.shade600, size: 20),
                    ),
                    title: Text('Add New Address', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.blue.shade600)),
                    subtitle: Text('Use current location or enter manually', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                    trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400),
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Opening map to add a new address...'))),
                  ),
                ),
              ],
            ),
          ),

          // Confirm button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _groceryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('Deliver Here', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
