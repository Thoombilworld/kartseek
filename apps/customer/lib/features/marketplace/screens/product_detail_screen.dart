import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/services/user_behavior_service.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_bloc.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_event.dart'
    hide AddToCart;
import 'package:kartseek_customer/features/cart/blocs/cart_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_event.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';

/// Product Detail — image gallery, pricing, ratings, add-to-cart, buy-now,
/// specifications, variants and reviews.
///
/// ── Why this takes an id ────────────────────────────────────────────────────
/// It used to take `productName` and resolve it with
/// `MarketplaceMockData.getProductByName(...)`, defaulting to the literal
/// 'iPhone 15 Pro Max'. Three things followed: the page never contacted the API,
/// so every price, spec and stock figure on it was fictional; two products
/// sharing a name were indistinguishable; and renaming a product broke every
/// link to it. A product is identified by its id, so that is what the route
/// carries and what this fetches.
class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final _api = MarketplaceApiService();

  int _selectedVariant = 0;
  int _selectedImage = 0;
  int _qty = 1;
  bool _wishlisted = false;

  ProductModel? _product;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final product = await _api.getProductById(widget.productId);
      if (!mounted) return;
      setState(() {
        _product = product;
        _loading = false;
        // A different product means the gallery and variant selections from the
        // previous one no longer refer to anything.
        _selectedImage = 0;
        _selectedVariant = 0;
      });

      UserBehaviorService.instance.trackProductView(
        productId: product.id,
        productName: product.name,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        brandName: product.brand,
        price: product.price,
      );

      if (!mounted) return;
      try {
        context.read<MarketplaceBloc>().add(LoadProductReviews(product.id));
      } catch (_) {
        // MarketplaceBloc is not in the tree on every entry point.
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is MarketplaceApiException
            ? e.message
            : "We couldn't load this product. Please try again.";
      });
    }
  }

  String get _currencySymbol =>
      RegionService.instance.currentCountry.currencySymbol;

  /// The loaded product. Only read from paths that run after [_loading] is
  /// false and [_error] is null, which `build` enforces before delegating.
  ProductModel get _p => _product!;

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    if (_error != null || _product == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(backgroundColor: Colors.white, elevation: 0),
        body: MarketplaceErrorState(
          message: _error ?? "We couldn't load this product.",
          onRetry: _load,
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildSliverAppBar(),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBrandBadge(),
                  const SizedBox(height: 8),
                  Text(_p.name,
                      style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          height: 1.3)),
                  const SizedBox(height: 10),
                  _buildRatingRow(),
                  const SizedBox(height: 16),
                  _buildPriceSection(),
                  if (_p.offers.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _buildOffers(),
                  ],
                  const Divider(height: 32),
                  if (_p.variants.isNotEmpty) ...[
                    _buildVariants(),
                    const Divider(height: 32),
                  ],
                  _buildQuantitySelector(),
                  const Divider(height: 32),
                  _buildDeliveryInfo(),
                  const Divider(height: 32),
                  _buildSellerInfo(),
                  const Divider(height: 32),
                  if (_p.specifications.isNotEmpty) ...[
                    _buildSpecifications(),
                    const SizedBox(height: 24),
                  ],
                  if (_p.highlights.isNotEmpty) ...[
                    _buildHighlights(),
                    const SizedBox(height: 24),
                  ],
                  // Q&A sat unrouted and unreachable; this is the link that
                  // makes it part of the product page.
                  _buildQaLink(),
                  _buildReviews(),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  Widget _buildSliverAppBar() {
    final images = _p.images.isNotEmpty
        ? _p.images
        : ['', '', '', '']; // Will show placeholders

    return SliverAppBar(
      pinned: true,
      expandedHeight: 400,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)
              ]),
          child: const Icon(Icons.arrow_back, color: Colors.black, size: 20),
        ),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)
                ]),
            child:
                const Icon(Icons.share_outlined, color: Colors.black, size: 20),
          ),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('📤 Sharing product link…')),
            );
          },
        ),
        IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)
                ]),
            child: Icon(_wishlisted ? Icons.favorite : Icons.favorite_border,
                color: _wishlisted ? Colors.red : Colors.black, size: 20),
          ),
          onPressed: () {
            setState(() => _wishlisted = !_wishlisted);
            try {
              context
                  .read<MarketplaceBloc>()
                  .add(ToggleWishlistItem(_p.id));
            } catch (_) {}
          },
        ),
        Stack(
          children: [
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8)
                    ]),
                child: const Icon(Icons.shopping_cart_outlined,
                    color: Colors.black, size: 20),
              ),
              onPressed: () => Navigator.pushNamed(context, AppRouter.cart),
            ),
          ],
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              onPageChanged: (idx) => setState(() => _selectedImage = idx),
              physics: const BouncingScrollPhysics(),
              itemCount: images.length,
              itemBuilder: (_, i) =>
                  KartseekImage(url: images[i], fit: BoxFit.cover),
            ),
            Positioned(
              bottom: 20,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                    images.length,
                    (i) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: _selectedImage == i ? 24 : 8,
                          height: 8,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                              color: _selectedImage == i
                                  ? AppTheme.marketplaceColor
                                  : Colors.white.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(4)),
                        )),
              ),
            ),
            // Discount badge
            if (_p.discount > 0)
              Positioned(
                top: 80,
                left: 0,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.red.shade600,
                    borderRadius: const BorderRadius.horizontal(
                        right: Radius.circular(8)),
                  ),
                  child: Text('${_p.discount}% OFF',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBrandBadge() {
    return GestureDetector(
      // Brand pages key on id; passing `_p.brand` (a display name) used to
      // land on whichever brand happened to share that string.
      onTap: _p.brandId == null
          ? null
          : () => Navigator.pushNamed(context, AppRouter.brandDetail,
              arguments: {'brandId': _p.brandId, 'brandName': _p.brand}),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
            color: Colors.blue.shade50, borderRadius: BorderRadius.circular(6)),
        child: Text(_p.brand,
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.blue.shade700)),
      ),
    );
  }

  Widget _buildRatingRow() {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
              color: Colors.green.shade700,
              borderRadius: BorderRadius.circular(6)),
          child: Row(children: [
            Text(_p.rating.toStringAsFixed(1),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700)),
            const SizedBox(width: 3),
            const Icon(Icons.star, color: Colors.white, size: 12),
          ]),
        ),
        const SizedBox(width: 10),
        Text('${_fmtCount(_p.ratingCount)} ratings',
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
        const SizedBox(width: 6),
        Text('•', style: TextStyle(color: Colors.grey.shade400)),
        const SizedBox(width: 6),
        Text('${_fmtCount(_p.reviewCount)} reviews',
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
      ],
    );
  }

  Widget _buildPriceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('$_currencySymbol ${_fmtPrice(_p.price)}',
                style:
                    const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            if (_p.mrp > _p.price) ...[
              const SizedBox(width: 10),
              Text('$_currencySymbol ${_fmtPrice(_p.mrp)}',
                  style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade400,
                      decoration: TextDecoration.lineThrough)),
            ],
            if (_p.discount > 0) ...[
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(6)),
                child: Text('${_p.discount}% off',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.red.shade700)),
              ),
            ],
          ],
        ),
        if (_p.taxRate != null && _p.taxRate! > 0) ...[
          const SizedBox(height: 4),
          Text(
              'incl. ${_p.taxType ?? 'GST'} @ ${_p.taxRate!.toStringAsFixed(0)}%',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        ],
        if (!_p.inStock) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(6)),
            child: Text('Out of Stock',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.red.shade700)),
          ),
        ],
      ],
    );
  }

  Widget _buildOffers() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _p.offers.map((offer) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            Icon(Icons.local_offer_outlined,
                size: 14, color: Colors.green.shade700),
            const SizedBox(width: 6),
            Expanded(
              child: RichText(
                text: TextSpan(
                    style:
                        TextStyle(fontSize: 13, color: Colors.green.shade700),
                    children: [
                      TextSpan(
                          text: '${offer.title}: ',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      TextSpan(text: offer.description),
                    ]),
              ),
            ),
          ]),
        );
      }).toList(),
    );
  }

  Widget _buildVariants() {
    // Group variants by attribute keys (e.g. "color", "size")
    final allKeys = <String>{};
    for (final v in _p.variants) {
      allKeys.addAll(v.attributes.keys);
    }
    if (allKeys.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: allKeys.map((attrKey) {
        // Deduplicate values for this attribute key
        final uniqueValues = _p.variants
            .where((v) => v.attributes.containsKey(attrKey))
            .map((v) => v.attributes[attrKey]!)
            .toSet()
            .toList();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(attrKey[0].toUpperCase() + attrKey.substring(1),
                style:
                    const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: uniqueValues.map((val) {
                // Find the first variant matching this attribute value
                final v = _p.variants.firstWhere(
                    (v) => v.attributes[attrKey] == val);
                final isSelected =
                    _selectedVariant == _p.variants.indexOf(v);
                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    if (v.inStock) {
                      setState(() => _selectedVariant =
                          _p.variants.indexWhere((e) => e.id == v.id));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('This variant is out of stock.'),
                            behavior: SnackBarBehavior.floating),
                      );
                    }
                  },
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.marketplaceColor.withValues(alpha: 0.08)
                          : Colors.white,
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.marketplaceColor
                            : (v.inStock
                                ? Colors.grey.shade300
                                : Colors.grey.shade200),
                        width: isSelected ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Text(v.variantName,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                              color: v.inStock
                                  ? Colors.black
                                  : Colors.grey.shade400,
                              decoration:
                                  v.inStock ? null : TextDecoration.lineThrough,
                            )),
                        if (v.discount > 0)
                          Text(
                              '-${v.discount}% off',
                              style: TextStyle(
                                  fontSize: 10, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildQuantitySelector() {
    return Row(children: [
      const Text('Quantity',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
      const Spacer(),
      _qtyBtn(Icons.remove, () {
        if (_qty > 1) setState(() => _qty--);
      }),
      Container(
          width: 48,
          alignment: Alignment.center,
          child: Text('$_qty',
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
      _qtyBtn(Icons.add, () => setState(() => _qty++)),
    ]);
  }

  Widget _buildDeliveryInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Icon(Icons.local_shipping_outlined,
              size: 20,
              color: _p.freeDelivery
                  ? AppTheme.primaryGreen
                  : AppTheme.textSecondary),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_p.freeDelivery ? 'Free Delivery' : 'Standard Delivery',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: _p.freeDelivery
                        ? AppTheme.primaryGreen
                        : Colors.black)),
            if (_p.deliveryEstimate != null)
              Text(_p.deliveryEstimate!,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          ]),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          const Icon(Icons.replay_outlined,
              size: 20, color: AppTheme.textSecondary),
          const SizedBox(width: 10),
          Text(_p.returnPolicy ?? '7-day easy returns',
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        ]),
        if (_p.warranty != null) ...[
          const SizedBox(height: 14),
          Row(children: [
            const Icon(Icons.verified_user_outlined,
                size: 20, color: AppTheme.textSecondary),
            const SizedBox(width: 10),
            Text(_p.warranty!,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          ]),
        ],
      ],
    );
  }

  Widget _buildSellerInfo() {
    return GestureDetector(
      onTap: _p.sellerId.isEmpty
          ? null
          : () => Navigator.pushNamed(context, AppRouter.sellerStore,
              arguments: {'sellerId': _p.sellerId, 'sellerName': _p.sellerName}),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: AppTheme.surfaceWhite,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.borderLight)),
        child: Row(children: [
          const Icon(Icons.storefront,
              color: AppTheme.marketplaceColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('Sold by ${_p.sellerName}',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700)),
                Row(children: [
                  if (_p.sellerVerified) ...[
                    Icon(Icons.verified, size: 14, color: Colors.blue.shade600),
                    const SizedBox(width: 4),
                    Text('Verified',
                        style: TextStyle(
                            fontSize: 12,
                            color: Colors.blue.shade600,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                  ],
                  Text('${_p.rating} ★',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                ]),
              ])),
          Icon(Icons.chevron_right, size: 20, color: Colors.grey.shade400),
        ]),
      ),
    );
  }

  Widget _buildSpecifications() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Specifications',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ..._p.specifications
            .map((spec) => _specRow(spec.label, spec.value)),
        if (_p.hsnCode != null) _specRow('HSN Code', _p.hsnCode!),
        if (_p.sku != null) _specRow('SKU', _p.sku!),
        if (_p.weight != null)
          _specRow('Weight', '${_p.weight} kg'),
        if (_p.dimensions != null)
          _specRow('Dimensions', _p.dimensions!),
      ],
    );
  }

  Widget _buildHighlights() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Highlights',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ..._p.highlights.map((h) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.only(top: 6),
                    decoration: const BoxDecoration(
                        color: AppTheme.marketplaceColor,
                        shape: BoxShape.circle)),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(h,
                        style: const TextStyle(fontSize: 14, height: 1.4))),
              ]),
            )),
      ],
    );
  }

  /// Entry point to the product's questions and answers.
  Widget _buildQaLink() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.pushNamed(
          context,
          AppRouter.productQa,
          arguments: {'productId': _p.id, 'productName': _p.name},
        ),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceWhite,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: const Row(children: [
            Icon(Icons.forum_outlined, size: 20, color: AppTheme.marketplaceColor),
            SizedBox(width: 12),
            Expanded(
              child: Text('Questions & Answers',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
            Text('Ask the seller',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
            SizedBox(width: 4),
            Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
          ]),
        ),
      ),
    );
  }

  Widget _buildReviews() {
    // A product with no reviews has no reviews. Padding the section with
    // `MarketplaceMockData.sampleReviews` put invented five-star copy under a
    // real listing, which is the most consequential place in the app to be
    // showing something someone did not write.
    final reviews = _p.reviews;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Expanded(
              child: Text('Customer Reviews',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
          GestureDetector(
            onTap: () {
              Navigator.pushNamed(context, AppRouter.productReviews,
                  arguments: {
                    'productId': _p.id,
                    'productName': _p.name,
                    'writeReview': true,
                  });
            },
            child: const Text('Write Review',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.marketplaceColor)),
          ),
        ]),
        const SizedBox(height: 12),
        ...reviews.take(3).map(_reviewCard),
        if (reviews.length > 3)
          GestureDetector(
            onTap: () {
              Navigator.pushNamed(context, AppRouter.productReviews,
                  arguments: {
                    'productId': _p.id,
                    'productName': _p.name,
                  });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text('See all ${reviews.length} reviews →',
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.marketplaceColor)),
            ),
          ),
      ],
    );
  }

  Widget _reviewCard(ProductReview review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppTheme.surfaceWhite,
          borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                  color: AppTheme.marketplaceColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle),
              child: Center(
                  child: Text(review.userName[0],
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14)))),
          const SizedBox(width: 10),
          Text(review.userName,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const Spacer(),
          ...List.generate(
              5,
              (i) => Icon(Icons.star,
                  size: 14,
                  color: i < review.rating.round()
                      ? Colors.amber
                      : Colors.grey.shade300)),
        ]),
        const SizedBox(height: 8),
        Text(review.comment,
            style: TextStyle(
                fontSize: 14, color: Colors.grey.shade700, height: 1.4)),
        const SizedBox(height: 6),
        Row(children: [
          Text(review.date,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
          if (review.helpfulCount > 0) ...[
            const SizedBox(width: 12),
            Icon(Icons.thumb_up_outlined,
                size: 12, color: Colors.grey.shade400),
            const SizedBox(width: 4),
            Text('${review.helpfulCount} helpful',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
          ],
        ]),
        if (review.images.isNotEmpty) ...[
          const SizedBox(height: 8),
          SizedBox(
            height: 60,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: review.images.length,
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: KartseekImage(
                      url: review.images[i],
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover),
                ),
              ),
            ),
          ),
        ],
      ]),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
            color: Colors.transparent,
            border: Border.all(color: AppTheme.borderLight),
            borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 18),
      ),
    );
  }

  Widget _specRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        SizedBox(
            width: 110,
            child: Text(label,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade500))),
        Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600))),
      ]),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, -4))
        ],
      ),
      child: Row(children: [
        Expanded(
          child: SizedBox(
            height: 52,
            child: OutlinedButton(
              onPressed: _p.inStock
                  ? () {
                      context.read<CartBloc>().add(AddToCart(
                            productId: _p.id,
                            productName: _p.name,
                            price: _p.price,
                            quantity: _qty,
                            imageUrl: _p.images.isNotEmpty
                                ? _p.images.first
                                : null,
                            sellerName: _p.sellerName,
                          ));
                      ScaffoldMessenger.of(context).clearSnackBars();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Row(children: [
                            const Icon(Icons.check_circle,
                                color: Colors.white, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                                child: Text(
                                    '${_p.name} ×$_qty added to cart',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600))),
                          ]),
                          backgroundColor: AppTheme.primaryGreen,
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          action: SnackBarAction(
                              label: 'View Cart',
                              textColor: Colors.white,
                              onPressed: () =>
                                  Navigator.pushNamed(context, AppRouter.cart)),
                        ),
                      );
                    }
                  : null,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(
                    color: AppTheme.marketplaceColor, width: 2),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add_shopping_cart,
                        size: 18, color: AppTheme.marketplaceColor),
                    SizedBox(width: 6),
                    Text('Add to Cart',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.marketplaceColor)),
                  ]),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                if (!_p.inStock) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Product is currently out of stock.'),
                      behavior: SnackBarBehavior.floating));
                  return;
                }
                context.read<CartBloc>().add(AddToCart(
                      productId: _p.id,
                      productName: _p.name,
                      price: _p.price,
                      quantity: _qty,
                      imageUrl: _p.images.isNotEmpty
                          ? _p.images.first
                          : null,
                      sellerName: _p.sellerName,
                    ));
                Navigator.pushNamed(context, AppRouter.checkout);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _p.inStock
                    ? AppTheme.marketplaceColor
                    : Colors.grey.shade300,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.flash_on, size: 18, color: Colors.white),
                    SizedBox(width: 6),
                    Text('Buy Now',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white)),
                  ]),
            ),
          ),
        ),
      ]),
    );
  }

  static final _priceRegex = RegExp(r'(\d)(?=(\d{3})+$)');
  static String _fmtPrice(double n) =>
      n.toInt().toString().replaceAllMapped(_priceRegex, (m) => '${m[1]},');
  static String _fmtCount(int n) =>
      n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';
}
