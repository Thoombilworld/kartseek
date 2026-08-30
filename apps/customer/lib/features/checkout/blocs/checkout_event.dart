import 'package:equatable/equatable.dart';

/// Events for the Checkout module BLoC.
abstract class CheckoutEvent extends Equatable {
  const CheckoutEvent();
  @override
  List<Object?> get props => [];
}

/// Initialize checkout with cart data.
class InitializeCheckout extends CheckoutEvent {
  const InitializeCheckout();
}

/// Update the selected delivery address.
class SelectDeliveryAddress extends CheckoutEvent {
  final String addressId;
  final String addressLabel;
  final String fullAddress;
  const SelectDeliveryAddress({required this.addressId, required this.addressLabel, required this.fullAddress});

  @override
  List<Object?> get props => [addressId];
}

/// Select payment method.
class SelectPaymentMethod extends CheckoutEvent {
  final String method; // 'credit_card', 'debit_card', 'upi', 'cod', 'wallet'
  const SelectPaymentMethod(this.method);

  @override
  List<Object?> get props => [method];
}

/// Place the order.
class PlaceOrder extends CheckoutEvent {
  final List<dynamic> items;
  final double totalAmount;
  final String customerId;

  const PlaceOrder({
    required this.items,
    required this.totalAmount,
    required this.customerId,
  });

  @override
  List<Object?> get props => [items, totalAmount, customerId];
}

/// Apply a promo code at checkout.
class ApplyPromoCode extends CheckoutEvent {
  final String code;
  const ApplyPromoCode(this.code);

  @override
  List<Object?> get props => [code];
}

/// Select delivery slot.
class SelectDeliverySlot extends CheckoutEvent {
  final String date;
  final String timeSlot;
  const SelectDeliverySlot({required this.date, required this.timeSlot});

  @override
  List<Object?> get props => [date, timeSlot];
}
