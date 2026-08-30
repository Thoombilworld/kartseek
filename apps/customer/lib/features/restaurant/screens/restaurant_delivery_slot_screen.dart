import 'package:flutter/material.dart';

/// Restaurant — Delivery Slot Selection Screen.
class RestaurantDeliverySlotScreen extends StatefulWidget {
  const RestaurantDeliverySlotScreen({super.key});
  @override
  State<RestaurantDeliverySlotScreen> createState() => _RestaurantDeliverySlotScreenState();
}

class _RestaurantDeliverySlotScreenState extends State<RestaurantDeliverySlotScreen> {
  static const _brandColor = Color(0xFFEA580C);
  bool _expressDelivery = false;
  int _selectedDay = 0;
  int? _selectedSlot;

  final _days = ['Today', 'Tomorrow', 'Wed, Jul 8', 'Thu, Jul 9'];
  final _slots = [
    {'time': '11:00 – 12:00', 'available': true},
    {'time': '12:00 – 13:00', 'available': true},
    {'time': '13:00 – 14:00', 'available': false},
    {'time': '14:00 – 15:00', 'available': true},
    {'time': '18:00 – 19:00', 'available': true},
    {'time': '19:00 – 20:00', 'available': true},
    {'time': '20:00 – 21:00', 'available': true},
    {'time': '21:00 – 22:00', 'available': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Schedule Delivery', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(children: [
        // Express toggle
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.flash_on, color: Colors.orange, size: 22)),
            const SizedBox(width: 12),
            const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Express Delivery', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
              Text('Get it within 30 mins', style: TextStyle(fontSize: 11, color: Colors.grey)),
            ])),
            Switch(
              value: _expressDelivery,
              onChanged: (v) => setState(() { _expressDelivery = v; _selectedSlot = null; }),
              activeThumbColor: Colors.orange,
            ),
          ]),
        ),
        // Day selector
        if (!_expressDelivery) ...[
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _days.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final isActive = i == _selectedDay;
                return GestureDetector(
                  onTap: () => setState(() { _selectedDay = i; _selectedSlot = null; }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(color: isActive ? _brandColor : Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: isActive ? _brandColor : Colors.grey.shade200)),
                    alignment: Alignment.center,
                    child: Text(_days[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: isActive ? Colors.white : Colors.grey.shade600)),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          // Time slots
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 3, crossAxisSpacing: 10, mainAxisSpacing: 10),
              itemCount: _slots.length,
              itemBuilder: (_, i) {
                final s = _slots[i];
                final available = s['available'] as bool;
                final isActive = i == _selectedSlot;
                return GestureDetector(
                  onTap: available ? () => setState(() => _selectedSlot = i) : null,
                  child: Container(
                    decoration: BoxDecoration(
                      color: !available ? Colors.grey.shade100 : isActive ? _brandColor.withValues(alpha: 0.1) : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isActive ? _brandColor : Colors.grey.shade200, width: isActive ? 2 : 1),
                    ),
                    alignment: Alignment.center,
                    child: Text(s['time'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: !available ? Colors.grey.shade400 : isActive ? _brandColor : Colors.black87)),
                  ),
                );
              },
            ),
          ),
        ] else
          const Expanded(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.flash_on, size: 48, color: Colors.orange),
            SizedBox(height: 8),
            Text('Express delivery in ~30 minutes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            SizedBox(height: 4),
            Text('Additional charges may apply', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ]))),
        // Confirm
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))]),
          child: SafeArea(top: false, child: SizedBox(width: double.infinity, height: 48, child: ElevatedButton(
            onPressed: (_expressDelivery || _selectedSlot != null) ? () => Navigator.pop(context) : null,
            style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0, disabledBackgroundColor: Colors.grey.shade300),
            child: Text(_expressDelivery ? 'Confirm Express Delivery' : 'Confirm Slot', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          ))),
        ),
      ]),
    );
  }
}
