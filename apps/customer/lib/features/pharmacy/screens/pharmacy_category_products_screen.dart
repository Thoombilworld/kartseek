import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/widgets/pharmacy_store_card.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Pharmacy Category Products — Shows stores filtered by category with restaurant-style cards.
class PharmacyCategoryProductsScreen extends StatefulWidget {
  final String categoryName;
  const PharmacyCategoryProductsScreen(
      {super.key, this.categoryName = 'OTC Medicines'});

  @override
  State<PharmacyCategoryProductsScreen> createState() =>
      _PharmacyCategoryProductsScreenState();
}

class _PharmacyCategoryProductsScreenState
    extends State<PharmacyCategoryProductsScreen> {
  @override
  void initState() {
    super.initState();
    // Find category ID by name and load stores
    final cat = PharmacyMockData.categories.firstWhere(
      (c) => c.name.toLowerCase() == widget.categoryName.toLowerCase(),
      orElse: () => PharmacyMockData.categories.first,
    );
    context.read<PharmacyBloc>().add(LoadPharmaciesByCategory(cat.id));
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        surfaceTintColor: Colors.white,
        centerTitle: true,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: const Icon(Icons.arrow_back_ios_new,
              color: Colors.black87, size: 20),
        ),
        title: Text(widget.categoryName,
            style: const TextStyle(
                color: Colors.black87,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3)),
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          if (state.status == PharmacyStatus.loading) {
            return const Center(
                child:
                    CircularProgressIndicator(color: AppTheme.pharmacyColor));
          }

          final stores = state.filteredStores;
          final categories = state.categories.isNotEmpty
              ? state.categories
              : PharmacyMockData.categories;

          if (stores.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.storefront_outlined,
                      size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text('No pharmacies found',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.grey.shade500)),
                  const SizedBox(height: 8),
                  Text(
                      'No stores are currently selling ${widget.categoryName} products',
                      style:
                          TextStyle(fontSize: 13, color: Colors.grey.shade400),
                      textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.pharmacyColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('Go Back',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 14)),
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(20),
            itemCount: stores.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (_, i) => PharmacyStoreCard(
              store: stores[i],
              allCategories: categories,
              isVertical: true,
              onTap: () => Navigator.pushNamed(
                  context, AppRouter.pharmacyStoreDetail,
                  arguments: stores[i].name),
            ),
          );
        },
      ),
    );
  }
}
