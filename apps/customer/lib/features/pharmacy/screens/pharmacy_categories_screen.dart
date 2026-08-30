import 'package:flutter/material.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// All pharmacy categories — tappable grid with emoji, product counts, Rx badge.
class PharmacyCategoriesScreen extends StatelessWidget {
  const PharmacyCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const categories = PharmacyMockData.categories;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('All Categories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.85,
        ),
        itemCount: categories.length,
        itemBuilder: (context, i) {
          final cat = categories[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, '/pharmacy/category', arguments: cat.name),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade50, borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200, width: 0.5),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(cat.emoji, style: const TextStyle(fontSize: 32)),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(cat.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black87),
                      textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('${cat.productCount} items', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                      if (cat.requiresPrescription) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(3)),
                          child: Text('Rx', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: Colors.red.shade700)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
