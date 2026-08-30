import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

/// Product Detail Screen for Grocery
/// Displays comprehensive information: weight, package size, pack type.
class GroceryProductDetailScreen extends StatefulWidget {
  final Map<String, dynamic> productData;
  const GroceryProductDetailScreen({super.key, required this.productData});

  @override
  State<GroceryProductDetailScreen> createState() => _GroceryProductDetailScreenState();
}

class _GroceryProductDetailScreenState extends State<GroceryProductDetailScreen> {
  int _qty = 0;
  bool _isWishlisted = false;

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));
        
    final name = widget.productData['name'] ?? 'Product';
    final price = widget.productData['price'] ?? 100;
    final imageUrl = widget.productData['imageUrl'] ?? 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400&auto=format&fit=crop';
    
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 300,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            elevation: 0,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
                child: const Icon(Icons.close, color: Colors.black, size: 20),
              ),
              onPressed: () => Navigator.pop(context, _qty),
            ),
            actions: [
              // Wishlist heart toggle
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
                  child: Icon(_isWishlisted ? Icons.favorite : Icons.favorite_border, color: _isWishlisted ? Colors.red : Colors.black, size: 20),
                ),
                onPressed: () {
                  setState(() => _isWishlisted = !_isWishlisted);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(_isWishlisted ? 'Added to wishlist' : 'Removed from wishlist'),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ));
                },
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
                  child: const Icon(Icons.share_outlined, color: Colors.black, size: 20),
                ),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: 'Check out $name on KARTSEEK Grocery! 🛒'));
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text('📤 Share link copied for $name', style: const TextStyle(fontWeight: FontWeight.w600)),
                    backgroundColor: const Color(0xFF16A34A),
                    behavior: SnackBarBehavior.floating,
                  ));
                },
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: const Color(0xFFF9FAFB),
                padding: const EdgeInsets.only(top: 60),
                child: KartseekImage(url: imageUrl, fit: BoxFit.contain),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                  const SizedBox(height: 8),
                  const Text('Brand: Fresh Farms', style: TextStyle(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      border: Border.all(color: Colors.green.shade200),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Text('🏪 ', style: TextStyle(fontSize: 12)),
                      Text(
                        'Sold by: ${widget.productData['storeName'] ?? 'FreshMart Supermarket'}',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green.shade700),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text('${RegionService.instance.currentCountry.currencySymbol} $price', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF1B5E20))),
                      const SizedBox(width: 8),
                      Text('${RegionService.instance.currentCountry.currencySymbol} ${price + 15}', style: const TextStyle(fontSize: 14, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                        child: Text('12% OFF', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w900, fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  const Text('Product Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                  const SizedBox(height: 16),
                  _detailRow('Weight', '500 g'),
                  _detailRow('Package Size', 'Medium'),
                  _detailRow('Pack Type', 'Vacuum Sealed Pouch'),
                  _detailRow('Shelf Life', '6 Months'),
                  const SizedBox(height: 32),
                  const Text('Description', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                  const SizedBox(height: 12),
                  const Text('Sourced directly from local farms. Ensure you store in a cool, dry place. Perfect for your daily needs and guaranteed fresh upon delivery.', style: TextStyle(fontSize: 14, color: AppTheme.textMuted, height: 1.6)),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))]),
        child: Row(
          children: [
            if (_qty == 0)
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _qty = 1),
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(color: AppTheme.groceryColor, borderRadius: BorderRadius.circular(12)),
                    child: const Center(child: Text('Add to Cart', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700))),
                  ),
                ),
              )
            else
              Expanded(
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(border: Border.all(color: AppTheme.groceryColor), borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      IconButton(icon: const Icon(Icons.remove, color: AppTheme.groceryColor), onPressed: () => setState(() => _qty--)),
                      Text('$_qty', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.groceryColor)),
                      IconButton(icon: const Icon(Icons.add, color: AppTheme.groceryColor), onPressed: () => setState(() => _qty++)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

// ── Reviews Section Widget ─────────────────────────────────────────────
class GroceryReviewsSection extends StatelessWidget {
  final String productId;
  final String storeId;
  const GroceryReviewsSection({super.key, required this.productId, required this.storeId});

  @override
  Widget build(BuildContext context) {
    // Demo reviews
    final reviews = [
      {'name': 'Fatima A.', 'rating': 5, 'comment': 'Excellent quality, very fresh!', 'verified': true, 'date': 'Jun 25'},
      {'name': 'Mohammed R.', 'rating': 4, 'comment': 'Good product, fast delivery.', 'verified': true, 'date': 'Jun 23'},
      {'name': 'Sarah K.', 'rating': 5, 'comment': 'Best quality on any delivery app!', 'verified': false, 'date': 'Jun 20'},
    ];
    final avgRating = reviews.fold<double>(0, (s, r) => s + (r['rating'] as int)) / reviews.length;

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Ratings & Reviews', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1E293B))),
              ElevatedButton(
                onPressed: () => _showReviewSheet(context),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: const Text('Write Review', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Rating summary
          Row(
            children: [
              Text(avgRating.toStringAsFixed(1), style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF1E293B))),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: List.generate(5, (i) => Icon(i < avgRating.round() ? Icons.star : Icons.star_border, color: Colors.amber, size: 18))),
                  Text('${reviews.length} reviews', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ],
          ),
          const Divider(height: 24),
          // Reviews list
          ...reviews.map((review) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFF16A34A),
                  child: Text((review['name'] as String)[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(review['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          if (review['verified'] == true) ...[const SizedBox(width: 6), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)), child: Text('✓ Verified', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Colors.green.shade700)))],
                        ],
                      ),
                      Row(
                        children: [
                          ...List.generate(5, (i) => Icon(i < (review['rating'] as int) ? Icons.star : Icons.star_border, color: Colors.amber, size: 14)),
                          const SizedBox(width: 6),
                          Text(review['date'] as String, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(review['comment'] as String, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4)),
                    ],
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  void _showReviewSheet(BuildContext context) {
    int selectedRating = 0;
    final commentController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Rate this product', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Row(
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setSheetState(() => selectedRating = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: Icon(i < selectedRating ? Icons.star : Icons.star_border, color: Colors.amber, size: 36),
                  ),
                )),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: commentController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Share your experience...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.all(12),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: selectedRating > 0 ? () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted!'), behavior: SnackBarBehavior.floating));
                  } : null,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
