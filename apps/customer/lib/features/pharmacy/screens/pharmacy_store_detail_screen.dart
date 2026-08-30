import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Pharmacy Store Detail — Premium Redesign with BLoC-driven data.
class PharmacyStoreDetailScreen extends StatefulWidget {
  final String storeName;
  const PharmacyStoreDetailScreen(
      {super.key, this.storeName = 'HealthPlus Pharmacy'});

  @override
  State<PharmacyStoreDetailScreen> createState() => _PharmacyStoreDetailScreenState();
}

class _PharmacyStoreDetailScreenState extends State<PharmacyStoreDetailScreen> {
  String? _selectedCategoryId;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    context.read<PharmacyBloc>().add(LoadPharmacyStoreDetail(widget.storeName));
    // Bind this store to the cart for single-store enforcement
    context.read<PharmacyBloc>().add(SelectPharmacyStore(
      storeId: widget.storeName,
      storeName: widget.storeName,
    ));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return BlocListener<PharmacyBloc, PharmacyState>(
      listenWhen: (prev, curr) => !prev.storeConflict && curr.storeConflict,
      listener: _showStoreSwitchDialog,
      child: BlocBuilder<PharmacyBloc, PharmacyState>(
      builder: (context, state) {
        final store = state.storeDetail ?? PharmacyMockData.getStoreByName(widget.storeName);
        final allProducts = state.storeProducts.isNotEmpty
            ? state.storeProducts
            : PharmacyMockData.getProductsByStore(store.id);

        // Filter products by category and search
        var products = _selectedCategoryId != null
            ? allProducts.where((p) => p.categoryId == _selectedCategoryId).toList()
            : allProducts;
        if (_searchQuery.isNotEmpty) {
          products = products.where((p) =>
            p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().contains(_searchQuery.toLowerCase())
          ).toList();
        }

        final storeCategories = PharmacyMockData.categories
            .where((c) => store.categoryIds.contains(c.id)).toList();

        return Scaffold(
          backgroundColor: Colors.white,
          body: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              _buildSliverAppBar(context, store),
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStoreInfo(store),
                    const SizedBox(height: 24),
                    _buildSearchInStore(),
                    const SizedBox(height: 24),
                    _buildCategories(storeCategories),
                    const SizedBox(height: 24),
                    _buildSectionTitle('Products ${_selectedCategoryId != null ? '(${products.length})' : '(${allProducts.length})'}'),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: products.isEmpty
                    ? SliverToBoxAdapter(child: _buildEmptyProducts())
                    : SliverList(delegate: SliverChildBuilderDelegate(
                        (_, i) => _productTile(context, products[i], store),
                        childCount: products.length,
                      )),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
              if (store.returnPolicy != null)
                SliverToBoxAdapter(child: _buildReturnPolicy(store)),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
          // Sticky cart summary
          bottomSheet: BlocBuilder<PharmacyBloc, PharmacyState>(
            builder: (context, s) {
              if (s.cartItems.isEmpty) return const SizedBox.shrink();
              return Container(
                padding: EdgeInsets.fromLTRB(20, 14, 20, MediaQuery.of(context).padding.bottom + 14),
                decoration: BoxDecoration(
                  color: AppTheme.pharmacyColor,
                  boxShadow: [BoxShadow(color: AppTheme.pharmacyColor.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, -4))],
                ),
                child: GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRouter.pharmacyCart),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                        child: Text('${s.cartItems.length} items',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800)),
                      ),
                      const Spacer(),
                      const Text('View Cart',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    ),
    );  // BlocListener
  }

  SliverAppBar _buildSliverAppBar(BuildContext context, PharmacyStore store) {
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: Colors.white,
      leading: GestureDetector(
        onTap: () => Navigator.pop(context),
        child: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              shape: BoxShape.circle),
          child: const Icon(Icons.arrow_back_ios_new,
              color: Colors.black87, size: 18),
        ),
      ),
      actions: [
        GestureDetector(
          onTap: () => Navigator.pushNamed(context, AppRouter.search,
              arguments: 'pharmacy'),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                shape: BoxShape.circle),
            child: const Icon(Icons.search_rounded,
                color: Colors.black87, size: 20),
          ),
        ),
        GestureDetector(
          onTap: () => Navigator.pushNamed(context, AppRouter.pharmacyCart),
          child: Container(
            margin: const EdgeInsets.fromLTRB(8, 8, 20, 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                shape: BoxShape.circle),
            child: const Icon(Icons.shopping_bag_outlined,
                color: Colors.black87, size: 20),
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: store.verified
                      ? [const Color(0xFF0E7490), const Color(0xFF06B6D4)]
                      : [const Color(0xFFE0F2FE), const Color(0xFFBAE6FD)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            Positioned(
              right: -40,
              bottom: -40,
              child: Icon(Icons.local_pharmacy_rounded,
                  size: 200, color: Colors.white.withValues(alpha: 0.15)),
            ),
            // Open/Closed badge
            Positioned(
              top: 100,
              right: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: store.isOpen ? const Color(0xFF059669) : const Color(0xFFDC2626),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(store.isOpen ? '● Open Now' : '● Closed',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
              ),
            ),
            // Offer badge
            if (store.offerBadge != null)
              Positioned(
                bottom: 20,
                left: 20,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.local_offer_rounded, size: 14, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(store.offerBadge!, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStoreInfo(PharmacyStore store) {
    final cs = RegionService.instance.currentCountry.currencySymbol;

    return Transform.translate(
      offset: const Offset(0, -30),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 24,
                offset: const Offset(0, 12))
          ],
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                              child: Text(store.name,
                                  style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                      color: Colors.black87))),
                          if (store.verified) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(6)),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.verified_rounded, size: 12, color: Colors.blue.shade700),
                                  const SizedBox(width: 4),
                                  Text('Verified',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.blue.shade700)),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(store.address,
                          style: const TextStyle(fontSize: 13, color: Colors.black54, fontWeight: FontWeight.w500)),
                      if (store.description != null) ...[
                        const SizedBox(height: 8),
                        Text(store.description!,
                            style: const TextStyle(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w500),
                            maxLines: 2, overflow: TextOverflow.ellipsis),
                      ],
                    ],
                  ),
                ),
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.local_pharmacy_rounded,
                      color: AppTheme.pharmacyColor, size: 28),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                _infoPill(Icons.star_rounded, '${store.rating} (${store.ratingCount})',
                    Colors.amber.shade700, const Color(0xFFFFF7ED)),
                const SizedBox(width: 10),
                _infoPill(Icons.location_on_rounded, store.distance,
                    AppTheme.pharmacyColor, AppTheme.pharmacyColor.withValues(alpha: 0.1)),
                const SizedBox(width: 10),
                _infoPill(Icons.access_time_rounded, store.deliveryTime,
                    Colors.green.shade600, Colors.green.shade50),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _infoPill(
                  Icons.delivery_dining_rounded,
                  store.deliveryFee == 0 ? 'Free Delivery' : 'Delivery $cs ${store.deliveryFee.toInt()}',
                  store.deliveryFee == 0 ? Colors.green.shade700 : Colors.black54,
                  store.deliveryFee == 0 ? Colors.green.shade50 : const Color(0xFFF1F5F9),
                ),
                if (store.minOrder > 0) ...[
                  const SizedBox(width: 10),
                  _infoPill(Icons.shopping_bag_outlined, 'Min. $cs ${store.minOrder.toInt()}',
                      Colors.black54, const Color(0xFFF1F5F9)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoPill(IconData icon, String text, Color iconColor, Color bgColor) {
    return Flexible(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: iconColor),
            const SizedBox(width: 4),
            Flexible(
              child: Text(text,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black87),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchInStore() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, color: Colors.black38, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _searchQuery = v),
                decoration: const InputDecoration(
                  hintText: 'Search in this pharmacy...',
                  hintStyle: TextStyle(color: Colors.black38, fontSize: 14, fontWeight: FontWeight.w500),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.zero,
                ),
                style: const TextStyle(fontSize: 14),
              ),
            ),
            if (_searchQuery.isNotEmpty)
              GestureDetector(
                onTap: () {
                  _searchController.clear();
                  setState(() => _searchQuery = '');
                },
                child: const Icon(Icons.close_rounded, color: Colors.black38, size: 18),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategories(List<PharmacyCategory> categories) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Categories'),
        const SizedBox(height: 12),
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: categories.length + 1, // +1 for "All"
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              if (i == 0) {
                final isSelected = _selectedCategoryId == null;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCategoryId = null),
                  child: _categoryChip('All', isSelected),
                );
              }
              final cat = categories[i - 1];
              final isSelected = _selectedCategoryId == cat.id;
              return GestureDetector(
                onTap: () => setState(() => _selectedCategoryId = cat.id),
                child: _categoryChip('${cat.emoji} ${cat.name}', isSelected),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _categoryChip(String label, bool isSelected) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected ? AppTheme.pharmacyColor : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isSelected ? AppTheme.pharmacyColor : const Color(0xFFE2E8F0)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: isSelected ? Colors.white : Colors.black87)),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text(title,
          style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
              color: Colors.black87)),
    );
  }

  Widget _buildEmptyProducts() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.medication_outlined, size: 48, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text('No products found',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade400)),
            const SizedBox(height: 4),
            Text('Try a different category or search term',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
          ],
        ),
      ),
    );
  }

  Widget _productTile(BuildContext context, PharmacyProduct p, PharmacyStore store) {
    final cs = RegionService.instance.currentCountry.currencySymbol;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.medicineDetail,
          arguments: p.name),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4))
          ],
          border: Border.all(color: const Color(0xFFF8FAFC)),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.medication_liquid_rounded,
                  color: Colors.black26, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                          child: Text(p.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                  color: Colors.black87),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis)),
                      if (p.needsRx) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(6)),
                          child: Text('Rx',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.red.shade600)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${p.brand} • ${p.pack}',
                      style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  if (p.inStock)
                    Row(
                      children: [
                        Text('$cs ${p.price.toInt()}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.black87)),
                        const SizedBox(width: 6),
                        Text('$cs ${p.mrp.toInt()}',
                            style: const TextStyle(
                                fontSize: 12, color: Colors.black26,
                                decoration: TextDecoration.lineThrough, fontWeight: FontWeight.w600)),
                        if (p.discount > 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                            child: Text('${p.discount}% OFF',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.green.shade700)),
                          ),
                        ],
                      ],
                    )
                  else
                    Text('Out of Stock',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.red.shade600)),
                ],
              ),
            ),
            GestureDetector(
              onTap: () {
                if (p.inStock && !p.needsRx) {
                  context.read<PharmacyBloc>().add(AddMedicineToCart(
                    medicineId: p.id,
                    storeId: store.id,
                    storeName: store.name,
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${p.name} added to cart'),
                      backgroundColor: AppTheme.pharmacyColor,
                      duration: const Duration(seconds: 1),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  );
                } else if (p.needsRx) {
                  Navigator.pushNamed(context, AppRouter.medicineDetail, arguments: p.name);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: !p.inStock
                      ? const Color(0xFFF1F5F9)
                      : p.needsRx
                          ? const Color(0xFFFFF7ED)
                          : AppTheme.pharmacyColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  !p.inStock
                      ? 'Unavailable'
                      : p.needsRx
                          ? 'Upload Rx'
                          : 'Add',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: !p.inStock
                        ? Colors.black45
                        : p.needsRx
                            ? Colors.orange.shade700
                            : AppTheme.pharmacyColor,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReturnPolicy(PharmacyStore store) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Row(
          children: [
            Icon(Icons.assignment_return_rounded, size: 20, color: Colors.grey.shade500),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Return & Refund Policy',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.black87)),
                  const SizedBox(height: 2),
                  Text(store.returnPolicy!,
                      style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Shows a confirmation dialog when the customer enters a store different
  /// from the one their cart is bound to.
  void _showStoreSwitchDialog(BuildContext context, PharmacyState state) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: Container(
          width: 56, height: 56,
          decoration: BoxDecoration(
            color: Colors.amber.shade50,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.swap_horiz_rounded, color: Colors.amber.shade700, size: 28),
        ),
        title: const Text('Switch Store?',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text.rich(
              TextSpan(
                text: 'Your cart has items from ',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
                children: [
                  TextSpan(
                    text: '"${state.cartStoreName}"',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.black87),
                  ),
                  const TextSpan(text: '.\n\nSwitching to '),
                  TextSpan(
                    text: '"${state.pendingStoreName}"',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.black87),
                  ),
                  const TextSpan(text: ' will remove all current items from your cart.'),
                ],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<PharmacyBloc>().add(const CancelStoreSwitch());
              Navigator.pop(context);
            },
            child: Text('Cancel', style: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade500,
            )),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<PharmacyBloc>().add(ConfirmStoreSwitch(
                newStoreId: state.pendingStoreId ?? '',
                newStoreName: state.pendingStoreName ?? '',
              ));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.pharmacyColor,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text('Switch & Clear Cart',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}
