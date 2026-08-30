import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';

/// Delivery Slot Selection Screen
class GroceryDeliverySlotScreen extends StatefulWidget {
  const GroceryDeliverySlotScreen({super.key});
  @override
  State<GroceryDeliverySlotScreen> createState() => _GroceryDeliverySlotScreenState();
}

class _GroceryDeliverySlotScreenState extends State<GroceryDeliverySlotScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  int _selectedDay = 0;
  int? _selectedSlot;
  bool _expressDelivery = false;

  List<Map<String, dynamic>> get _days {
    return List.generate(7, (i) {
      final d = DateTime.now().add(Duration(days: i));
      return {
        'date': d.day,
        'day': i == 0 ? 'Today' : i == 1 ? 'Tomorrow' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday - 1],
        'month': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.month - 1],
      };
    });
  }

  static const _slots = [
    {'label': '6 AM - 8 AM', 'available': true, 'surge': 0},
    {'label': '8 AM - 10 AM', 'available': true, 'surge': 0},
    {'label': '10 AM - 12 PM', 'available': true, 'surge': 0},
    {'label': '12 PM - 2 PM', 'available': false, 'surge': 0},
    {'label': '2 PM - 4 PM', 'available': true, 'surge': 0},
    {'label': '4 PM - 6 PM', 'available': true, 'surge': 0},
    {'label': '6 PM - 8 PM', 'available': true, 'surge': 10},
    {'label': '8 PM - 10 PM', 'available': true, 'surge': 20},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Delivery Slot', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Express toggle
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _expressDelivery ? Colors.orange.shade50 : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: _expressDelivery ? Colors.orange : Colors.grey.shade200, width: _expressDelivery ? 2 : 1),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42, height: 42,
                        decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.flash_on, color: Colors.orange, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Express Delivery', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                            Text('Get it in 30 min • +${RegionService.instance.currentCountry.currencySymbol} 49', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                          ],
                        ),
                      ),
                      Switch(
                        value: _expressDelivery,
                        onChanged: (v) => setState(() { _expressDelivery = v; _selectedSlot = null; }),
                        activeThumbColor: Colors.orange,
                      ),
                    ],
                  ),
                ),

                if (!_expressDelivery) ...[
                  const SizedBox(height: 20),
                  const Text('Select Date', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),

                  // Day selector
                  SizedBox(
                    height: 80,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _days.length,
                      itemBuilder: (context, i) {
                        final day = _days[i];
                        final isActive = i == _selectedDay;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedDay = i),
                          child: Container(
                            width: 60,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              color: isActive ? _groceryColor : Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: isActive ? _groceryColor : Colors.grey.shade200),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(day['day'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: isActive ? Colors.white70 : Colors.grey.shade500)),
                                Text('${day['date']}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: isActive ? Colors.white : Colors.grey.shade800)),
                                Text(day['month'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: isActive ? Colors.white70 : Colors.grey.shade500)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 20),
                  const Text('Select Time Slot', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),

                  // Time slots
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.8),
                    itemCount: _slots.length,
                    itemBuilder: (context, i) {
                      final slot = _slots[i];
                      final available = slot['available'] as bool;
                      final isActive = _selectedSlot == i;
                      final surge = slot['surge'] as int;

                      return GestureDetector(
                        onTap: available ? () => setState(() => _selectedSlot = i) : null,
                        child: Container(
                          decoration: BoxDecoration(
                            color: !available ? Colors.grey.shade100 : isActive ? _groceryColor.withValues(alpha: 0.1) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isActive ? _groceryColor : Colors.grey.shade200, width: isActive ? 2 : 1),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(slot['label'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: !available ? Colors.grey.shade400 : isActive ? _groceryColor : Colors.grey.shade700)),
                              if (surge > 0) Text('+${RegionService.instance.currentCountry.currencySymbol} $surge', style: TextStyle(fontSize: 9, color: Colors.orange.shade700, fontWeight: FontWeight.w700)),
                              if (!available) Text('Full', style: TextStyle(fontSize: 9, color: Colors.red.shade400, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),

          // Confirm
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))]),
            child: SafeArea(
              top: false,
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: (_expressDelivery || _selectedSlot != null) ? () => Navigator.pop(context) : null,
                  style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0, disabledBackgroundColor: Colors.grey.shade300),
                  child: const Text('Confirm Slot', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
