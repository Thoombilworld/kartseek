import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';

/// Store Detail — Browse products inside a specific grocery store.
class StoreDetailScreen extends StatefulWidget {
  final String storeName;
  const StoreDetailScreen({super.key, this.storeName = 'FreshMart Supermarket'});

  @override
  State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen> {
  final Map<String, int> _cart = {};
  int get _cartCount => _cart.values.fold(0, (s, v) => s + v);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 180, pinned: true,
            backgroundColor: AppTheme.groceryColor,
            flexibleSpace: FlexibleSpaceBar(
              background: DecoratedBox(
                decoration: BoxDecoration(
                  image: KartseekImage.decoration(
                    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
                    fit: BoxFit.cover,
                    colorFilter: const ColorFilter.mode(Colors.black54, BlendMode.darken),
                    isBanner: true,
                  ),
                ),
                child: Container(),
              ),
              title: Text(widget.storeName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, shadows: [Shadow(color: Colors.black87, offset: Offset(0, 1), blurRadius: 4)])),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _badge('⭐ 4.6', Colors.green.shade700, Colors.green.shade50),
                  _badge('⚡ 10 min', AppTheme.textSecondary, const Color(0xFFF3F4F6)),
                  _badge('🚚 ${RegionService.instance.currentCountry.currencySymbol} 25 delivery', AppTheme.textSecondary, const Color(0xFFF3F4F6)),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(child: _buildPromotionsAndServices()),
          SliverToBoxAdapter(child: _buildFlashDealsBanner()),
          SliverToBoxAdapter(child: _section('🥛 Dairy & Breakfast', const [
            _P('Amul Toned Milk 1L', 68, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=400&auto=format&fit=crop'), 
            _P('Bread - White (400g)', 40, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop'), 
            _P('Eggs (6 pcs)', 54, 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=400&auto=format&fit=crop'), 
            _P('Amul Butter 100g', 56, 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?q=80&w=400&auto=format&fit=crop'),
          ])),
          SliverToBoxAdapter(child: _section('🍎 Fruits & Vegetables', const [
            _P('Bananas (6 pcs)', 40, 'https://images.unsplash.com/photo-1571501679680-de32f1e7aad4?q=80&w=400&auto=format&fit=crop'), 
            _P('Tomatoes 500g', 30, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400&auto=format&fit=crop'), 
            _P('Onions 1 kg', 35, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=400&auto=format&fit=crop'), 
            _P('Apples 4 pcs', 180, 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=400&auto=format&fit=crop'),
          ])),
          SliverToBoxAdapter(child: _section('🥤 Beverages', const [
            _P('Coca-Cola 1.5L', 85, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop'), 
            _P('Tropicana Orange 1L', 110, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=400&auto=format&fit=crop'), 
            _P('Energy Drink 250ml', 125, 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=400&auto=format&fit=crop'),
          ])),
          SliverToBoxAdapter(child: _section('🍪 Snacks', const [
            _P('Potato Chips 52g', 20, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=400&auto=format&fit=crop'), 
            _P('Oreo Biscuits 120g', 30, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=400&auto=format&fit=crop'), 
            _P('Chocolate Bar', 40, 'https://images.unsplash.com/photo-1582285141944-77e3ff708d7e?q=80&w=400&auto=format&fit=crop'),
          ])),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      bottomNavigationBar: _cartCount > 0 ? Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(color: AppTheme.groceryColor, borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
        child: Row(children: [
          Text('$_cartCount items', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          const Spacer(),
          GestureDetector(
            onTap: _handleCheckout,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
              child: const Text('Checkout →', style: TextStyle(color: AppTheme.groceryColor, fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ]),
      ) : null,
    );
  }

  void _handleCheckout() {
    final int total = _cart.entries.fold(0, (s, e) {
      // Need a way to look up price. Here we just assume a flat 100 for simplicity if not found, 
      // but let's just pass a fixed dummy total for now since _cart only stores name and qty.
      return s + (e.value * 50); 
    });
    
    Navigator.pushNamed(context, AppRouter.groceryCheckout, arguments: {
      'storeName': widget.storeName,
      'count': _cartCount,
      'total': total,
    }).then((_) {
      // If returned, clear cart (assuming successful checkout happened if we pop back from success, but we actually popUntil home. 
      // If we just popped back, we can clear it or leave it. Let's leave it unless they checked out.)
    });
  }

  Widget _buildPromotionsAndServices() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.orange.shade200)),
            child: Row(
              children: [
                const Icon(Icons.local_offer, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Get 15% OFF on orders above ${RegionService.instance.currentCountry.currencySymbol} 500 using code LOCAL15.', style: TextStyle(color: Colors.orange.shade900, fontSize: 13, fontWeight: FontWeight.w600))),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ServiceBadge(icon: Icons.delivery_dining, label: 'Fast Delivery'),
              _ServiceBadge(icon: Icons.verified, label: 'Quality Assured'),
              _ServiceBadge(icon: Icons.inventory, label: 'Wide Selection'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFlashDealsBanner() {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final flashProducts = [
      {'name': 'Organic Bananas', 'emoji': '🍌', 'original': 65, 'flash': 39, 'sold': 42, 'stock': 50},
      {'name': 'Farm Eggs (12)', 'emoji': '🥚', 'original': 120, 'flash': 79, 'sold': 28, 'stock': 40},
      {'name': 'Greek Yogurt', 'emoji': '🥛', 'original': 110, 'flash': 69, 'sold': 35, 'stock': 50},
    ];

    return Container(
      margin: const EdgeInsets.only(top: 8),
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Flash deals header
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFF59E0B)]),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Text('⚡', style: TextStyle(fontSize: 22)),
                const SizedBox(width: 8),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Flash Deals', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                      Text('Limited stock • Ends soon', style: TextStyle(color: Colors.white70, fontSize: 11)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20)),
                  child: const Text('02:45:30', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Flash deal products
          SizedBox(
            height: 160,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: flashProducts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final p = flashProducts[index];
                final discount = (((p['original'] as int) - (p['flash'] as int)) / (p['original'] as int) * 100).round();
                final stockPercent = (p['sold'] as int) / (p['stock'] as int);
                return Container(
                  width: 130,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade100),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge + emoji
                      Stack(
                        children: [
                          Center(child: Text(p['emoji'] as String, style: const TextStyle(fontSize: 32))),
                          Positioned(
                            top: 0, left: 0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                              child: Text('$discount%', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(p['name'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text('$currency${p['flash']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFFDC2626))),
                          const SizedBox(width: 4),
                          Text('$currency${p['original']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500, decoration: TextDecoration.lineThrough)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      // Stock bar
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(value: stockPercent, backgroundColor: Colors.grey.shade200, color: stockPercent > 0.7 ? Colors.red : Colors.orange, minHeight: 4),
                      ),
                      const SizedBox(height: 2),
                      Text('${p['sold']}/${p['stock']} sold', style: TextStyle(fontSize: 9, color: Colors.grey.shade600)),
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


  Widget _badge(String text, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: fg)),
    );
  }

  Widget _section(String title, List<_P> products) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      color: Colors.white,
      child: Material(
        color: Colors.transparent,
        child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            initiallyExpanded: true,
            iconColor: AppTheme.groceryColor,
            title: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.black)),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: products.map(_productTile).toList(),
          ),
        ),
      ),
    );
  }

  Widget _productTile(_P p) {
    final qty = _cart[p.name] ?? 0;
    return GestureDetector(
      onTap: () async {
        final res = await Navigator.pushNamed(context, AppRouter.groceryProductDetail, arguments: {
          'name': p.name,
          'price': p.price,
          'imageUrl': p.imageUrl,
          'qty': qty,
        });
        if (res != null && res is int) {
          setState(() {
            if (res <= 0) {
              _cart.remove(p.name);
            } else {
              _cart[p.name] = res;
            }
          });
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          KartseekImage(
            url: p.imageUrl,
            width: 64,
            height: 64,
            fit: BoxFit.cover,
            borderRadius: BorderRadius.circular(10),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Row(children: [
              Container(
                width: 12, height: 12,
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                child: const Center(child: Text('🏪', style: TextStyle(fontSize: 7))),
              ),
              const SizedBox(width: 3),
              Flexible(
                child: Text(
                  widget.storeName,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.green.shade700),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                ),
              ),
            ]),
            const SizedBox(height: 2),
            Text('${RegionService.instance.currentCountry.currencySymbol} ${p.price}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          ])),
          qty == 0
              ? GestureDetector(
                  onTap: () => setState(() => _cart[p.name] = 1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    decoration: BoxDecoration(border: Border.all(color: AppTheme.groceryColor), borderRadius: BorderRadius.circular(8)),
                    child: const Text('ADD', style: TextStyle(color: AppTheme.groceryColor, fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                )
              : DecoratedBox(
                  decoration: BoxDecoration(color: AppTheme.groceryColor, borderRadius: BorderRadius.circular(8)),
                  child: Row(children: [
                    GestureDetector(onTap: () => setState(() { if (qty <= 1) { _cart.remove(p.name); } else { _cart[p.name] = qty - 1; } }), child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.remove, size: 16, color: Colors.white))),
                    Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text('$qty', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                    GestureDetector(onTap: () => setState(() => _cart[p.name] = qty + 1), child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.add, size: 16, color: Colors.white))),
                  ]),
                ),
        ]),
      ),
    );
  }
}

class _ServiceBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _ServiceBadge({required this.icon, required this.label});
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle), child: Icon(icon, color: AppTheme.groceryColor, size: 20)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
      ],
    );
  }
}

class _P { final String name; final int price; final String imageUrl; const _P(this.name, this.price, this.imageUrl); }
