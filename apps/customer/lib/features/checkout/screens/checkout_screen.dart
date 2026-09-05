import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_state.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_event.dart';
import 'package:kartseek_customer/features/checkout/blocs/checkout_bloc.dart';
import 'package:kartseek_customer/features/checkout/blocs/checkout_event.dart';
import 'package:kartseek_customer/features/checkout/blocs/checkout_state.dart';
import 'package:kartseek_customer/features/profile/screens/add_address_bottom_sheet.dart';
/// Checkout — Step-by-step checkout flow with address, payment, and order summary.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  int _step = 0; // 0=Address, 1=Payment, 2=Review
  int _selectedAddress = 0;
  int _selectedDelivery = 0;
  int _selectedPayment = 0;
  bool _placing = false;

  late final List<Map<String, String>> _addresses;
  late List<String> _payments;

  @override
  void initState() {
    super.initState();
    final city = RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity;
    final cc = RegionService.instance.currentCountry.callingCode;
    _addresses = [
      {'label': 'Home', 'address': 'Apt 4B, Skyline Apartments', 'city': city, 'pin': '00100', 'phone': '$cc 700 123 456'},
      {'label': 'Office', 'address': '12th Floor, Delta Tower, Main Rd', 'city': city, 'pin': '00200', 'phone': '$cc 700 789 012'},
    ];
    _payments = RegionService.instance.getPaymentMethods();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<CheckoutBloc, CheckoutState>(
      listenWhen: (prev, curr) => prev.status != curr.status,
      listener: (context, state) {
        if (state.status == CheckoutStatus.success) {
          context.read<CartBloc>().add(const ClearCart());
          Navigator.of(context).pushReplacementNamed(AppRouter.checkoutSuccess);
        } else if (state.status == CheckoutStatus.error) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.errorMessage ?? 'An error occurred'),
            backgroundColor: Colors.red,
          ));
          setState(() => _placing = false);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FB),
        appBar: AppBar(backgroundColor: Colors.white, title: const Text('Checkout', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
        body: Column(children: [
          _buildStepper(),
          Expanded(child: _step == 0 ? _addressStep() : _step == 1 ? _paymentStep() : _reviewStep()),
        ]),
        bottomNavigationBar: _buildBottomBar(),
      ),
    );
  }

  Widget _buildStepper() {
    const labels = ['Address', 'Payment', 'Review'];
    return Container(
      color: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      child: Row(children: List.generate(3, (i) {
        final active = i <= _step;
        return Expanded(child: Row(children: [
          Container(width: 28, height: 28,
            decoration: BoxDecoration(color: active ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB), shape: BoxShape.circle),
            child: Center(child: i < _step ? const Icon(Icons.check, size: 16, color: Colors.white) : Text('${i + 1}', style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontWeight: FontWeight.w700, fontSize: 13)))),
          const SizedBox(width: 6),
          Text(labels[i], style: TextStyle(fontSize: 13, fontWeight: active ? FontWeight.w700 : FontWeight.w500, color: active ? AppTheme.textPrimary : AppTheme.textMuted)),
          if (i < 2) Expanded(child: Container(height: 2, margin: const EdgeInsets.symmetric(horizontal: 8), color: i < _step ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB))),
        ]));
      })),
    );
  }

  Widget _addressStep() {
    return ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
      ...List.generate(_addresses.length, (i) {
        final a = _addresses[i];
        return GestureDetector(
          onTap: () => setState(() => _selectedAddress = i),
          child: AnimatedContainer(duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _selectedAddress == i ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB), width: _selectedAddress == i ? 2 : 1)),
            child: Row(children: [
              Icon(_selectedAddress == i ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedAddress == i ? AppTheme.marketplaceColor : AppTheme.textMuted, size: 22),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(a['label']!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  if (i == 0) ...[const SizedBox(width: 8), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)), child: const Text('Default', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.marketplaceColor)))],
                ]),
                const SizedBox(height: 4),
                Text(a['address']!, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                Text('${a['city']!} — ${a['pin']!}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                Text(a['phone']!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ])),
            ]),
          ),
        );
      }),
      OutlinedButton.icon(
        onPressed: () {
          AddAddressBottomSheet.show(context);
        }, 
        icon: const Icon(Icons.add, size: 18), 
        label: const Text('Add New Address'),
        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), side: BorderSide(color: Colors.grey.shade300))),
      
      const SizedBox(height: 32),
      const Text('Delivery Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      const SizedBox(height: 12),
      ...List.generate(2, (i) {
        final title = i == 0 ? 'Standard Delivery' : 'Express Delivery';
        final subtitle = i == 0 ? 'Delivery by May 31' : 'Delivery Tomorrow';
        final price = i == 0 ? 'FREE' : '${RegionService.instance.currentCountry.currencySymbol} 99';
        final icon = i == 0 ? Icons.local_shipping_outlined : Icons.flash_on;
        
        return GestureDetector(
          onTap: () => setState(() => _selectedDelivery = i),
          child: AnimatedContainer(duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _selectedDelivery == i ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB), width: _selectedDelivery == i ? 2 : 1)),
            child: Row(children: [
              Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: _selectedDelivery == i ? AppTheme.marketplaceColor.withValues(alpha: 0.1) : const Color(0xFFF3F4F6), shape: BoxShape.circle),
                child: Icon(icon, color: _selectedDelivery == i ? AppTheme.marketplaceColor : Colors.grey.shade600, size: 20)),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ])),
              Text(price, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: price == 'FREE' ? Colors.green.shade700 : AppTheme.textPrimary)),
            ]),
          ),
        );
      }),
    ]);
  }

  Widget _paymentStep() {
    return ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
      ...List.generate(_payments.length, (i) {
        const icons = [Icons.credit_card, Icons.account_balance_wallet, Icons.apple, Icons.phone_android, Icons.money];
        return Column(children: [
          GestureDetector(
            onTap: () => setState(() => _selectedPayment = i),
            child: AnimatedContainer(duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _selectedPayment == i ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB), width: _selectedPayment == i ? 2 : 1)),
              child: Row(children: [
                Icon(icons[i], color: _selectedPayment == i ? AppTheme.marketplaceColor : AppTheme.textSecondary, size: 24),
                const SizedBox(width: 14),
                Expanded(child: Text(_payments[i], style: TextStyle(fontSize: 15, fontWeight: _selectedPayment == i ? FontWeight.w700 : FontWeight.w500))),
                Icon(_selectedPayment == i ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedPayment == i ? AppTheme.marketplaceColor : AppTheme.textMuted, size: 22),
              ]),
            ),
          ),
          if (_selectedPayment == 0 && i == 0)
            Container(
              margin: const EdgeInsets.only(bottom: 16), padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Add New Card', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                _inputField('Card Number', '0000 0000 0000 0000', Icons.credit_card),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _inputField('Expiry', 'MM/YY', Icons.calendar_today)),
                  const SizedBox(width: 12),
                  Expanded(child: _inputField('CVV', '123', Icons.lock_outline)),
                ]),
              ]),
            ),
        ]);
      }),
      const SizedBox(height: 16),
      Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFFEF9C3), borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          Icon(Icons.local_offer, size: 18, color: Colors.amber.shade800),
          const SizedBox(width: 10),
          Expanded(child: Text('Apply coupon code for extra discount', style: TextStyle(fontSize: 13, color: Colors.amber.shade900, fontWeight: FontWeight.w600))),
          const Icon(Icons.chevron_right, size: 20),
        ])),
    ]);
  }

  Widget _reviewStep() {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    return BlocBuilder<CartBloc, CartState>(
      builder: (context, cartState) {
        final items = cartState.items;
        final subtotal = cartState.subtotal;
        final deliveryFee = _selectedDelivery == 0 ? cartState.deliveryFee : 99.0;
        final total = subtotal + deliveryFee;

        return ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
          _sectionCard('Delivery Address', Icons.location_on_outlined, AppTheme.marketplaceColor, Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_addresses[_selectedAddress]['label']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 4),
            Text(_addresses[_selectedAddress]['address']!, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          ])),
          const SizedBox(height: 12),
          _sectionCard('Payment Method', Icons.payment, AppTheme.marketplaceColor, Text(_payments[_selectedPayment], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
            child: Column(children: [
              const Row(children: [Text('Order Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))]),
              const SizedBox(height: 12),
              if (items.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Text('Your cart is empty', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
                )
              else
                ...items.map((item) => _priceRow('${item.productName} ×${item.quantity}', '$currency ${_fmtPrice(item.totalPrice)}')),
              const Divider(height: 24),
              _priceRow('Subtotal', '$currency ${_fmtPrice(subtotal)}'),
              _priceRow('Delivery', deliveryFee <= 0 ? 'FREE' : '$currency ${_fmtPrice(deliveryFee)}'),
              const Divider(height: 24),
              Row(children: [const Text('Total Payable', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)), const Spacer(), Text('$currency ${_fmtPrice(total)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900))]),
            ])),
        ]);
      },
    );
  }

  Widget _sectionCard(String title, IconData icon, Color color, Widget child) {
    return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Icon(icon, size: 18, color: color), const SizedBox(width: 8), Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color))]),
        const SizedBox(height: 10), child,
      ]));
  }

  Widget _priceRow(String l, String v) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
      Expanded(child: Text(l, style: TextStyle(fontSize: 14, color: Colors.grey.shade600))),
      Text(v, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: v == 'FREE' ? Colors.green.shade700 : v.startsWith('-') ? Colors.green.shade700 : null)),
    ]));
  }

  Widget _inputField(String label, String hint, IconData icon) {
    return TextField(
      decoration: InputDecoration(
        labelText: label, hintText: hint, prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade500),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.marketplaceColor, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        isDense: true,
      ),
    );
  }

  Widget _buildBottomBar() {
    return BlocBuilder<CartBloc, CartState>(
      builder: (context, cartState) {
        final currency = RegionService.instance.currentCountry.currencySymbol;
        final deliveryFee = _selectedDelivery == 0 ? cartState.deliveryFee : 99.0;
        final total = cartState.subtotal + deliveryFee;
        return Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, -4))]),
          child: SizedBox(height: 56, width: double.infinity,
            child: ElevatedButton(
              onPressed: _placing ? null : () {
                if (_step < 2) { setState(() => _step++); }
                else {
                  setState(() => _placing = true);
                  context.read<CheckoutBloc>().add(PlaceOrder(
                    items: cartState.items,
                    totalAmount: total,
                    customerId: 'CUST-DEFAULT-001',
                  ));
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
              child: _placing
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                : Text(_step == 0 ? 'Continue to Payment' : _step == 1 ? 'Review Order' : 'Place Order • $currency ${_fmtPrice(total)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
            )),
        );
      },
    );
  }

  static String _fmtPrice(double n) => n.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
}
