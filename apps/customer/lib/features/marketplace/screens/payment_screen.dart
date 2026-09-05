import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';

/// Payment is a step inside checkout, not a screen of its own.
///
/// This file held a second, orphaned payment screen. Nothing in the app
/// navigated to `AppRouter.payment`, and everything about it was invented: a
/// hardcoded ₹1,15,900 order total, a hardcoded "Balance: ₹2,450" against the
/// wallet option, a payment-method list written in Dart rather than taken from
/// the region, and a confirm button that called
/// `Navigator.pushNamed(checkoutSuccess)` — no payment intent, no gateway call,
/// no order reference. It reported a successful payment for an order that did
/// not exist, every time.
///
/// The real flow lives in `features/checkout`: `CheckoutBloc` holds an
/// `OrderApiService`, `_paymentStep()` builds its options from
/// `RegionService.getPaymentMethods()`, and `PlaceOrder` goes to the server.
/// This route now lands there instead of on a convincing replica.
class PaymentScreen extends StatelessWidget {
  const PaymentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Replace rather than push: the customer should not be able to swipe back
    // into a payment screen that no longer exists.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      Navigator.pushReplacementNamed(context, AppRouter.checkout);
    });
    return const Scaffold(
      body: Center(child: CircularProgressIndicator(strokeWidth: 2)),
    );
  }
}
