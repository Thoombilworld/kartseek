import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Pharmacy Order History Screen — Past orders with reorder and status badges.
class PharmacyOrderHistoryScreen extends StatefulWidget {
  const PharmacyOrderHistoryScreen({super.key});

  @override
  State<PharmacyOrderHistoryScreen> createState() => _PharmacyOrderHistoryScreenState();
}

class _PharmacyOrderHistoryScreenState extends State<PharmacyOrderHistoryScreen> {
  String _filter = 'all';
  static const _pharmacyColor = AppTheme.pharmacyColor;

  static const _orders = [
    {'id': 'PH-2026-1234', 'date': 'Today, 2:15 PM', 'status': 'out_for_delivery', 'total': 485, 'items': ['Dolo 650mg ×2', 'Crocin Advance ×1'], 'store': 'HealthPlus Pharmacy', 'isPrescription': false},
    {'id': 'PH-2026-1180', 'date': 'Yesterday', 'status': 'delivered', 'total': 1250, 'items': ['Metformin 500mg ×30', 'Amlodipine 5mg ×30', 'Vitamin D3 ×60'], 'store': 'MedEasy Store', 'isPrescription': true},
    {'id': 'PH-2026-1095', 'date': 'Jun 16', 'status': 'delivered', 'total': 320, 'items': ['Cetrizine 10mg ×10', 'Nasal Spray ×1'], 'store': 'HealthPlus Pharmacy', 'isPrescription': false},
    {'id': 'PH-2026-0980', 'date': 'Jun 12', 'status': 'cancelled', 'total': 890, 'items': ['Insulin Pen ×1'], 'store': 'MedEasy Store', 'isPrescription': true},
    {'id': 'PH-2026-0850', 'date': 'Jun 8', 'status': 'delivered', 'total': 180, 'items': ['Paracetamol ×3', 'Bandages ×1'], 'store': 'QuickMeds', 'isPrescription': false},
  ];

  static const _statusConfig = {
    'placed': {'label': 'Placed', 'color': Color(0xFF3B82F6), 'icon': Icons.receipt_long},
    'processing': {'label': 'Processing', 'color': Color(0xFFF59E0B), 'icon': Icons.hourglass_empty},
    'out_for_delivery': {'label': 'Out for Delivery', 'color': Color(0xFF8B5CF6), 'icon': Icons.delivery_dining},
    'delivered': {'label': 'Delivered', 'color': Color(0xFF10B981), 'icon': Icons.check_circle},
    'cancelled': {'label': 'Cancelled', 'color': Color(0xFFEF4444), 'icon': Icons.cancel},
  };

  List<Map<String, dynamic>> get _filtered => _filter == 'all' ? _orders : _orders.where((o) => o['status'] == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final results = _filtered;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('Pharmacy Orders', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: Column(children: [
        // ── Filter chips ──
        Container(
          height: 50, color: Colors.white,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            children: [
              _filterChip('All', 'all'),
              _filterChip('Active', 'out_for_delivery'),
              _filterChip('Delivered', 'delivered'),
              _filterChip('Cancelled', 'cancelled'),
            ],
          ),
        ),
        const Divider(height: 1),

        // ── Orders ──
        Expanded(child: results.isEmpty
          ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('💊', style: TextStyle(fontSize: 48)),
              SizedBox(height: 12),
              Text('No orders yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              Text('Your pharmacy orders will appear here', style: TextStyle(color: Color(0xFF64748B))),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: results.length,
              itemBuilder: (_, i) {
                final order = results[i];
                final cfg = _statusConfig[order['status']] ?? _statusConfig['delivered']!;
                final isActive = order['status'] == 'out_for_delivery' || order['status'] == 'processing';
                final items = order['items'] as List;
                final isPrx = order['isPrescription'] as bool;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(16),
                    border: isActive ? Border.all(color: (cfg['color'] as Color).withValues(alpha: 0.4)) : null,
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Header
                    Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Text(order['store'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                          if (isPrx) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(4)),
                              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                                Icon(Icons.description, size: 10, color: Color(0xFF6D28D9)),
                                SizedBox(width: 2),
                                Text('Rx', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF6D28D9))),
                              ]),
                            ),
                          ],
                          if (isActive) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: (cfg['color'] as Color).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                              child: Text('LIVE', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: cfg['color'] as Color)),
                            ),
                          ],
                        ]),
                        const SizedBox(height: 2),
                        Text('${order['date']}  •  ${order['id']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                      ])),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: (cfg['color'] as Color).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(cfg['icon'] as IconData, size: 12, color: cfg['color'] as Color),
                          const SizedBox(width: 4),
                          Text(cfg['label'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: cfg['color'] as Color)),
                        ]),
                      ),
                    ]),

                    const SizedBox(height: 10),
                    // Items
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
                      child: Wrap(spacing: 8, runSpacing: 4, children: items.map((item) => Text(item.toString(), style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))).toList()),
                    ),

                    const SizedBox(height: 10),
                    // Footer
                    Row(children: [
                      Text('$currency ${order['total']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                      const Spacer(),
                      if (isActive)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(color: _pharmacyColor, borderRadius: BorderRadius.circular(10)),
                          child: const Text('Track', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                        ),
                      if (order['status'] == 'delivered') ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(color: _pharmacyColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: _pharmacyColor.withValues(alpha: 0.3))),
                          child: const Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.replay, size: 14, color: _pharmacyColor),
                            SizedBox(width: 4),
                            Text('Reorder', style: TextStyle(color: _pharmacyColor, fontSize: 12, fontWeight: FontWeight.w700)),
                          ]),
                        ),
                      ],
                    ]),
                  ]),
                );
              },
            ),
        ),
      ]),
    );
  }

  Widget _filterChip(String label, String value) {
    final active = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: active ? _pharmacyColor : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: active ? _pharmacyColor : const Color(0xFFE2E8F0)),
        ),
        child: Center(child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF475569)))),
      ),
    );
  }
}
