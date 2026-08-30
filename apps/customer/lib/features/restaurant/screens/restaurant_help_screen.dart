import 'package:flutter/material.dart';

/// Restaurant — Help & Support Screen.
class RestaurantHelpScreen extends StatelessWidget {
  const RestaurantHelpScreen({super.key});
  static const _brandColor = Color(0xFFEA580C);

  static const _faqs = [
    {'q': 'How do I track my food order?', 'a': 'Go to Orders > Active Orders and tap on your order to see real-time tracking with live driver location.'},
    {'q': 'Can I cancel my order?', 'a': 'You can cancel within 60 seconds of placing. After the restaurant starts preparing, cancellation may incur charges.'},
    {'q': 'How does table booking work?', 'a': 'Select a restaurant, tap "Book Table", choose date/time/guests. You\'ll receive a confirmation with QR code.'},
    {'q': 'What is Dine-In ordering?', 'a': 'Scan the QR code at your table to browse the menu and place orders directly. Pay online when done.'},
    {'q': 'How do I apply a coupon?', 'a': 'During checkout, tap "Apply Coupon" and enter your code. Discount will be applied to your total.'},
    {'q': 'Takeaway vs Delivery?', 'a': 'Delivery brings food to your door. Takeaway lets you pick it up from the restaurant — often faster and no delivery fee.'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Help & Support', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Quick actions
        Row(children: [
          _actionCard(context, Icons.chat, 'Live Chat', Colors.blue),
          const SizedBox(width: 10),
          _actionCard(context, Icons.call, 'Call Us', Colors.green),
          const SizedBox(width: 10),
          _actionCard(context, Icons.email, 'Email', Colors.purple),
        ]),
        const SizedBox(height: 20),
        Text('FREQUENTLY ASKED QUESTIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade500, letterSpacing: 1)),
        const SizedBox(height: 10),
        ..._faqs.map((f) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
            childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            shape: const Border(),
            title: Text(f['q']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            children: [Text(f['a']!, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4))],
          ),
        )),
      ]),
    );
  }

  Widget _actionCard(BuildContext context, IconData icon, String label, Color color) {
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (label == 'Live Chat') {
            Navigator.pushNamed(context, '/restaurant/chat', arguments: {'restaurantName': 'KARTSEEK Support'});
          } else {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('$label: Connecting you to support\u2026'),
              backgroundColor: color,
              behavior: SnackBarBehavior.floating,
            ));
          }
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(children: [
            Container(width: 44, height: 44, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 22)),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
        ),
      ),
    );
  }
}
