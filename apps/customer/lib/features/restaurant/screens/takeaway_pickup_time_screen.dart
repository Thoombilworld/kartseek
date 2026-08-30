import 'package:flutter/material.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';

/// Takeaway Pickup Time Selector Screen
/// Shows date pickers and available time slots for takeaway orders.
class TakeawayPickupTimeScreen extends StatefulWidget {
  const TakeawayPickupTimeScreen({super.key});

  @override
  State<TakeawayPickupTimeScreen> createState() => _TakeawayPickupTimeScreenState();
}

class _TakeawayPickupTimeScreenState extends State<TakeawayPickupTimeScreen> {
  int _selectedDayIndex = 0;
  String? _selectedSlot;
  bool _isAsap = true;

  final _days = [
    {'label': 'Today', 'date': 'May 31', 'isAvailable': true},
    {'label': 'Tomorrow', 'date': 'Jun 1', 'isAvailable': true},
    {'label': 'Sun', 'date': 'Jun 2', 'isAvailable': true},
    {'label': 'Mon', 'date': 'Jun 3', 'isAvailable': false},
  ];

  // Slots per day — restaurant open 10:00–23:00, every 15 min, some booked
  final List<Map<String, dynamic>> _slots = [
    {'time': '09:15 AM', 'available': true, 'prepTime': '15 min'},
    {'time': '09:30 AM', 'available': true, 'prepTime': '15 min'},
    {'time': '09:45 AM', 'available': false, 'prepTime': '15 min'},
    {'time': '10:00 AM', 'available': true, 'prepTime': '15 min'},
    {'time': '10:15 AM', 'available': true, 'prepTime': '15 min'},
    {'time': '10:30 AM', 'available': true, 'prepTime': '15 min'},
    {'time': '11:00 AM', 'available': false, 'prepTime': '20 min'},
    {'time': '11:30 AM', 'available': true, 'prepTime': '20 min'},
    {'time': '12:00 PM', 'available': true, 'prepTime': '20 min'},
    {'time': '12:30 PM', 'available': false, 'prepTime': '20 min'},
    {'time': '01:00 PM', 'available': true, 'prepTime': '15 min'},
    {'time': '01:30 PM', 'available': true, 'prepTime': '15 min'},
    {'time': '02:00 PM', 'available': true, 'prepTime': '15 min'},
    {'time': '06:00 PM', 'available': true, 'prepTime': '25 min'},
    {'time': '06:30 PM', 'available': true, 'prepTime': '25 min'},
    {'time': '07:00 PM', 'available': false, 'prepTime': '25 min'},
    {'time': '07:30 PM', 'available': true, 'prepTime': '25 min'},
    {'time': '08:00 PM', 'available': true, 'prepTime': '25 min'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Select Pickup Time', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87)),
            Text('The Grand Biryani House', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: Column(
        children: [
          // ASAP option
          Padding(
            padding: const EdgeInsets.all(16),
            child: GestureDetector(
              onTap: () => setState(() { _isAsap = true; _selectedSlot = null; }),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _isAsap ? AppTheme.restaurantColor.withValues(alpha: 0.05) : Colors.white,
                  border: Border.all(color: _isAsap ? AppTheme.restaurantColor : Colors.grey.shade200, width: _isAsap ? 2 : 1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: _isAsap ? AppTheme.restaurantColor.withValues(alpha: 0.1) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.bolt, color: _isAsap ? AppTheme.restaurantColor : Colors.grey.shade500, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('As Soon As Possible', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: _isAsap ? AppTheme.restaurantColor : Colors.black87)),
                          Text('Ready in approx. 20–25 min', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                    if (_isAsap) const DecoratedBox(
                      decoration: BoxDecoration(color: AppTheme.restaurantColor, shape: BoxShape.circle),
                      child: SizedBox(width: 22, height: 22, child: Icon(Icons.check, color: Colors.white, size: 14)),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Schedule for later
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(children: [
              Expanded(child: Divider(color: Colors.grey.shade200)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('Or schedule for later', style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
              ),
              Expanded(child: Divider(color: Colors.grey.shade200)),
            ]),
          ),

          // Day selector
          SizedBox(
            height: 72,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _days.length,
              itemBuilder: (_, i) {
                final day = _days[i];
                final selected = _selectedDayIndex == i && !_isAsap;
                final available = day['isAvailable'] as bool;
                return GestureDetector(
                  onTap: available ? () => setState(() { _selectedDayIndex = i; _isAsap = false; _selectedSlot = null; }) : null,
                  child: Container(
                    width: 72, margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: selected ? AppTheme.restaurantColor : (available ? Colors.white : Colors.grey.shade100),
                      border: Border.all(color: selected ? AppTheme.restaurantColor : Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text(day['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: selected ? Colors.white : (available ? Colors.black87 : Colors.grey.shade400))),
                      Text(day['date'] as String, style: TextStyle(fontSize: 11, color: selected ? Colors.white70 : (available ? Colors.grey.shade500 : Colors.grey.shade300))),
                      if (!available) Text('Closed', style: TextStyle(fontSize: 9, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),

          // Time Slots
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Available Slots', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.grey.shade700)),
                  const SizedBox(height: 10),
                  Expanded(
                    child: GridView.builder(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: Responsive.value<int>(phone: 3, foldable: 4, tablet: 5), childAspectRatio: 2.4, crossAxisSpacing: 10, mainAxisSpacing: 10,
                      ),
                      itemCount: _slots.length,
                      itemBuilder: (_, i) {
                        final slot = _slots[i];
                        final slotTime = slot['time'] as String;
                        final available = slot['available'] as bool;
                        final selected = _selectedSlot == slotTime && !_isAsap;
                        return GestureDetector(
                          onTap: available ? () => setState(() { _selectedSlot = slotTime; _isAsap = false; }) : null,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: selected ? AppTheme.restaurantColor : (available ? Colors.white : Colors.grey.shade100),
                              border: Border.all(color: selected ? AppTheme.restaurantColor : (available ? Colors.grey.shade300 : Colors.grey.shade200), width: selected ? 2 : 1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              Text(slotTime, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? Colors.white : (available ? Colors.black87 : Colors.grey.shade400))),
                              if (!available)
                                Text('Full', style: TextStyle(fontSize: 9, color: Colors.red.shade400, fontWeight: FontWeight.w600))
                              else
                                Text(slot['prepTime'] as String, style: TextStyle(fontSize: 9, color: selected ? Colors.white70 : Colors.grey.shade400, fontWeight: FontWeight.w500)),
                            ]),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Confirm button
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -4))],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_isAsap || _selectedSlot != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.green.shade200)),
                      child: Row(children: [
                        Icon(Icons.check_circle, size: 16, color: Colors.green.shade700),
                        const SizedBox(width: 8),
                        Text(
                          _isAsap ? 'Pickup: As Soon As Possible (~20-25 min)' : 'Pickup: ${_days[_selectedDayIndex]['label']}, $_selectedSlot',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.green.shade800),
                        ),
                      ]),
                    ),
                  ElevatedButton(
                    onPressed: (_isAsap || _selectedSlot != null)
                        ? () => Navigator.pushReplacementNamed(context, AppRouter.takeawayCheckout, arguments: {
                              'pickupTime': _isAsap ? 'ASAP (~20-25 min)' : '${_days[_selectedDayIndex]['label']}, $_selectedSlot',
                            })
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.restaurantColor,
                      disabledBackgroundColor: Colors.grey.shade300,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: Text(
                      (_isAsap || _selectedSlot != null) ? 'Confirm Pickup Time' : 'Select a time slot',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
