import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Payment Method Selection Screen
class GroceryPaymentScreen extends StatefulWidget {
  const GroceryPaymentScreen({super.key});
  @override
  State<GroceryPaymentScreen> createState() => _GroceryPaymentScreenState();
}

class _GroceryPaymentScreenState extends State<GroceryPaymentScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  String _selected = 'wallet';
  bool _processing = false;

  static List<Map<String, dynamic>> get _methods {
    final cs = RegionService.instance.currentCountry.currencySymbol;
    return [
      {'id': 'wallet', 'label': 'KARTSEEK Wallet', 'desc': 'Balance: $cs 2,450', 'icon': Icons.account_balance_wallet, 'badge': 'Fastest'},
      {'id': 'upi', 'label': 'UPI', 'desc': 'GPay, PhonePe, Paytm', 'icon': Icons.smartphone, 'badge': 'Popular'},
      {'id': 'card', 'label': 'Credit / Debit Card', 'desc': 'Visa, Mastercard, RuPay', 'icon': Icons.credit_card, 'badge': ''},
      {'id': 'netbanking', 'label': 'Net Banking', 'desc': 'All major banks', 'icon': Icons.account_balance, 'badge': ''},
      {'id': 'cod', 'label': 'Cash on Delivery', 'desc': '$cs 10 convenience fee', 'icon': Icons.money, 'badge': ''},
    ];
  }

  void _handlePay() {
    setState(() => _processing = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) Navigator.pop(context, true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final methods = _methods;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Payment', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Choose Payment Method', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                const SizedBox(height: 12),
                ...methods.map((m) {
                  final isActive = _selected == m['id'];
                  return GestureDetector(
                    onTap: () => setState(() => _selected = m['id'] as String),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isActive ? _groceryColor : Colors.grey.shade200, width: isActive ? 2 : 1),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44, height: 44,
                            decoration: BoxDecoration(
                              color: isActive ? _groceryColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(m['icon'] as IconData, color: isActive ? _groceryColor : Colors.grey, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(m['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: isActive ? _groceryColor : Colors.grey.shade800)),
                                    if ((m['badge'] as String).isNotEmpty) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(4)),
                                        child: Text(m['badge'] as String, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.orange.shade700)),
                                      ),
                                    ],
                                  ],
                                ),
                                Text(m['desc'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                              ],
                            ),
                          ),
                          Container(
                            width: 22, height: 22,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: isActive ? _groceryColor : Colors.grey.shade300, width: 2),
                              color: isActive ? _groceryColor : Colors.transparent,
                            ),
                            child: isActive ? const Icon(Icons.check, color: Colors.white, size: 14) : null,
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),

          // Pay button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))]),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total Amount', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                      Text('${currency}550', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _processing ? null : _handlePay,
                      style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                      child: _processing
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.lock, size: 16),
                                const SizedBox(width: 6),
                                Text('Pay ${currency}550', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.shield, size: 12, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Text('256-bit SSL encrypted', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
