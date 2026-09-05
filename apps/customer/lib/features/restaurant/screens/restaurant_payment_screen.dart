import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant — Payment Methods Screen.
class RestaurantPaymentScreen extends StatefulWidget {
  const RestaurantPaymentScreen({super.key});
  @override
  State<RestaurantPaymentScreen> createState() => _RestaurantPaymentScreenState();
}

class _RestaurantPaymentScreenState extends State<RestaurantPaymentScreen> {
  static const _brandColor = Color(0xFFEA580C);
  int _selectedMethod = 0;

  final _methods = [
    {'type': 'wallet', 'label': 'KARTSEEK Wallet', 'detail': '${RegionService.instance.currentCountry.currencySymbol}2,340.00', 'icon': Icons.account_balance_wallet},
    {'type': 'card', 'label': '•••• 4242', 'detail': 'Visa ending 4242', 'icon': Icons.credit_card},
    {'type': 'mpesa', 'label': 'M-Pesa', 'detail': '+254 7** ***890', 'icon': Icons.phone_android},
    {'type': 'cod', 'label': 'Cash on Delivery', 'detail': 'Pay when food arrives', 'icon': Icons.money},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Payment Methods', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _methods.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final m = _methods[i];
              final isSelected = i == _selectedMethod;
              return GestureDetector(
                onTap: () => setState(() => _selectedMethod = i),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected ? _brandColor.withValues(alpha: 0.05) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade200, width: isSelected ? 2 : 1),
                  ),
                  child: Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Icon(m['icon'] as IconData, color: _brandColor, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(m['label'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text(m['detail'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ])),
                    Container(
                      width: 22, height: 22,
                      decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade300, width: 2)),
                      child: isSelected ? Center(child: Container(width: 12, height: 12, decoration: const BoxDecoration(shape: BoxShape.circle, color: _brandColor))) : null,
                    ),
                  ]),
                ),
              );
            },
          ),
        ),
        // Add new method
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: OutlinedButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('\ud83d\udcb3 Add a new payment card or mobile wallet'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)),
            icon: const Icon(Icons.add, color: _brandColor),
            label: const Text('Add Payment Method', style: TextStyle(color: _brandColor, fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: _brandColor), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), minimumSize: const Size(double.infinity, 48)),
          ),
        ),
        // Confirm
        Container(
          padding: const EdgeInsets.all(16),
          child: SafeArea(top: false, child: SizedBox(width: double.infinity, height: 48, child: ElevatedButton(
            onPressed: () => Navigator.pop(context, _methods[_selectedMethod]),
            style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
            child: const Text('Confirm', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          ))),
        ),
      ]),
    );
  }
}
