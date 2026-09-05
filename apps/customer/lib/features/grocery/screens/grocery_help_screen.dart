import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Help Center Screen — FAQ, contact support, raise ticket.
class GroceryHelpScreen extends StatefulWidget {
  const GroceryHelpScreen({super.key});
  @override
  State<GroceryHelpScreen> createState() => _GroceryHelpScreenState();
}

class _GroceryHelpScreenState extends State<GroceryHelpScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  final _expandedItems = <int>{};

  static const _faqs = [
    {'q': 'How do I track my order?', 'a': 'Go to Orders → select your order → Track Order for real-time updates.'},
    {'q': 'What are the delivery hours?', 'a': 'We deliver from 6:00 AM to 10:00 PM daily.'},
    {'q': 'What payment methods are accepted?', 'a': 'KARTSEEK Wallet, UPI, Cards, Net Banking, and Cash on Delivery.'},
    {'q': 'How do I return an item?', 'a': 'Fresh items can be returned within 24 hours. Go to Orders → Report Issue.'},
    {'q': 'How long do refunds take?', 'a': 'Wallet refunds are instant. Bank refunds take 5-7 business days.'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Help Center', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Contact options
          Row(children: [
            _contactCard(Icons.chat, 'Live Chat', '2 min', Colors.green),
            const SizedBox(width: 8),
            _contactCard(Icons.phone, 'Call Us', 'Toll-free', Colors.blue),
            const SizedBox(width: 8),
            _contactCard(Icons.email, 'Email', 'Support', Colors.purple),
          ]),
          const SizedBox(height: 20),

          const Text('Frequently Asked Questions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),

          // FAQ accordion
          ...List.generate(_faqs.length, (i) {
            final faq = _faqs[i];
            final isOpen = _expandedItems.contains(i);
            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
              child: Column(children: [
                ListTile(
                  onTap: () => setState(() => isOpen ? _expandedItems.remove(i) : _expandedItems.add(i)),
                  title: Text(faq['q'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  trailing: Icon(isOpen ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: Colors.grey.shade400),
                  dense: true,
                ),
                if (isOpen) Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(8)),
                    child: Text(faq['a'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4)),
                  ),
                ),
              ]),
            );
          }),
        ],
      ),
    );
  }

  Widget _contactCard(IconData icon, String label, String sub, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
        child: Column(children: [
          Container(width: 38, height: 38, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          Text(sub, style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
        ]),
      ),
    );
  }
}
