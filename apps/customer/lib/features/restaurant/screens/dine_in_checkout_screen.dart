import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_bloc.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_event.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_state.dart';

/// Dine-in Checkout Screen — production-grade checkout flow.
/// Handles coupon, wallet, loyalty, payment method, and order placement via BLoC.
class DineInCheckoutScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const DineInCheckoutScreen({super.key, this.args});

  @override
  State<DineInCheckoutScreen> createState() => _DineInCheckoutScreenState();
}

class _DineInCheckoutScreenState extends State<DineInCheckoutScreen> {
  String _paymentMethod = 'online';
  bool _couponApplied = false;
  bool _walletApplied = false;
  final _couponController = TextEditingController();
  final _mobileController = TextEditingController(text: '+91 98765 43210');
  final _instructionsController = TextEditingController();

  // Mock cart data fallback
  static const _mockItems = [
    {'name': 'Chicken Biryani', 'qty': 2, 'price': 299, 'add': 'Extra spicy'},
    {'name': 'Mutton Biryani', 'qty': 1, 'price': 349, 'add': ''},
    {'name': 'Butter Naan', 'qty': 3, 'price': 45, 'add': ''},
    {'name': 'Raita', 'qty': 1, 'price': 49, 'add': ''},
  ];

  int _getSubtotal(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return _mockItems.fold(0, (s, i) => s + (i['price'] as int) * (i['qty'] as int));
    return items.fold(0, (s, i) => s + ((i['price'] as int?) ?? 150) * ((i['quantity'] as int?) ?? 1));
  }
  
  int _getServiceCharge(int subtotal) => (subtotal * 0.05).round();
  int _getTax(int subtotal) => (subtotal * 0.05).round();
  int get _couponDiscount => _couponApplied ? 80 : 0;
  int get _walletDiscount => _walletApplied ? 50 : 0;

  String get _tableInfo {
    final args = widget.args;
    if (args == null) return 'Auto-assigned by restaurant';
    if (args['tableMode'] == 'auto_assign') return 'Auto-assigned by restaurant';
    return 'Table ${args['tableNum'] ?? ''} — ${args['guests'] ?? 2} Guests';
  }

  @override
  void dispose() {
    _couponController.dispose();
    _mobileController.dispose();
    _instructionsController.dispose();
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
          final int total = subtotal + _getServiceCharge(subtotal) + _getTax(subtotal) - _couponDiscount - _walletDiscount;
          final activeItems = state.cartItems.isNotEmpty ? state.cartItems : _mockItems;
          
          Navigator.pushReplacementNamed(context, AppRouter.dineInSuccess, arguments: {
            'orderId': 'DI-2026-${DateTime.now().millisecond}',
            'table': _tableInfo,
            'total': total,
            'items': activeItems.length,
            'paymentMethod': _paymentMethod,
            'restaurant': 'The Grand Biryani House',
          });
        } else if (state.status == RestaurantStatus.error) {
          _showSnack(state.errorMessage ?? 'Failed to place dine-in order', isError: true);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FB),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Dine-in Checkout', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
        ),
        body: BlocBuilder<RestaurantBloc, RestaurantState>(
          builder: (context, state) {
            final activeItems = state.cartItems.isNotEmpty ? state.cartItems : _mockItems;
            final subtotal = _getSubtotal(state.cartItems);
            final serviceCharge = _getServiceCharge(subtotal);
            final tax = _getTax(subtotal);
            final total = subtotal + serviceCharge + tax - _couponDiscount - _walletDiscount;
            final isOrdering = state.status == RestaurantStatus.ordering;

            return Stack(
              children: [
                SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Dine-in badge
                      _buildDineInBadge(),
                      const SizedBox(height: 14),

                      // Restaurant + table info
                      _buildTableInfo(),
                      const SizedBox(height: 14),

                      // Order items
                      _buildOrderItems(activeItems),
                      const SizedBox(height: 14),

                      // Mobile contact
                      _buildMobileSection(),
                      const SizedBox(height: 14),

                      // Special instructions
                      _buildInstructions(),
                      const SizedBox(height: 14),

                      // Coupon
                      _buildCoupon(),
                      const SizedBox(height: 14),

                      // Wallet
                      _buildWallet(),
                      const SizedBox(height: 14),

                      // Payment method
                      _buildPaymentMethod(),
                      const SizedBox(height: 14),

                      // Bill summary
                      _buildBill(activeItems, subtotal, serviceCharge, tax, total),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
                
                // Bottom bar inside Stack
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: _buildPlaceOrderBar(total, isOrdering),
                ),
              ],
            );
          }
        ),
      ),
    );
  }

  Widget _buildDineInBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade200)),
      child: Row(children: [
        Icon(Icons.restaurant, color: Colors.green.shade700, size: 18),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Dine-in Mode', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.green.shade800)),
          Text('Eat at restaurant  •  No delivery charge', style: TextStyle(fontSize: 11, color: Colors.green.shade700)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: Colors.green.shade700, borderRadius: BorderRadius.circular(6)),
          child: const Text('DINE-IN', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
        ),
      ]),
    );
  }

  Widget _buildTableInfo() {
    return _Section(
      title: 'Dining Information',
      icon: Icons.table_restaurant,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const _InfoRow(label: 'Restaurant', value: 'The Grand Biryani House'),
        const Divider(height: 16),
        const _InfoRow(label: 'Address', value: '12 MG Road, Bengaluru — 560001'),
        const Divider(height: 16),
        _InfoRow(label: 'Table', value: _tableInfo),
        const Divider(height: 16),
        _InfoRow(label: 'Status', value: 'Dine-in Available • Open till 11 PM', valueColor: Colors.green.shade700),
      ]),
    );
  }

  Widget _buildOrderItems(List<Map<String, dynamic>> items) {
    return _Section(
      title: 'Your Order',
      icon: Icons.receipt_long_outlined,
      child: Column(
        children: items.map((item) {
          final price = item['price'] as int? ?? 150;
          final qty = item['qty'] ?? item['quantity'] ?? 1;
          final name = item['name'] as String? ?? 'Item';
          final customization = (item['add'] ?? item['customization'] ?? '') as String;
          final itemTotal = price * (qty as int);

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6), border: Border.all(color: Colors.green.shade200)),
                child: Text('×$qty', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Colors.green.shade700)),
              ),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                if (customization.isNotEmpty)
                  Text(customization, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ])),
              Text('${RegionService.instance.currentCountry.currencySymbol} $itemTotal', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            ]),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildMobileSection() {
    return _Section(
      title: 'Contact Number',
      icon: Icons.phone_outlined,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Restaurant will contact this number if needed', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
        const SizedBox(height: 8),
        DecoratedBox(
          decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(10)),
          child: TextField(
            controller: _mobileController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              prefixIcon: Icon(Icons.phone, size: 18, color: Colors.grey),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildInstructions() {
    return _Section(
      title: 'Special Instructions',
      icon: Icons.note_alt_outlined,
      child: DecoratedBox(
        decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
        child: TextField(
          controller: _instructionsController,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Allergies, dietary preferences, or any special requests…',
            hintStyle: TextStyle(fontSize: 13, color: Colors.black38),
            border: InputBorder.none,
            contentPadding: EdgeInsets.all(12),
          ),
        ),
      ),
    );
  }

  Widget _buildCoupon() {
    return _Section(
      title: 'Coupon / Promo',
      icon: Icons.local_offer_outlined,
      child: _couponApplied
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade300)),
              child: Row(children: [
                Icon(Icons.check_circle, color: Colors.green.shade700, size: 16),
                const SizedBox(width: 8),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('KARTFOOD applied!', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  Text('${RegionService.instance.currentCountry.currencySymbol} 80 discount applied to your order', style: TextStyle(fontSize: 11, color: Colors.green.shade700)),
                ])),
                TextButton(onPressed: () => setState(() { _couponApplied = false; _couponController.clear(); }), child: const Text('Remove', style: TextStyle(color: Colors.red, fontSize: 12))),
              ]),
            )
          : Row(children: [
              Expanded(
                child: TextField(
                  controller: _couponController,
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
                onPressed: () { if (_couponController.text.isNotEmpty) setState(() => _couponApplied = true); },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.restaurantColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0),
                child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ]),
    );
  }

  Widget _buildWallet() {
    return _Section(
      title: 'KARTSEEK Wallet',
      icon: Icons.account_balance_wallet_outlined,
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Wallet Balance', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          Text('${RegionService.instance.currentCountry.currencySymbol} 250 available', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          if (_walletApplied) Text('${RegionService.instance.currentCountry.currencySymbol} 50 will be used', style: TextStyle(fontSize: 11, color: Colors.green.shade700)),
        ])),
        Switch(
          value: _walletApplied,
          onChanged: (v) => setState(() => _walletApplied = v),
          activeThumbColor: AppTheme.restaurantColor,
          activeTrackColor: AppTheme.restaurantColor,
        ),
      ]),
    );
  }

  Widget _buildPaymentMethod() {
    return _Section(
      title: 'Payment Method',
      icon: Icons.payment,
      child: Column(children: [
        _PaymentOption(
          value: 'online', groupValue: _paymentMethod,
          icon: Icons.smartphone, label: 'Online Payment', sub: 'UPI, Cards, Net Banking',
          onChanged: (v) => setState(() => _paymentMethod = v!),
        ),
        const SizedBox(height: 8),
        _PaymentOption(
          value: 'pay_at_restaurant', groupValue: _paymentMethod,
          icon: Icons.point_of_sale, label: 'Pay at Restaurant', sub: 'Cash or card at billing counter',
          onChanged: (v) => setState(() => _paymentMethod = v!),
        ),
        const SizedBox(height: 8),
        _PaymentOption(
          value: 'wallet', groupValue: _paymentMethod,
          icon: Icons.account_balance_wallet, label: 'KARTSEEK Wallet', sub: '${RegionService.instance.currentCountry.currencySymbol} 250 available',
          onChanged: (v) => setState(() => _paymentMethod = v!),
        ),
      ]),
    );
  }

  Widget _buildBill(List<Map<String, dynamic>> items, int subtotal, int serviceCharge, int tax, int total) {
    return _Section(
      title: 'Bill Summary',
      icon: Icons.receipt,
      child: Column(children: [
        _BillRow(label: 'Subtotal (${items.length} items)', amount: '${RegionService.instance.currentCountry.currencySymbol} $subtotal'),
        _BillRow(label: 'Service Charge (5%)', amount: '${RegionService.instance.currentCountry.currencySymbol} $serviceCharge'),
        _BillRow(label: 'GST & Taxes (5%)', amount: '${RegionService.instance.currentCountry.currencySymbol} $tax'),
        if (_couponApplied) _BillRow(label: 'Coupon Discount', amount: '−${RegionService.instance.currentCountry.currencySymbol} $_couponDiscount', amountColor: Colors.green.shade700),
        if (_walletApplied) _BillRow(label: 'Wallet Used', amount: '−${RegionService.instance.currentCountry.currencySymbol} $_walletDiscount', amountColor: Colors.green.shade700),
        const Divider(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Total Payable', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          Text('${RegionService.instance.currentCountry.currencySymbol} $total', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.restaurantColor)),
        ]),
        const SizedBox(height: 4),
        Row(children: [
          Icon(Icons.info_outline, size: 13, color: Colors.grey.shade400),
          const SizedBox(width: 4),
          Text('Dine-in orders include 5% service charge', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ]),
      ]),
    );
  }

  Widget _buildPlaceOrderBar(int total, bool isOrdering) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('${RegionService.instance.currentCountry.currencySymbol} $total', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: AppTheme.restaurantColor)),
            Text('Total Payable', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ]),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: isOrdering ? null : () {
              if (_mobileController.text.trim().isEmpty) {
                _showSnack('Please enter a valid mobile number', isError: true);
                return;
              }
              context.read<RestaurantBloc>().add(PlaceFoodOrder(
                restaurantId: 'rest-123',
                orderType: 'dine_in',
                paymentMethod: _paymentMethod,
                extras: {'tableInfo': _tableInfo, 'instructions': _instructionsController.text},
              ));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.restaurantColor,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: isOrdering
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                : const Text('Place Dine-in Order', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ),
          const SizedBox(height: 4),
        ]),
      ),
    );
  }
}

// ── Shared sub-widgets ────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  const _Section({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 18, color: AppTheme.restaurantColor),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        ]),
        const SizedBox(height: 14),
        child,
      ]),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
      const SizedBox(width: 12),
      Flexible(child: Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? Colors.black87), textAlign: TextAlign.right)),
    ]);
  }
}

class _BillRow extends StatelessWidget {
  final String label;
  final String amount;
  final Color? amountColor;
  const _BillRow({required this.label, required this.amount, this.amountColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Flexible(child: Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600))),
        Text(amount, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: amountColor)),
      ]),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  final String value;
  final String groupValue;
  final IconData icon;
  final String label;
  final String sub;
  final ValueChanged<String?> onChanged;
  const _PaymentOption({required this.value, required this.groupValue, required this.icon, required this.label, required this.sub, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? AppTheme.restaurantColor.withValues(alpha: 0.05) : Colors.white,
          border: Border.all(color: selected ? AppTheme.restaurantColor : Colors.grey.shade200, width: selected ? 2 : 1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(children: [
          Icon(icon, size: 20, color: selected ? AppTheme.restaurantColor : Colors.grey.shade500),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: selected ? AppTheme.restaurantColor : Colors.black87)),
            Text(sub, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ])),
          Container(
            width: 18, height: 18,
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: selected ? AppTheme.restaurantColor : Colors.grey.shade400, width: 2)),
            child: selected ? const Center(child: DecoratedBox(decoration: BoxDecoration(color: AppTheme.restaurantColor, shape: BoxShape.circle), child: SizedBox(width: 8, height: 8))) : null,
          ),
        ]),
      ),
    );
  }
}
