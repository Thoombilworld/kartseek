import 'package:flutter/material.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

// Restaurant data model for passing between screens
class RestaurantData {
  final String name;
  final String cuisine;
  final String rating;
  final String deliveryTime;
  final String priceForTwo;
  final String imageUrl;
  final String offer;

  const RestaurantData({
    required this.name,
    required this.cuisine,
    required this.rating,
    required this.deliveryTime,
    required this.priceForTwo,
    required this.imageUrl,
    required this.offer,
  });
}

/// Restaurant Detail — Swiggy/Zomato-style menu page with categories,
/// item cards, add-to-cart bottom sheet, and floating cart summary.
class RestaurantDetailScreen extends StatefulWidget {
  final String name;
  final String imageUrl;
  const RestaurantDetailScreen({
    super.key,
    this.name = 'The Grand Biryani House',
    this.imageUrl =
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  });

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  final Map<String, int> _cart = {};
  int _orderType = 0;

  int get _cartCount => _cart.values.fold(0, (s, v) => s + v);
  int get _cartTotal =>
      _cart.entries.fold(0, (s, e) => s + (_prices[e.key] ?? 0) * e.value);

  static final _prices = {
    'Chicken Biryani': 299,
    'Mutton Biryani': 399,
    'Veg Biryani': 199,
    'Paneer Butter Masala': 249,
    'Butter Naan': 49,
    'Raita': 59,
    'Gulab Jamun': 79,
    'Chicken 65': 199,
    'Tandoori Chicken': 349,
    'Dal Makhani': 179
  };

  static final _images = {
    'Chicken Biryani':
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=400&auto=format&fit=crop',
    'Mutton Biryani':
        'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=400&auto=format&fit=crop',
    'Veg Biryani':
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400&auto=format&fit=crop',
    'Paneer Butter Masala':
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'Butter Naan':
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80',
    'Raita':
        'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&q=80',
    'Gulab Jamun':
        'https://images.unsplash.com/photo-1605197788044-b6f5d47a41b8?w=400&q=80',
    'Chicken 65':
        'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=400&auto=format&fit=crop',
    'Tandoori Chicken':
        'https://images.unsplash.com/photo-1617692855027-33b14f061079?q=80&w=400&auto=format&fit=crop',
    'Dal Makhani':
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Restaurant header
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppTheme.restaurantColor,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  KartseekImage(
                    url: widget.imageUrl,
                    fit: BoxFit.cover,
                  ),
                  // Gradient overlay for readability
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.transparent, Colors.black54],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
              title: Text(widget.name,
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      shadows: [Shadow(blurRadius: 4)])),
              collapseMode: CollapseMode.parallax,
            ),
          ),
          // Restaurant info
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.name,
                        style: const TextStyle(
                            fontSize: 24, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 6),
                    Text('North Indian, Mughlai, Biryani',
                        style: TextStyle(
                            fontSize: 14, color: Colors.grey.shade500)),
                    const SizedBox(height: 10),
                    Wrap(spacing: 10, runSpacing: 8, children: [
                      _infoBadge(Icons.star, '4.4', Colors.green.shade700,
                          Colors.green.shade50),
                      _infoBadge(Icons.timer, '35 min', AppTheme.textSecondary,
                          const Color(0xFFF3F4F6)),
                      _infoBadge(
                          Icons.currency_rupee,
                          '${RegionService.instance.currentCountry.currencySymbol} 300 for two',
                          AppTheme.textSecondary,
                          const Color(0xFFF3F4F6)),
                    ]),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(10)),
                      child: Row(children: [
                        Icon(Icons.local_offer,
                            size: 16, color: Colors.blue.shade700),
                        const SizedBox(width: 8),
                        Expanded(
                            child: Text(
                                'FLAT 50% OFF up to ${RegionService.instance.currentCountry.currencySymbol} 100 • Use code: KARTFOOD',
                                style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.blue.shade700))),
                      ]),
                    ),
                    const SizedBox(height: 20),
                    // Order Type Segmented Control — matches web parity
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          _orderTypeChip(
                              Icons.delivery_dining,
                              'Delivery',
                              _orderType == 0,
                              () => setState(() => _orderType = 0)),
                          _orderTypeChip(Icons.shopping_bag_outlined,
                              'Takeaway', _orderType == 1, () {
                            setState(() => _orderType = 1);
                            _showTakeawayInfo(context);
                          }),
                          _orderTypeChip(
                              Icons.restaurant, 'Dine-in', _orderType == 2, () {
                            setState(() => _orderType = 2);
                            _showDineInInfo(context);
                          }),
                          _orderTypeChip(Icons.table_restaurant, 'Book Table',
                              _orderType == 3, () {
                            setState(() => _orderType = 3);
                            Navigator.pushNamed(
                                context, AppRouter.tableBooking);
                          }),
                        ],
                      ),
                    ),
                  ]),
            ),
          ),
          // Contextual info banner — changes with _orderType
          SliverToBoxAdapter(child: _buildOrderTypeBanner(context)),
          // Menu
          const SliverToBoxAdapter(
              child: Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text('🍽️ MENU',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1)),
          )),
          SliverToBoxAdapter(
              child: _menuSection('⭐ Recommended',
                  ['Chicken Biryani', 'Mutton Biryani', 'Tandoori Chicken'])),
          SliverToBoxAdapter(
              child: _menuSection('🍛 Biryanis',
                  ['Chicken Biryani', 'Mutton Biryani', 'Veg Biryani'])),
          SliverToBoxAdapter(
              child: _menuSection('🍲 Main Course',
                  ['Paneer Butter Masala', 'Dal Makhani', 'Chicken 65'])),
          SliverToBoxAdapter(child: _menuSection('🫓 Breads', ['Butter Naan'])),
          SliverToBoxAdapter(
              child: _menuSection('🍨 Desserts', ['Gulab Jamun'])),
          SliverToBoxAdapter(child: _menuSection('🥗 Sides', ['Raita'])),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      bottomNavigationBar: _cartCount > 0
          ? IntrinsicHeight(
              child: Container(
                padding: EdgeInsets.fromLTRB(
                    20, 12, 20, MediaQuery.of(context).padding.bottom + 12),
                decoration: const BoxDecoration(
                  color: AppTheme.restaurantColor,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Row(children: [
                  Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                            '$_cartCount item${_cartCount > 1 ? 's' : ''} • ${RegionService.instance.currentCountry.currencySymbol} $_cartTotal',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w700)),
                        const Text('Extra charges may apply',
                            style:
                                TextStyle(color: Colors.white60, fontSize: 11)),
                      ]),
                  const Spacer(),
                  GestureDetector(
                    onTap: () {
                      if (_orderType == 1) {
                        Navigator.pushNamed(
                            context, AppRouter.takeawayPickupTime);
                      } else if (_orderType == 2) {
                        Navigator.pushNamed(
                            context, AppRouter.dineInTableSelection);
                      } else {
                        Navigator.pushNamed(
                            context, AppRouter.restaurantCheckout);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10)),
                      child: Text(
                        _orderType == 1
                            ? 'Select Pickup Time →'
                            : _orderType == 2
                                ? 'Select Table →'
                                : 'View Cart →',
                        style: const TextStyle(
                            color: AppTheme.restaurantColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 15),
                      ),
                    ),
                  ),
                ]),
              ),
            )
          : null,
    );
  }

  Widget _orderTypeChip(
      IconData icon, String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: selected
                ? [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2))
                  ]
                : [],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon,
                  size: 18,
                  color: selected
                      ? AppTheme.restaurantColor
                      : Colors.grey.shade500),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                      color: selected
                          ? AppTheme.restaurantColor
                          : Colors.grey.shade600)),
            ],
          ),
        ),
      ),
    );
  }

  void _showDineInInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.restaurant,
                    color: Colors.green.shade700, size: 24),
              ),
              const SizedBox(width: 12),
              const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Dine-in Mode',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w800)),
                    Text('Walk-ins welcome',
                        style: TextStyle(
                            fontSize: 13,
                            color: Colors.green,
                            fontWeight: FontWeight.w600)),
                  ]),
            ]),
            const SizedBox(height: 20),
            _dineInInfoRow(
                Icons.chair, 'Seating available', 'Avg. wait time: 10 mins'),
            const SizedBox(height: 12),
            _dineInInfoRow(
                Icons.schedule, 'Operating Hours', '11:00 AM – 11:00 PM daily'),
            const SizedBox(height: 12),
            _dineInInfoRow(Icons.people, 'Capacity',
                '~80 covers, group bookings accepted'),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFEA580C)),
                    foregroundColor: const Color(0xFFEA580C),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Walk In',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, AppRouter.tableBooking);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Reserve Table',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ]),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _dineInInfoRow(IconData icon, String title, String subtitle) {
    return Row(children: [
      Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 18, color: Colors.grey.shade600),
      ),
      const SizedBox(width: 12),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        Text(subtitle,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
      ]),
    ]);
  }

  Widget _infoBadge(IconData icon, String text, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Flexible(
              child: Text(text,
                  style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600, color: fg),
                  overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }

  Widget _menuSection(String title, List<String> items) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        ...items.map(_menuItem),
      ]),
    );
  }

  Widget _menuItem(String name) {
    final price = _prices[name] ?? 0;
    final qty = _cart[name] ?? 0;
    final imageUrl = _images[name] ??
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4))
          ]),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Image
        KartseekImage(
          url: imageUrl,
          width: 90,
          height: 90,
          fit: BoxFit.cover,
          borderRadius: BorderRadius.circular(12),
        ),
        const SizedBox(width: 16),
        // Details
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                      border: Border.all(color: Colors.green, width: 2),
                      borderRadius: BorderRadius.circular(3)),
                  child: Center(
                      child: Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                              color: Colors.green,
                              borderRadius: BorderRadius.circular(1))))),
              const SizedBox(width: 6),
              const Text('Bestseller',
                  style: TextStyle(
                      color: Colors.orange,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ]),
            const SizedBox(height: 4),
            Text(name,
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Colors.black87)),
            const SizedBox(height: 4),
            Text(
                '${RegionService.instance.currentCountry.currencySymbol} $price',
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87)),
            const SizedBox(height: 6),
            Text(
                'Delicious and authentic $name prepared with high quality ingredients.',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ]),
        ),
        const SizedBox(width: 8),
        // Add / Qty controls
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 24),
            qty == 0
                ? GestureDetector(
                    onTap: () => _showPortionSheet(context, name, price),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        border: Border.all(color: AppTheme.restaurantColor),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('ADD',
                          style: TextStyle(
                              color: AppTheme.restaurantColor,
                              fontWeight: FontWeight.w800,
                              fontSize: 14)),
                    ),
                  )
                : DecoratedBox(
                    decoration: BoxDecoration(
                        color: AppTheme.restaurantColor,
                        borderRadius: BorderRadius.circular(8)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      GestureDetector(
                        onTap: () => setState(() {
                          if (qty <= 1) {
                            _cart.remove(name);
                          } else {
                            _cart[name] = qty - 1;
                          }
                        }),
                        child: const Padding(
                            padding: EdgeInsets.all(8),
                            child: Icon(Icons.remove,
                                size: 16, color: Colors.white)),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text('$qty',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 14)),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _cart[name] = qty + 1),
                        child: const Padding(
                            padding: EdgeInsets.all(8),
                            child:
                                Icon(Icons.add, size: 16, color: Colors.white)),
                      ),
                    ]),
                  ),
            if (qty > 0)
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text('Customisable',
                    style: TextStyle(fontSize: 9, color: Colors.grey)),
              ),
          ],
        ),
      ]),
    );
  }

  /// Contextual info banner that changes based on selected order type.
  Widget _buildOrderTypeBanner(BuildContext context) {
    if (_orderType == 0) {
      // Delivery banner
      return Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.orange.shade200)),
        child: Row(children: [
          Icon(Icons.delivery_dining, color: Colors.orange.shade700, size: 18),
          const SizedBox(width: 10),
          Expanded(
              child: Text(
                  'Delivery in 35–45 min  •  ${RegionService.instance.currentCountry.currencySymbol} 40 delivery fee',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.orange.shade800))),
        ]),
      );
    } else if (_orderType == 1) {
      // Takeaway banner
      return Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
            color: Colors.purple.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.purple.shade200)),
        child: Row(children: [
          Icon(Icons.shopping_bag_outlined,
              color: Colors.purple.shade700, size: 18),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('Takeaway Mode — No delivery charge!',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Colors.purple.shade800)),
                Text('Ready in ~20 min  •  Collect from restaurant counter',
                    style:
                        TextStyle(fontSize: 11, color: Colors.purple.shade600)),
              ])),
        ]),
      );
    } else if (_orderType == 2) {
      // Dine-in banner
      return Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.green.shade200)),
        child: Row(children: [
          Icon(Icons.restaurant, color: Colors.green.shade700, size: 18),
          const SizedBox(width: 10),
          Expanded(
              child: Text('Dine-in Mode  •  Walk-ins welcome  •  No min. order',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.green.shade800))),
        ]),
      );
    } else {
      // Book Table banner
      return Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.blue.shade200)),
        child: Row(children: [
          Icon(Icons.table_restaurant, color: Colors.blue.shade700, size: 18),
          const SizedBox(width: 10),
          Expanded(
              child: Text('Reserve a table  •  Pre-order food in advance',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.blue.shade800))),
        ]),
      );
    }
  }

  void _showTakeawayInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
                child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(4)))),
            const SizedBox(height: 20),
            Row(children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: Colors.purple.shade50,
                    borderRadius: BorderRadius.circular(14)),
                child: Icon(Icons.shopping_bag_outlined,
                    color: Colors.purple.shade700, size: 28),
              ),
              const SizedBox(width: 14),
              const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Takeaway Mode',
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w900)),
                    Text('Pick up from restaurant — no delivery!',
                        style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF7C3AED),
                            fontWeight: FontWeight.w600)),
                  ]),
            ]),
            const SizedBox(height: 20),
            _takeawayInfoRow(Icons.timer_outlined, 'Pickup Time',
                'Ready in 15–25 min after ordering'),
            const SizedBox(height: 12),
            _takeawayInfoRow(Icons.location_on_outlined, 'Collect From',
                'Restaurant counter — Plot 24, Food Street'),
            const SizedBox(height: 12),
            _takeawayInfoRow(Icons.money_off, 'No Delivery Fee',
                'Save ${RegionService.instance.currentCountry.currencySymbol} 40–${RegionService.instance.currentCountry.currencySymbol} 60 on delivery charges'),
            const SizedBox(height: 12),
            _takeawayInfoRow(Icons.payment, 'Pay Online or Cash',
                'Pay online now or cash at the counter'),
            const SizedBox(height: 12),
            _takeawayInfoRow(Icons.notifications_active_outlined,
                'Get Notified', 'We\'ll alert you when your order is ready'),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, AppRouter.takeawayPickupTime);
                },
                icon: const Icon(Icons.timer_outlined, size: 18),
                label: const Text('Select Pickup Time',
                    style:
                        TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _takeawayInfoRow(IconData icon, String title, String subtitle) {
    return Row(children: [
      Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
            color: Colors.purple.shade50,
            borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, size: 18, color: Colors.purple.shade600),
      ),
      const SizedBox(width: 12),
      Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        Text(subtitle,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      ])),
    ]);
  }

  // Portion size / customization bottom sheet
  void _showPortionSheet(BuildContext context, String name, int basePrice) {
    final portions = [
      {'label': 'Small', 'desc': 'Serves 1', 'extra': 0},
      {'label': 'Regular', 'desc': 'Serves 1–2 (Most ordered)', 'extra': 0},
      {
        'label': 'Large',
        'desc': 'Serves 2–3',
        'extra': (basePrice * 0.4).round()
      },
      {
        'label': 'Family Pack',
        'desc': 'Serves 4–5',
        'extra': (basePrice * 0.8).round()
      },
    ];
    int selected = 1; // default Regular

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setModal) => Container(
          padding: EdgeInsets.fromLTRB(
              24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                  child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(4)))),
              const SizedBox(height: 16),
              Text(name,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text('Select portion size',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
              const SizedBox(height: 16),
              ...portions.asMap().entries.map((entry) {
                final i = entry.key;
                final p = entry.value;
                final price = basePrice + (p['extra'] as int);
                final isSelected = selected == i;
                return GestureDetector(
                  onTap: () => setModal(() => selected = i),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.orange.shade50 : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: isSelected
                              ? AppTheme.restaurantColor
                              : Colors.grey.shade200,
                          width: isSelected ? 2 : 1),
                    ),
                    child: Row(children: [
                      Icon(
                          isSelected
                              ? Icons.radio_button_checked
                              : Icons.radio_button_unchecked,
                          color: isSelected
                              ? AppTheme.restaurantColor
                              : Colors.grey.shade400,
                          size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(p['label'] as String,
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: isSelected
                                        ? AppTheme.restaurantColor
                                        : Colors.black87)),
                            Text(p['desc'] as String,
                                style: TextStyle(
                                    fontSize: 11, color: Colors.grey.shade500)),
                          ])),
                      Text(
                          '${RegionService.instance.currentCountry.currencySymbol} $price',
                          style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: isSelected
                                  ? AppTheme.restaurantColor
                                  : Colors.black87)),
                    ]),
                  ),
                );
              }),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() => _cart[name] = 1);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.restaurantColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    'Add ${portions[selected]['label']} — ${RegionService.instance.currentCountry.currencySymbol} ${basePrice + (portions[selected]['extra'] as int)}',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
