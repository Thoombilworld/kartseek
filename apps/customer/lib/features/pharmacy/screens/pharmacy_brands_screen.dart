import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';

/// Brands directory — A-Z scrollable grid with product counts.
class PharmacyBrandsScreen extends StatefulWidget {
  const PharmacyBrandsScreen({super.key});
  @override State<PharmacyBrandsScreen> createState() => _PharmacyBrandsScreenState();
}

class _PharmacyBrandsScreenState extends State<PharmacyBrandsScreen> {
  @override
  void initState() { super.initState(); context.read<PharmacyBloc>().add(const LoadPharmacyBrands()); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Brands', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          if (state.brands.isEmpty) return const Center(child: CircularProgressIndicator());
          final brands = state.brands;
          final grouped = <String, List<PharmacyBrand>>{};
          for (final b in brands) {
            final letter = b.name[0].toUpperCase();
            grouped.putIfAbsent(letter, () => []).add(b);
          }
          final letters = grouped.keys.toList()..sort();
          return Row(
            children: [
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: letters.length,
                  itemBuilder: (_, i) {
                    final l = letters[i];
                    final items = grouped[l]!;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.pharmacyColor)),
                        const SizedBox(height: 8),
                        ...items.map((b) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(
                              backgroundColor: Colors.cyan.shade50,
                              child: Text(b.name[0], style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.pharmacyColor)),
                            ),
                            title: Text(b.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            subtitle: Text('${b.productCount} products', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                            trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
                            onTap: () => Navigator.pushNamed(context, '/pharmacy/search', arguments: b.name),
                          ),
                        )),
                        const SizedBox(height: 12),
                      ],
                    );
                  },
                ),
              ),
              // A-Z side index
              Container(
                width: 24, color: Colors.transparent,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: letters.map((l) => GestureDetector(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 1),
                      child: Text(l, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.pharmacyColor)),
                    ),
                  )).toList(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
