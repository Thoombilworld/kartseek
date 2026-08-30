import 'package:flutter/material.dart';

/// Seller Warehouse Management — Manage multiple warehouse locations and inventory distribution.
class MarketplaceWarehouseScreen extends StatelessWidget {
  const MarketplaceWarehouseScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final warehouses = [
      const _Warehouse(
          name: 'Mumbai Central Hub',
          code: 'WH-MUM-01',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          products: 450,
          space: 85,
          status: 'active'),
      const _Warehouse(
          name: 'Delhi NCR Facility',
          code: 'WH-DEL-01',
          city: 'Noida',
          state: 'UP',
          pincode: '201301',
          products: 320,
          space: 62,
          status: 'active'),
      const _Warehouse(
          name: 'Bangalore Tech Park',
          code: 'WH-BLR-01',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560037',
          products: 180,
          space: 45,
          status: 'active'),
      const _Warehouse(
          name: 'Pune Storage',
          code: 'WH-PUN-01',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          products: 0,
          space: 0,
          status: 'setup'),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Warehouses',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
        actions: [
          Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: _mp,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14)),
                child: const Text('+ Add',
                    style:
                        TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              )),
        ],
      ),
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        // Summary
        SliverToBoxAdapter(
            child: Container(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          decoration: const BoxDecoration(
              color: _mp,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28))),
          child:
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _kpi('Total', '${warehouses.length}', '🏭'),
            _kpi('Active',
                '${warehouses.where((w) => w.status == "active").length}', '✅'),
            _kpi('Products',
                '${warehouses.fold<int>(0, (s, w) => s + w.products)}', '📦'),
          ]),
        )),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final wh = warehouses[i];
              final isSetup = wh.status == 'setup';
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: isSetup
                          ? const Color(0xFFFDE68A)
                          : const Color(0xFFE5E7EB)),
                ),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                              color: isSetup
                                  ? const Color(0xFFFEF3C7)
                                  : const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(12)),
                          child: Icon(
                              isSetup ? Icons.construction : Icons.warehouse,
                              color: isSetup ? const Color(0xFFF59E0B) : _mp,
                              size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(wh.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14)),
                              Text('${wh.city}, ${wh.state} - ${wh.pincode}',
                                  style: const TextStyle(
                                      color: Color(0xFF9CA3AF), fontSize: 12)),
                            ])),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isSetup
                                ? const Color(0xFFF59E0B).withValues(alpha: 0.1)
                                : const Color(0xFF10B981)
                                    .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(wh.status.toUpperCase(),
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: isSetup
                                      ? const Color(0xFFF59E0B)
                                      : const Color(0xFF10B981))),
                        ),
                      ]),
                      if (!isSetup) ...[
                        const SizedBox(height: 14),
                        Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _stat('Products', '${wh.products}'),
                              _stat('Code', wh.code),
                              Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text('Space Used',
                                        style: TextStyle(
                                            color: Color(0xFF9CA3AF),
                                            fontSize: 10)),
                                    const SizedBox(height: 2),
                                    Row(children: [
                                      SizedBox(
                                          width: 60,
                                          child: ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(3),
                                            child: LinearProgressIndicator(
                                              value: wh.space / 100,
                                              backgroundColor:
                                                  const Color(0xFFF3F4F6),
                                              valueColor:
                                                  AlwaysStoppedAnimation(wh
                                                              .space >
                                                          80
                                                      ? const Color(0xFFEF4444)
                                                      : wh.space > 60
                                                          ? const Color(
                                                              0xFFF59E0B)
                                                          : const Color(
                                                              0xFF10B981)),
                                              minHeight: 6,
                                            ),
                                          )),
                                      const SizedBox(width: 6),
                                      Text('${wh.space}%',
                                          style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: wh.space > 80
                                                  ? const Color(0xFFEF4444)
                                                  : const Color(0xFF6B7280))),
                                    ]),
                                  ]),
                            ]),
                      ] else ...[
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF59E0B),
                              minimumSize: const Size.fromHeight(40),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10))),
                          child: const Text('Complete Setup',
                              style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white)),
                        ),
                      ],
                    ]),
              );
            },
            childCount: warehouses.length,
          )),
        ),
      ]),
    );
  }

  Widget _kpi(String label, String value, String emoji) => Column(children: [
        Text(emoji, style: const TextStyle(fontSize: 22)),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900)),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 11)),
      ]);

  Widget _stat(String label, String value) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10)),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      ]);
}

class _Warehouse {
  final String name, code, city, state, pincode, status;
  final int products, space;
  const _Warehouse(
      {required this.name,
      required this.code,
      required this.city,
      required this.state,
      required this.pincode,
      required this.products,
      required this.space,
      required this.status});
}
