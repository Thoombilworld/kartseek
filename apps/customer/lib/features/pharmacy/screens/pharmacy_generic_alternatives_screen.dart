import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Generic alternatives — lower-cost substitutes for branded medicines.
class PharmacyGenericAlternativesScreen extends StatelessWidget {
  final String? medicineName;
  const PharmacyGenericAlternativesScreen({super.key, this.medicineName});

  @override
  Widget build(BuildContext context) {
    final cs = RegionService.instance.currentCountry.currencySymbol;
    final alternatives = [
      {'original': 'Augmentin 625 Duo', 'alt': 'Amoxyclav 625', 'mfg': 'Cipla', 'price': 145, 'savings': 175},
      {'original': 'Crocin Advance', 'alt': 'Paracetamol IP 500mg', 'mfg': 'Mankind', 'price': 15, 'savings': 30},
      {'original': 'Combiflam', 'alt': 'Ibugesic Plus', 'mfg': 'Cipla', 'price': 25, 'savings': 20},
      {'original': 'Pan-D', 'alt': 'Pantocid-DSR', 'mfg': 'Sun Pharma', 'price': 95, 'savings': 65},
      {'original': 'Allegra 120mg', 'alt': 'Fexofenadine 120', 'mfg': 'Dr Reddy\'s', 'price': 55, 'savings': 90},
      {'original': 'Dolo 650mg', 'alt': 'Paracetamol 650 IP', 'mfg': 'USV', 'price': 12, 'savings': 20},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Generic Alternatives', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.green.shade50,
            child: Row(
              children: [
                Icon(Icons.savings, color: Colors.green.shade700, size: 28),
                const SizedBox(width: 12),
                Expanded(child: Text(
                  'Same composition, same effects — lower price. All generics are FDA-approved.',
                  style: TextStyle(fontSize: 13, color: Colors.green.shade800, height: 1.4),
                )),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: alternatives.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final a = alternatives[i];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(a['original'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade500, decoration: TextDecoration.lineThrough)),
                              const SizedBox(height: 4),
                              Text(a['alt'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                              Text(a['mfg'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                            ],
                          )),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('$cs ${a['price']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.black87)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                                child: Text('Save $cs ${a['savings']}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity, height: 36,
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                          child: const Text('Add Generic to Cart'),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
