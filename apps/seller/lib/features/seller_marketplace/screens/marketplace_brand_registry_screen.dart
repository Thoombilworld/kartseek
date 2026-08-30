import 'package:flutter/material.dart';

/// Seller Brand Center — Brand registry, storefront management, IP protection.
class MarketplaceBrandCenterDetailScreen extends StatelessWidget {
  final Map<String, dynamic> brandData;
  const MarketplaceBrandCenterDetailScreen({super.key, required this.brandData});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final name = brandData['name'] ?? 'Unknown';
    final status = brandData['status']?.toString().toUpperCase() ?? 'PENDING';
    final trademark = brandData['trademark'] ?? 'N/A';
    final products = brandData['products'] ?? 0;
    final logo = brandData['logo'] ?? '🔷';

    final benefits = [
      'Brand Storefront Page',
      'Enhanced A+ Content',
      'Counterfeit Protection',
      'Brand Analytics',
      'Sponsored Brand Ads',
      'IP Violation Reporting'
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Brand Registry',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
        actions: [
          Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pushNamed(context, '/seller/marketplace/brand-analytics', arguments: brandData);
                },
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: _mp,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14)),
                icon: const Icon(Icons.analytics, size: 16),
                label: const Text('Brand Analytics',
                    style:
                        TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              )),
        ],
      ),
      body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            // Benefits
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient:
                    LinearGradient(colors: [_mp, _mp.withValues(alpha: 0.8)]),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Brand Registry Benefits',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: benefits
                            .map((b) => Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                      color:
                                          Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8)),
                                  child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.check_circle,
                                            color: Colors.white, size: 14),
                                        const SizedBox(width: 4),
                                        Text(b,
                                            style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600)),
                                      ]),
                                ))
                            .toList()),
                  ]),
            ),
            const SizedBox(height: 16),

            // Selected Brand
            Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE5E7EB))),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                                color: const Color(0xFFEEF2FF),
                                borderRadius: BorderRadius.circular(12)),
                            child: Center(
                                child: Text(logo,
                                    style: const TextStyle(fontSize: 24))),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Row(children: [
                                  Text(name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 16)),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: status == 'REGISTERED'
                                          ? const Color(0xFF10B981)
                                              .withValues(alpha: 0.1)
                                          : const Color(0xFFF59E0B)
                                              .withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(status,
                                        style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: status == 'REGISTERED'
                                                ? const Color(0xFF10B981)
                                                : const Color(0xFFF59E0B))),
                                  ),
                                ]),
                                Text('TM: $trademark',
                                    style: const TextStyle(
                                        color: Color(0xFF9CA3AF),
                                        fontSize: 12)),
                              ])),
                        ]),
                        const SizedBox(height: 14),
                        Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _stat('Products', '$products'),
                              _stat('IP Violations', '0'),
                              _stat(
                                  'Storefront',
                                  status == 'REGISTERED'
                                      ? 'Active'
                                      : 'Pending'),
                            ]),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(
                              child: OutlinedButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Manage Brand configuration coming soon'))
                              );
                            },
                            style: OutlinedButton.styleFrom(
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10))),
                            child: const Text('Manage',
                                style: TextStyle(fontWeight: FontWeight.w600)),
                          )),
                          const SizedBox(width: 8),
                          Expanded(
                              child: ElevatedButton(
                            onPressed: () {
                              Navigator.pushNamed(context, '/seller/marketplace/storefront');
                            },
                            style: ElevatedButton.styleFrom(
                                backgroundColor: _mp,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10))),
                            child: const Text('View Store',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white)),
                          )),
                        ]),
                      ]),
                ),
          ])),
    );
  }

  Widget _stat(String label, String value) => Column(children: [
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        Text(label,
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
      ]);
}

