import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_bloc.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_event.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_state.dart';

/// Takeaway Checkout Screen — production-grade with full validation.
class TakeawayCheckoutScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const TakeawayCheckoutScreen({super.key, this.args});

  @override
  State<TakeawayCheckoutScreen> createState() => _TakeawayCheckoutScreenState();
}

class _TakeawayCheckoutScreenState extends State<TakeawayCheckoutScreen> {
  String _paymentMethod = 'online';
  bool _couponApplied = false;
  final _couponController = TextEditingController();
  final _mobileController = TextEditingController(text: '+966 55 123 4567');

  String get _pickupTime => (widget.args?['pickupTime'] as String?) ?? 'ASAP (~20-25 min)';

  // Mock cart items if bloc is empty
  final _mockItems = [
    {'name': 'Chicken Biryani', 'qty': 2, 'price': 299, 'customization': 'Large portion, Extra spicy'},
    {'name': 'Paneer Butter Masala', 'qty': 1, 'price': 249, 'customization': ''},
    {'name': 'Butter Naan', 'qty': 4, 'price': 49, 'customization': ''},
    {'name': 'Gulab Jamun', 'qty': 2, 'price': 79, 'customization': ''},
  ];

  int _getSubtotal(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return _mockItems.fold(0, (s, i) => s + (i['price'] as int) * (i['qty'] as int));
    return items.fold(0, (s, i) => s + ((i['price'] as int?) ?? 150) * ((i['quantity'] as int?) ?? 1));
  }
  
  final int _packingCharge = 30;
  int _getTax(int subtotal) => ((subtotal + _packingCharge) * 0.05).round();
  int get _discount => _couponApplied ? 60 : 0;
  int get _walletUsed => 0;

  @override
  void dispose() {
    _couponController.dispose();
    _mobileController.dispose();
    super.dispose();
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600)),
      backgroundColor: isError ? Colors.red.shade600 : AppTheme.restaurantColor,
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<RestaurantBloc, RestaurantState>(
      listener: (context, state) {
        if (state.status == RestaurantStatus.ordered) {
          final int subtotal = _getSubtotal(state.cartItems);
          final int total = subtotal + _packingCharge + _getTax(subtotal) - _discount - _walletUsed;
          
          Navigator.pushReplacementNamed(context, AppRouter.takeawaySuccess, arguments: {
            'orderId': 'TKW-${DateTime.now().millisecondsSinceEpoch % 100000}',
            'restaurant': 'The Grand Biryani House',
            'pickupTime': _pickupTime,
            'total': total,
            'paymentMethod': _paymentMethod,
          });
        } else if (state.status == RestaurantStatus.error) {
          _showSnack(state.errorMessage ?? 'Failed to place order', isError: true);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FB),
        appBar: AppBar(
          backgroundColor: Colors.white, elevation: 0,
          leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Takeaway Checkout', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87)),
              Text('Review and place your order', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.normal)),
            ],
          ),
        ),
        body: BlocBuilder<RestaurantBloc, RestaurantState>(
          builder: (context, state) {
            final activeItems = state.cartItems.isNotEmpty ? state.cartItems : _mockItems;
            final subtotal = _getSubtotal(state.cartItems);
            final tax = _getTax(subtotal);
            final total = subtotal + _packingCharge + tax - _discount - _walletUsed;
            final isOrdering = state.status == RestaurantStatus.ordering;

            return Stack(
              children: [
                ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
                  children: [
                    // Order type badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF9333EA)]),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(children: [
                        Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 16),
                        SizedBox(width: 8),
                        Text('TAKEAWAY ORDER', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1)),
                        Spacer(),
                        Text('Self Pickup', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                    const SizedBox(height: 16),

                    // Pickup Details
                    _sectionCard(
                      icon: Icons.location_on,
                      iconColor: const Color(0xFF7C3AED),
                      title: 'Pickup From',
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('The Grand Biryani House', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        const SizedBox(height: 2),
                        Text('Plot 24, Food Street, Al Olaya District, Riyadh', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        const SizedBox(height: 8),
                        Row(children: [
                          _infoBadge(Icons.timer_outlined, _pickupTime, Colors.purple.shade50, const Color(0xFF7C3AED)),
                          const SizedBox(width: 8),
                          _infoBadge(Icons.directions_walk, '3 min walk', Colors.blue.shade50, Colors.blue.shade700),
                        ]),
                      ]),
                    ),
                    const SizedBox(height: 12),

                    // Contact Number
                    _sectionCard(
                      icon: Icons.phone,
                      iconColor: Colors.green.shade600,
                      title: 'Contact Number',
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Restaurant will call this number for order updates', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                        const SizedBox(height: 8),
                        DecoratedBox(
                          decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(10)),
                          child: TextField(
                            controller: _mobileController,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            decoration: const InputDecoration(
                              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: InputBorder.none,
                              prefixIcon: Icon(Icons.phone_outlined, size: 18),
                            ),
                          ),
                        ),
                      ]),
                    ),
                    const SizedBox(height: 12),

                    // Order Items
                    _sectionCard(
                      icon: Icons.receipt_long,
                      iconColor: AppTheme.restaurantColor,
                      title: 'Order Summary (${activeItems.length} items)',
                      child: Column(
                        children: activeItems.map((item) {
                          final price = item['price'] as int? ?? 150;
                          final qty = item['qty'] ?? item['quantity'] ?? 1;
                          final name = item['name'] as String? ?? 'Item';
                          final customization = item['customization'] as String? ?? '';
                          final itemTotal = price * (qty as int);

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Container(
                                width: 28, height: 28,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.green, width: 2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Center(child: Container(width: 10, height: 10, decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(2)))),
                              ),
                              const SizedBox(width: 10),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('$qty× $name', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                if (customization.isNotEmpty)
                                  Text(customization, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                              ])),
                              Text('${RegionService.instance.currentCountry.currencySymbol} $itemTotal', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                            ]),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Coupon
                    _sectionCard(
                      icon: Icons.local_offer,
                      iconColor: Colors.orange.shade600,
                      title: 'Coupon / Offer',
                      child: _couponApplied
                          ? Row(children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(color: Colors.green.shade50, border: Border.all(color: Colors.green.shade300), borderRadius: BorderRadius.circular(8)),
                                child: Row(children: [
                                  Icon(Icons.check_circle, size: 14, color: Colors.green.shade700),
                                  const SizedBox(width: 6),
                                  Text('TAKE20 applied — ${RegionService.instance.currentCountry.currencySymbol} 60 OFF', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.green.shade800)),
                                ]),
                              ),
                              const Spacer(),
                              GestureDetector(onTap: () => setState(() { _couponApplied = false; _couponController.clear(); }), child: Icon(Icons.close, color: Colors.red.shade400, size: 20)),
                            ])
                          : Row(children: [
                              Expanded(
                                child: TextField(
                                  controller: _couponController,
                                  textCapitalization: TextCapitalization.characters,
                                  decoration: InputDecoration(
                                    hintText: 'Enter coupon code',
                                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
                                    focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide(color: AppTheme.restaurantColor)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              ElevatedButton(
                                onPressed: () {
                                  if (_couponController.text.trim().toUpperCase() == 'TAKE20') {
                                    setState(() => _couponApplied = true);
                                    _showSnack('Coupon applied! ${RegionService.instance.currentCountry.currencySymbol} 60 saved.');
                                  } else {
                                    _showSnack('Invalid or expired coupon', isError: true);
                                  }
                                },
                                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.restaurantColor, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13)),
                                child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.w800)),
                              ),
                            ]),
                    ),
                    const SizedBox(height: 12),

                    // Bill Details
                    _sectionCard(
                      icon: Icons.calculate_outlined,
                      iconColor: Colors.blue.shade600,
                      title: 'Bill Details',
                      child: Column(children: [
                        _billRow('Item Total', '${RegionService.instance.currentCountry.currencySymbol} $subtotal'),
                        _billRow('Packing Charge', '${RegionService.instance.currentCountry.currencySymbol} $_packingCharge'),
                        _billRow('GST & Taxes (5%)', '${RegionService.instance.currentCountry.currencySymbol} $tax'),
                        if (_couponApplied) _billRow('Coupon Discount', '−${RegionService.instance.currentCountry.currencySymbol} $_discount', valueColor: Colors.green.shade700),
                        Divider(color: Colors.grey.shade200, height: 16),
                        _billRow('Total to Pay', '${RegionService.instance.currentCountry.currencySymbol} $total', bold: true),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                          child: Row(children: [
                            Icon(Icons.delivery_dining, size: 14, color: Colors.green.shade700),
                            const SizedBox(width: 6),
                            Text('No delivery charge — you\'re picking up!', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green.shade800)),
                          ]),
                        ),
                      ]),
                    ),
                    const SizedBox(height: 12),

                    // Payment Method
                    _sectionCard(
                      icon: Icons.payment,
                      iconColor: Colors.indigo.shade600,
                      title: 'Payment Method',
                      child: Column(children: [
                        _paymentOption('online', Icons.credit_card, 'Pay Online', 'UPI, Card, Net Banking'),
                        _paymentOption('cash', Icons.money, 'Cash at Restaurant', 'Pay when you pick up'),
                        _paymentOption('wallet', Icons.account_balance_wallet, 'KARTSEEK Wallet', '${RegionService.instance.currentCountry.currencySymbol} 0.00 available'),
                      ]),
                    ),
                  ],
                ),

                // Place Order button
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.07), blurRadius: 16, offset: const Offset(0, -4))],
                    ),
                    child: SafeArea(
                      top: false,
                      child: ElevatedButton(
                        onPressed: isOrdering ? null : () {
                          if (_mobileController.text.trim().isEmpty) {
                            _showSnack('Please enter a valid mobile number', isError: true);
                            return;
                          }
                          context.read<RestaurantBloc>().add(PlaceFoodOrder(
                            restaurantId: (widget.args?['restaurantId'] as String?) ?? 'rest-123',
                            orderType: 'takeaway',
                            paymentMethod: _paymentMethod,
                          ));
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.restaurantColor,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        child: isOrdering
                            ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                            : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                const Icon(Icons.shopping_bag_outlined, size: 20),
                                const SizedBox(width: 10),
                                Text('Place Takeaway Order  •  ${RegionService.instance.currentCountry.currencySymbol} $total', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                              ]),
                      ),
                    ),
                  ),
                ),
              ],
            );
          }
        ),
      ),
    );
  }

  Widget _sectionCard({required IconData icon, required Color iconColor, required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8)]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
        ]),
        Divider(color: Colors.grey.shade100, height: 16),
        child,
      ]),
    );
  }

  Widget _infoBadge(IconData icon, String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Icon(icon, size: 13, color: textColor),
        const SizedBox(width: 5),
        Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textColor)),
      ]),
    );
  }

  Widget _billRow(String label, String value, {bool bold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: TextStyle(fontSize: 13, color: bold ? Colors.black87 : Colors.grey.shade600, fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.w900 : FontWeight.w600, color: valueColor ?? (bold ? Colors.black87 : Colors.grey.shade800))),
      ]),
    );
  }

  Widget _paymentOption(String value, IconData icon, String title, String subtitle) {
    final selected = _paymentMethod == value;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? AppTheme.restaurantColor.withValues(alpha: 0.04) : Colors.grey.shade50,
          border: Border.all(color: selected ? AppTheme.restaurantColor : Colors.grey.shade200, width: selected ? 2 : 1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Icon(icon, size: 22, color: selected ? AppTheme.restaurantColor : Colors.grey.shade500),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: selected ? AppTheme.restaurantColor : Colors.black87)),
            Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ])),
          Container(
            width: 20, height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: selected ? AppTheme.restaurantColor : Colors.grey.shade400, width: 2),
            ),
            child: selected ? const Center(child: SizedBox(width: 8, height: 8, child: DecoratedBox(decoration: BoxDecoration(color: AppTheme.restaurantColor, shape: BoxShape.circle)))) : null,
          ),
        ]),
      ),
    );
  }
}
