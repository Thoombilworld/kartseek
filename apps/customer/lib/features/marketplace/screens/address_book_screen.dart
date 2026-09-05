import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Address Book Screen — Manage delivery addresses with add/edit/delete, labels, and default selection.
class AddressBookScreen extends StatefulWidget {
  const AddressBookScreen({super.key});
  @override
  State<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends State<AddressBookScreen> {
  final _addresses = <_Address>[
    _Address(
        id: '1',
        name: 'Amit Kumar',
        phone: '+91 98765 43210',
        line1: '42, Marine Drive Apartments',
        line2: 'Near Gateway of India',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        label: 'Home',
        isDefault: true),
    _Address(
        id: '2',
        name: 'Amit Kumar',
        phone: '+91 98765 43210',
        line1: 'TechPark Tower, 5th Floor',
        line2: 'Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400069',
        label: 'Work',
        isDefault: false),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('📍 My Addresses',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: _addresses.isEmpty
          ? Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.location_off,
                  size: 64, color: Color(0xFFD1D5DB)),
              const SizedBox(height: 12),
              const Text('No addresses saved',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 16)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                  label: const Text('Add Address'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.marketplaceColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)))),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _addresses.length + 1,
              itemBuilder: (context, i) {
                if (i == _addresses.length) {
                  return GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: const Color(0xFFC7D2FE),
                            style: BorderStyle.solid),
                      ),
                      child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_circle_outline,
                                color: AppTheme.marketplaceColor, size: 22),
                            SizedBox(width: 8),
                            Text('Add New Address',
                                style: TextStyle(
                                    color: AppTheme.marketplaceColor,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15)),
                          ]),
                    ),
                  );
                }
                final addr = _addresses[i];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: addr.isDefault
                            ? AppTheme.marketplaceColor
                            : AppTheme.borderLight,
                        width: addr.isDefault ? 2 : 1),
                  ),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                                color: _labelColor(addr.label)
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6)),
                            child:
                                Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(_labelIcon(addr.label),
                                  size: 14, color: _labelColor(addr.label)),
                              const SizedBox(width: 4),
                              Text(addr.label,
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: _labelColor(addr.label))),
                            ]),
                          ),
                          if (addr.isDefault) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                  color: AppTheme.successGreen
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6)),
                              child: const Text('DEFAULT',
                                  style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.successGreen)),
                            ),
                          ],
                          const Spacer(),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert,
                                size: 20, color: AppTheme.textMuted),
                            onSelected: (val) {
                              if (val == 'default') {
                                setState(() {
                                  for (var a in _addresses) {
                                    a.isDefault = false;
                                  }
                                  addr.isDefault = true;
                                });
                              }
                              if (val == 'delete') {
                                setState(() => _addresses.remove(addr));
                              }
                            },
                            itemBuilder: (_) => [
                              const PopupMenuItem(
                                  value: 'edit', child: Text('Edit')),
                              if (!addr.isDefault)
                                const PopupMenuItem(
                                    value: 'default',
                                    child: Text('Set as Default')),
                              const PopupMenuItem(
                                  value: 'delete',
                                  child: Text('Delete',
                                      style: TextStyle(color: Colors.red))),
                            ],
                          ),
                        ]),
                        const SizedBox(height: 12),
                        Text(addr.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 2),
                        Text(addr.phone,
                            style: const TextStyle(
                                color: AppTheme.textSecondary, fontSize: 13)),
                        const SizedBox(height: 6),
                        Text(
                            '${addr.line1}\n${addr.line2}\n${addr.city}, ${addr.state} - ${addr.pincode}',
                            style: const TextStyle(
                                color: Color(0xFF4B5563),
                                fontSize: 13,
                                height: 1.4)),
                      ]),
                );
              },
            ),
    );
  }

  Color _labelColor(String label) => label == 'Home'
      ? AppTheme.marketplaceColor
      : label == 'Work'
          ? AppTheme.warningAmber
          : const Color(0xFF8B5CF6);
  IconData _labelIcon(String label) => label == 'Home'
      ? Icons.home
      : label == 'Work'
          ? Icons.business
          : Icons.location_on;
}

class _Address {
  final String id, name, phone, line1, line2, city, state, pincode, label;
  bool isDefault;
  _Address(
      {required this.id,
      required this.name,
      required this.phone,
      required this.line1,
      required this.line2,
      required this.city,
      required this.state,
      required this.pincode,
      required this.label,
      required this.isDefault});
}
