import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Payment selection screen — M-Pesa, card, wallet, COD, insurance.
class PharmacyPaymentScreen extends StatefulWidget {
  const PharmacyPaymentScreen({super.key});
  @override State<PharmacyPaymentScreen> createState() => _PharmacyPaymentScreenState();
}

class _PharmacyPaymentScreenState extends State<PharmacyPaymentScreen> {
  int _selected = 0;

  String _mobileMoneyLabel(SupportedCountry c) {
    switch (c) {
      case SupportedCountry.kenya: return 'M-Pesa';
      case SupportedCountry.india: return 'UPI';
      case SupportedCountry.qatar:
      case SupportedCountry.uae:
      case SupportedCountry.saudiArabia:
      case SupportedCountry.bahrain:
      case SupportedCountry.kuwait:
      case SupportedCountry.oman: return 'Mobile Pay';
      case SupportedCountry.uk:
      case SupportedCountry.usa: return 'Apple Pay';
    }
  }

  List<Map<String, dynamic>> get _methods {
    final r = RegionService.instance.currentCountry;
    final mobilePay = _mobileMoneyLabel(r);
    return [
      {'label': mobilePay, 'subtitle': 'Pay via $mobilePay', 'icon': Icons.phone_android, 'color': Colors.green, 'recommended': true},
      {'label': 'Credit / Debit Card', 'subtitle': 'Visa, Mastercard, RuPay', 'icon': Icons.credit_card, 'color': Colors.blue, 'recommended': false},
      {'label': 'Wallet', 'subtitle': 'Balance: ${r.currencySymbol} 2,450', 'icon': Icons.account_balance_wallet, 'color': Colors.purple, 'recommended': false},
      {'label': 'Cash on Delivery', 'subtitle': 'Pay when you receive', 'icon': Icons.money, 'color': Colors.orange, 'recommended': false},
      {'label': 'Insurance Claim', 'subtitle': 'Use your health insurance', 'icon': Icons.health_and_safety, 'color': Colors.teal, 'recommended': false},
    ];
  }

  @override
  Widget build(BuildContext context) {
    final methods = _methods;
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Payment Method', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: Column(
        children: [
          RadioGroup<int>(
            groupValue: _selected,
            onChanged: (v) { if (v != null) setState(() => _selected = v); },
            child: Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: methods.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final m = methods[i];
                final sel = _selected == i;
                final color = m['color'] as Color;
                return GestureDetector(
                  onTap: () => setState(() => _selected = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: sel ? color.withValues(alpha: 0.04) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: sel ? color : Colors.grey.shade200, width: sel ? 2 : 1),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
                          child: Icon(m['icon'] as IconData, color: color, size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(m['label'] as String, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: sel ? color : Colors.black87)),
                                  if (m['recommended'] == true) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(4)),
                                      child: Text('Recommended', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(m['subtitle'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                            ],
                          ),
                        ),
                        Radio<int>(
                          value: i,
                          activeColor: color,
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
                  onPressed: () => Navigator.pop(context, methods[_selected]['label']),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  child: Text('Pay with ${methods[_selected]['label']}'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
