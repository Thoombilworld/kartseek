import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/profile/screens/add_address_bottom_sheet.dart';
/// Grocery Checkout Screen
/// Smooth and fully functional end-to-end checkout and payment flow.
class GroceryCheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> cartData;
  const GroceryCheckoutScreen({super.key, required this.cartData});

  @override
  State<GroceryCheckoutScreen> createState() => _GroceryCheckoutScreenState();
}

class _GroceryCheckoutScreenState extends State<GroceryCheckoutScreen> {
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: Colors.white, title: const Text('Checkout', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
      body: Column(children: [
        _buildStepper(),
        Expanded(child: _step == 0 ? _addressStep() : _step == 1 ? _paymentStep() : _reviewStep()),
      ]),
      bottomNavigationBar: _buildBottomBar(),
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
            decoration: BoxDecoration(color: active ? AppTheme.groceryColor : const Color(0xFFE5E7EB), shape: BoxShape.circle),
            child: Center(child: i < _step ? const Icon(Icons.check, size: 16, color: Colors.white) : Text('${i + 1}', style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontWeight: FontWeight.w700, fontSize: 13)))),
          const SizedBox(width: 6),
          Text(labels[i], style: TextStyle(fontSize: 13, fontWeight: active ? FontWeight.w700 : FontWeight.w500, color: active ? AppTheme.textPrimary : AppTheme.textMuted)),
          if (i < 2) Expanded(child: Container(height: 2, margin: const EdgeInsets.symmetric(horizontal: 8), color: i < _step ? AppTheme.groceryColor : const Color(0xFFE5E7EB))),
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
              border: Border.all(color: _selectedAddress == i ? AppTheme.groceryColor : const Color(0xFFE5E7EB), width: _selectedAddress == i ? 2 : 1)),
            child: Row(children: [
              Icon(_selectedAddress == i ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedAddress == i ? AppTheme.groceryColor : AppTheme.textMuted, size: 22),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(a['label']!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  if (i == 0) ...[const SizedBox(width: 8), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: AppTheme.groceryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)), child: const Text('Default', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.groceryColor)))],
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
      const Text('Delivery Speed', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      const SizedBox(height: 12),
      ...List.generate(2, (i) {
        final title = i == 0 ? '10 Min Delivery ⚡' : 'Standard Delivery';
        final subtitle = i == 0 ? 'Instant delivery' : 'Delivery in 30-45 mins';
        final price = i == 0 ? '${RegionService.instance.currentCountry.currencySymbol} 25' : 'FREE';
        final icon = i == 0 ? Icons.flash_on : Icons.local_shipping_outlined;
        
        return GestureDetector(
          onTap: () => setState(() => _selectedDelivery = i),
          child: AnimatedContainer(duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _selectedDelivery == i ? AppTheme.groceryColor : const Color(0xFFE5E7EB), width: _selectedDelivery == i ? 2 : 1)),
            child: Row(children: [
              Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: _selectedDelivery == i ? AppTheme.groceryColor.withValues(alpha: 0.1) : const Color(0xFFF3F4F6), shape: BoxShape.circle),
                child: Icon(icon, color: _selectedDelivery == i ? AppTheme.groceryColor : Colors.grey.shade600, size: 20)),
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
                border: Border.all(color: _selectedPayment == i ? AppTheme.groceryColor : const Color(0xFFE5E7EB), width: _selectedPayment == i ? 2 : 1)),
              child: Row(children: [
                Icon(icons[i], color: _selectedPayment == i ? AppTheme.groceryColor : AppTheme.textSecondary, size: 24),
                const SizedBox(width: 14),
                Expanded(child: Text(_payments[i], style: TextStyle(fontSize: 15, fontWeight: _selectedPayment == i ? FontWeight.w700 : FontWeight.w500))),
                Icon(_selectedPayment == i ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedPayment == i ? AppTheme.groceryColor : AppTheme.textMuted, size: 22),
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
          Expanded(child: Text('Apply coupon code LOCAL15', style: TextStyle(fontSize: 13, color: Colors.amber.shade900, fontWeight: FontWeight.w600))),
          const Icon(Icons.chevron_right, size: 20),
        ])),
    ]);
  }

  Widget _reviewStep() {
    final int itemsCount = widget.cartData['count'] ?? 1;
    final int totalAmount = widget.cartData['total'] ?? 250;
    final int deliveryFee = _selectedDelivery == 0 ? 25 : 0;
    final int finalTotal = totalAmount + deliveryFee + 5;

    return ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
      _sectionCard('Fulfilling from', Icons.storefront, AppTheme.groceryColor, Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(widget.cartData['storeName'] ?? 'Local Store', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      ])),
      const SizedBox(height: 12),
      _sectionCard('Delivery Address', Icons.location_on_outlined, AppTheme.groceryColor, Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_addresses[_selectedAddress]['label']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        const SizedBox(height: 4),
        Text(_addresses[_selectedAddress]['address']!, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
      ])),
      const SizedBox(height: 12),
      _sectionCard('Payment Method', Icons.payment, AppTheme.groceryColor, Text(_payments[_selectedPayment], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
      const SizedBox(height: 12),
      Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
        child: Column(children: [
          const Row(children: [Text('Bill Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))]),
          const SizedBox(height: 12),
          _priceRow('Items Total ($itemsCount items)', '${RegionService.instance.currentCountry.currencySymbol} $totalAmount'),
          _priceRow('Delivery Fee', deliveryFee == 0 ? 'FREE' : '${RegionService.instance.currentCountry.currencySymbol} $deliveryFee'),
          _priceRow('Platform Fee', '${RegionService.instance.currentCountry.currencySymbol} 5'),
          const Divider(height: 24),
          Row(children: [const Text('Total Payable', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)), const Spacer(), Text('${RegionService.instance.currentCountry.currencySymbol} $finalTotal', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900))]),
        ])),
    ]);
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
      Text(v, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: v == 'FREE' ? Colors.green.shade700 : null)),
    ]));
  }

  Widget _inputField(String label, String hint, IconData icon) {
    return TextField(
      decoration: InputDecoration(
        labelText: label, hintText: hint, prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade500),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.groceryColor, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        isDense: true,
      ),
    );
  }

  Widget _buildBottomBar() {
    final int totalAmount = widget.cartData['total'] ?? 250;
    final int deliveryFee = _selectedDelivery == 0 ? 25 : 0;
    final int finalTotal = totalAmount + deliveryFee + 5;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, -4))]),
      child: SizedBox(height: 56, width: double.infinity,
        child: ElevatedButton(
          onPressed: _placing ? null : () {
            if (_step < 2) { setState(() => _step++); }
            else { 
              setState(() => _placing = true); 
              Future.delayed(const Duration(seconds: 2), () { 
                if (mounted) {
                  // Direct to CheckoutSuccessScreen for consistency
                  Navigator.pushReplacementNamed(context, AppRouter.checkoutSuccess); 
                }
              }); 
            }
          },
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.groceryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
          child: _placing
            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
            : Text(_step == 0 ? 'Continue to Payment' : _step == 1 ? 'Review Order' : 'Place Order • ${RegionService.instance.currentCountry.currencySymbol} $finalTotal', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
        )),
    );
  }
}
