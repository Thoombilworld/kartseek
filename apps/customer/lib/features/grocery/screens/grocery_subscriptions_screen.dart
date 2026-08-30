import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Subscriptions Screen — Auto-reorder management.
class GrocerySubscriptionsScreen extends StatefulWidget {
  const GrocerySubscriptionsScreen({super.key});
  @override
  State<GrocerySubscriptionsScreen> createState() => _GrocerySubscriptionsScreenState();
}

class _GrocerySubscriptionsScreenState extends State<GrocerySubscriptionsScreen> {
  static const _groceryColor = AppTheme.groceryColor;

  final _subs = <Map<String, dynamic>>[
    {'name': 'Weekly Essentials', 'items': 'Milk, Bread, Eggs, Bananas', 'freq': 'Weekly', 'next': 'Jul 5', 'total': 345, 'active': true, 'emoji': '🥛'},
    {'name': 'Monthly Pantry', 'items': 'Rice, Oil, Sugar, Dal', 'freq': 'Monthly', 'next': 'Jul 15', 'total': 890, 'active': true, 'emoji': '🏪'},
    {'name': 'Baby Care', 'items': 'Diapers, Wipes, Baby Food', 'freq': 'Bi-weekly', 'next': 'Paused', 'total': 1250, 'active': false, 'emoji': '👶'},
  ];

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Subscriptions', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: Colors.white), onPressed: () => Navigator.pushNamed(context, CustomerRouter.grocery)),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: _subs.length,
        itemBuilder: (context, i) {
          final sub = _subs[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: sub['active'] as bool ? Colors.grey.shade200 : Colors.grey.shade200, style: sub['active'] as bool ? BorderStyle.solid : BorderStyle.none),
              boxShadow: sub['active'] as bool ? null : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text(sub['emoji'] as String, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text(sub['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: (sub['active'] as bool) ? _groceryColor.withValues(alpha: 0.1) : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(sub['active'] as bool ? 'Active' : 'Paused', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: sub['active'] as bool ? _groceryColor : Colors.grey)),
                      ),
                    ]),
                    Text(sub['items'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ])),
                  Text('$currency${sub['total']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Icon(Icons.schedule, size: 14, color: Colors.grey.shade400),
                  const SizedBox(width: 4),
                  Text(sub['freq'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  const SizedBox(width: 12),
                  Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade400),
                  const SizedBox(width: 4),
                  Text('Next: ${sub['next']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() => _subs[i] = {...sub, 'active': !(sub['active'] as bool)}),
                    child: Icon(sub['active'] as bool ? Icons.pause_circle : Icons.play_circle, color: sub['active'] as bool ? Colors.orange : _groceryColor, size: 28),
                  ),
                ]),
              ],
            ),
          );
        },
      ),
    );
  }
}
