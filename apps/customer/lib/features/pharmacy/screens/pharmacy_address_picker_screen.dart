import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Address picker for pharmacy delivery — saved addresses, add new, GPS auto-detect.
class PharmacyAddressPickerScreen extends StatefulWidget {
  const PharmacyAddressPickerScreen({super.key});
  @override State<PharmacyAddressPickerScreen> createState() => _PharmacyAddressPickerScreenState();
}

class _PharmacyAddressPickerScreenState extends State<PharmacyAddressPickerScreen> {
  int _selected = 0;
  final _addresses = [
    {'label': 'Home', 'icon': Icons.home_outlined, 'address': '123 Main Avenue, Westlands, Nairobi', 'phone': '+254 712 345 678', 'default': true},
    {'label': 'Work', 'icon': Icons.work_outline, 'address': '45 CBD Tower, Kenyatta Avenue, Nairobi', 'phone': '+254 712 345 678', 'default': false},
    {'label': 'Mom\'s Place', 'icon': Icons.favorite_border, 'address': '78 Garden Estate, Roysambu, Nairobi', 'phone': '+254 798 765 432', 'default': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Select Delivery Address', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: Column(
        children: [
          // GPS detect
          Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [AppTheme.pharmacyColor.withValues(alpha: 0.08), AppTheme.pharmacyColor.withValues(alpha: 0.04)]),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.pharmacyColor.withValues(alpha: 0.2)),
            ),
            child: ListTile(
              leading: Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: AppTheme.pharmacyColor.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.my_location, color: AppTheme.pharmacyColor, size: 20),
              ),
              title: const Text('Use Current Location', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('Auto-detect via GPS', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400),
              onTap: () => Navigator.pop(context, {'label': 'Current Location', 'address': 'GPS detected'}),
            ),
          ),
          // Saved addresses
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Row(
              children: [
                Text('Saved Addresses', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
                const Spacer(),
                TextButton.icon(
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add New', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  style: TextButton.styleFrom(foregroundColor: AppTheme.pharmacyColor),
                  onPressed: () {},
                ),
              ],
            ),
          ),
          RadioGroup<int>(
            groupValue: _selected,
            onChanged: (v) { if (v != null) setState(() => _selected = v); },
            child: Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _addresses.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                final a = _addresses[i];
                final isSelected = _selected == i;
                return GestureDetector(
                  onTap: () => setState(() => _selected = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isSelected ? AppTheme.pharmacyColor : Colors.grey.shade200, width: isSelected ? 2 : 1),
                      boxShadow: isSelected ? [BoxShadow(color: AppTheme.pharmacyColor.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))] : null,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.pharmacyColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(a['icon'] as IconData, size: 20, color: isSelected ? AppTheme.pharmacyColor : Colors.grey.shade600),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(a['label'] as String, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: isSelected ? AppTheme.pharmacyColor : Colors.black87)),
                                  if (a['default'] == true) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(4)),
                                      child: Text('Default', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(a['address'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600), maxLines: 2),
                              const SizedBox(height: 2),
                              Text(a['phone'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                            ],
                          ),
                        ),
                        Radio<int>(
                          value: i,
                          activeColor: AppTheme.pharmacyColor,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          ),
          // Confirm button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -3))]),
            child: SafeArea(
              child: SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context, _addresses[_selected]),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  child: const Text('Deliver Here'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
