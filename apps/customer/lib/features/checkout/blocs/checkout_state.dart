import 'package:equatable/equatable.dart';

/// Checkout status.
enum CheckoutStatus { initial, loading, ready, processing, success, failed, error }

/// State for the Checkout module BLoC.
class CheckoutState extends Equatable {
  final CheckoutStatus status;
  final String? selectedAddressId;
  final String? addressLabel;
  final String? fullAddress;
  final String? paymentMethod;
  final String? deliveryDate;
  final String? deliveryTimeSlot;
  final String? promoCode;
  final double promoDiscount;
  final double subtotal;
  final double deliveryFee;
  final double taxAmount;
  final String? orderId;
  final String? errorMessage;

  const CheckoutState({
    this.status = CheckoutStatus.initial,
    this.selectedAddressId,
    this.addressLabel,
    this.fullAddress,
    this.paymentMethod,
    this.deliveryDate,
    this.deliveryTimeSlot,
    this.promoCode,
    this.promoDiscount = 0.0,
    this.subtotal = 0.0,
    this.deliveryFee = 0.0,
    this.taxAmount = 0.0,
    this.orderId,
    this.errorMessage,
  });

  double get total => subtotal - promoDiscount + deliveryFee + taxAmount;
  bool get canPlaceOrder =>
      selectedAddressId != null && paymentMethod != null && status == CheckoutStatus.ready;

  CheckoutState copyWith({
    CheckoutStatus? status,
    String? selectedAddressId,
    String? addressLabel,
    String? fullAddress,
    String? paymentMethod,
    String? deliveryDate,
    String? deliveryTimeSlot,
    String? promoCode,
    double? promoDiscount,
    double? subtotal,
    double? deliveryFee,
    double? taxAmount,
    String? orderId,
    String? errorMessage,
  }) {
    return CheckoutState(
      status: status ?? this.status,
      selectedAddressId: selectedAddressId ?? this.selectedAddressId,
      addressLabel: addressLabel ?? this.addressLabel,
      fullAddress: fullAddress ?? this.fullAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      deliveryDate: deliveryDate ?? this.deliveryDate,
      deliveryTimeSlot: deliveryTimeSlot ?? this.deliveryTimeSlot,
      promoCode: promoCode ?? this.promoCode,
      promoDiscount: promoDiscount ?? this.promoDiscount,
      subtotal: subtotal ?? this.subtotal,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      taxAmount: taxAmount ?? this.taxAmount,
      orderId: orderId ?? this.orderId,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        status, selectedAddressId, addressLabel, fullAddress, paymentMethod,
        deliveryDate, deliveryTimeSlot, promoCode, promoDiscount,
        subtotal, deliveryFee, taxAmount, orderId, errorMessage,
      ];
}
