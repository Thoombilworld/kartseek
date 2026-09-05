import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_state.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_event.dart';

/// Shopping Cart — shows items from CartBloc, quantity controls, pricing summary, checkout.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<CartBloc, CartState>(
      builder: (context, state) {
        final currency = RegionService.instance.currentCountry.currencySymbol;

        if (state.items.isEmpty) {
          return Scaffold(
            backgroundColor: const Color(0xFFF8F9FB),
            appBar: AppBar(
              backgroundColor: Colors.white,
              title: const Text('Cart', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            ),
            body: Center(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.shopping_cart_outlined, size: 80, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                const Text('Your cart is empty', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text('Browse products and add items to your cart', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.pushNamed(context, AppRouter.marketplace),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.marketplaceColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                    elevation: 0,
                  ),
                  child: const Text('Browse Marketplace', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ]),
            ),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FB),
          appBar: AppBar(
            backgroundColor: Colors.white,
            title: Text('Cart (${state.itemCount} items)', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            actions: [
              TextButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Clear Cart'),
                      content: const Text('Remove all items from your cart?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                        TextButton(
                          onPressed: () {
                            context.read<CartBloc>().add(const ClearCart());
                            Navigator.pop(ctx);
                          },
                          child: const Text('Clear', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  );
                },
                child: Text('Clear All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.red.shade600)),
              ),
            ],
          ),
          body: ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              // Address bar
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.primaryGreen.withValues(alpha: 0.3))),
                child: Row(children: [
                  const Icon(Icons.location_on, size: 20, color: AppTheme.primaryGreen),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Deliver to: Home', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text('Apt 4B, Skyline Apartments, ${RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                  ])),
                  GestureDetector(
                    onTap: () => Navigator.pushNamed(context, AppRouter.addressSelection),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(border: Border.all(color: AppTheme.primaryGreen), borderRadius: BorderRadius.circular(8)),
                      child: const Text('Change', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primaryGreen)),
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 16),

              // Cart items
              ...state.items.map((item) => _cartItemWidget(context, item, currency)),

              const SizedBox(height: 16),
              // Price summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                child: Column(children: [
                  const Row(children: [Text('Price Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))]),
                  const SizedBox(height: 12),
                  _priceRow('Subtotal (${state.itemCount} items)', '$currency ${_fmt(state.subtotal)}'),
                  _priceRow('Delivery', state.deliveryFee <= 0 ? 'FREE' : '$currency ${_fmt(state.deliveryFee)}'),
                  if (state.discountAmount > 0) _priceRow('Discount', '-$currency ${_fmt(state.discountAmount)}'),
                  const Divider(height: 24),
                  Row(children: [
                    const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                    const Spacer(),
                    Text('$currency ${_fmt(state.total)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                  ]),
                  if (state.deliveryFee <= 0) ...[
                    const SizedBox(height: 4),
                    Row(children: [const Spacer(), Text('Free delivery on orders above $currency 500', style: TextStyle(fontSize: 12, color: Colors.green.shade700, fontWeight: FontWeight.w600))]),
                  ],
                ]),
              ),
              const SizedBox(height: 100),
            ],
          ),
          bottomNavigationBar: Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, -4))]),
            child: SizedBox(
              height: 56, width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, AppRouter.checkout),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                child: Text('Proceed to Checkout • $currency ${_fmt(state.total)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _cartItemWidget(BuildContext context, CartItem item, String currency) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.productDetail, arguments: item.productId),
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(10),
                image: item.imageUrl != null ? KartseekImage.decoration(url: item.imageUrl!, fit: BoxFit.cover) : null,
              ),
              child: item.imageUrl == null ? const Center(child: Icon(Icons.image_outlined, size: 32, color: AppTheme.textMuted)) : null,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.productDetail, arguments: item.productId),
                child: Text(item.productName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
              ),
              if (item.sellerName != null) ...[
                const SizedBox(height: 2),
                Text('Sold by: ${item.sellerName}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ],
              const SizedBox(height: 8),
              Text('$currency ${_fmt(item.price)}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              Row(children: [
                _qtyBtn(context, Icons.remove, () {
                  if (item.quantity > 1) {
                    context.read<CartBloc>().add(UpdateCartQuantity(productId: item.productId, quantity: item.quantity - 1));
                  }
                }),
                Container(width: 40, alignment: Alignment.center, child: Text('${item.quantity}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700))),
                _qtyBtn(context, Icons.add, () {
                  context.read<CartBloc>().add(UpdateCartQuantity(productId: item.productId, quantity: item.quantity + 1));
                }),
                const Spacer(),
                GestureDetector(
                  onTap: () => context.read<CartBloc>().add(RemoveFromCart(item.productId)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(8)),
                    child: Text('Remove', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.red.shade600)),
                  ),
                ),
              ]),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _qtyBtn(BuildContext context, IconData icon, VoidCallback onTap) {
    return GestureDetector(onTap: onTap, child: Container(
      width: 32, height: 32,
      decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, size: 16),
    ));
  }

  Widget _priceRow(String label, String value) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
      Expanded(child: Text(label, style: TextStyle(fontSize: 14, color: Colors.grey.shade600))),
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: value == 'FREE' ? Colors.green.shade700 : value.startsWith('-') ? Colors.green.shade700 : null)),
    ]));
  }

  static String _fmt(double n) => n.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
}
