import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Delivery slot picker — date row + time slot chips.
class PharmacyDeliverySlotScreen extends StatefulWidget {
  const PharmacyDeliverySlotScreen({super.key});
  @override State<PharmacyDeliverySlotScreen> createState() => _PharmacyDeliverySlotScreenState();
}

class _PharmacyDeliverySlotScreenState extends State<PharmacyDeliverySlotScreen> {
  int _selectedDay = 0;
  String? _selectedSlotId;

  List<Map<String, dynamic>> get _days {
    final now = DateTime.now();
    return List.generate(5, (i) {
      final d = now.add(Duration(days: i));
      final labels = ['Today', 'Tomorrow'];
      return {
        'label': i < 2 ? labels[i] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday - 1],
        'date': '${d.day}/${d.month}',
        'full': d,
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    final slots = PharmacyMockData.deliverySlots;
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Select Delivery Slot', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day selector
          Container(
            height: 80, color: Colors.white,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _days.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) {
                final d = _days[i];
                final sel = _selectedDay == i;
                return GestureDetector(
                  onTap: () => setState(() => _selectedDay = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 72,
                    decoration: BoxDecoration(
                      color: sel ? AppTheme.pharmacyColor : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(14),
                      border: sel ? null : Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(d['label'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: sel ? Colors.white : Colors.black87)),
                        const SizedBox(height: 2),
                        Text(d['date'] as String, style: TextStyle(fontSize: 11, color: sel ? Colors.white70 : Colors.grey.shade500)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          // Slot list
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text('Available Slots', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
          ),
          const SizedBox(height: 12),
          RadioGroup<String>(
            groupValue: _selectedSlotId,
            onChanged: (v) => setState(() => _selectedSlotId = v),
            child: Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: slots.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final s = slots[i];
                final sel = _selectedSlotId == s.id;
                return GestureDetector(
                  onTap: s.isAvailable ? () => setState(() => _selectedSlotId = s.id) : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: !s.isAvailable ? Colors.grey.shade100 : sel ? AppTheme.pharmacyColor.withValues(alpha: 0.06) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: sel ? AppTheme.pharmacyColor : Colors.grey.shade200, width: sel ? 2 : 1),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: s.isExpress ? Colors.orange.shade50 : (sel ? AppTheme.pharmacyColor.withValues(alpha: 0.1) : Colors.grey.shade100),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            s.isExpress ? Icons.flash_on : Icons.access_time,
                            size: 20,
                            color: s.isExpress ? Colors.orange : (sel ? AppTheme.pharmacyColor : Colors.grey.shade600),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(s.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: !s.isAvailable ? Colors.grey.shade400 : Colors.black87)),
                                  if (s.isExpress) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(4)),
                                      child: Text('EXPRESS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.orange.shade800)),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(s.timeRange, style: TextStyle(fontSize: 12, color: !s.isAvailable ? Colors.grey.shade400 : Colors.grey.shade600)),
                            ],
                          ),
                        ),
                        if (s.extraFee != null)
                          Text('+KES ${s.extraFee!.toInt()}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.orange.shade700)),
                        if (!s.isAvailable)
                          Text('Full', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                        if (s.isAvailable && s.extraFee == null)
                          Text('FREE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                        const SizedBox(width: 8),
                        if (s.isAvailable) Radio<String>(
                          value: s.id,
                          activeColor: AppTheme.pharmacyColor,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          ),
          // Confirm
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -3))]),
            child: SafeArea(
              child: SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: _selectedSlotId != null ? () {
                    final slot = slots.firstWhere((s) => s.id == _selectedSlotId);
                    Navigator.pop(context, {'slotId': slot.id, 'slotLabel': '${_days[_selectedDay]['label']} • ${slot.timeRange}'});
                  } : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  child: const Text('Confirm Slot'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
