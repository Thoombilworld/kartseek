import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/checkout/blocs/checkout_event.dart';
import 'package:kartseek_customer/features/checkout/blocs/checkout_state.dart';
import 'package:kartseek_customer/features/orders/services/order_api_service.dart';

/// BLoC for the Checkout module.
///
/// Manages the checkout flow including address selection, payment method,
/// delivery slots, promo codes, and order placement.
class CheckoutBloc extends Bloc<CheckoutEvent, CheckoutState> {
  final OrderApiService apiService;

  CheckoutBloc({OrderApiService? apiService}) 
      : apiService = apiService ?? OrderApiService(),
        super(const CheckoutState()) {
    on<InitializeCheckout>(_onInitialize);
    on<SelectDeliveryAddress>(_onSelectAddress);
    on<SelectPaymentMethod>(_onSelectPayment);
    on<SelectDeliverySlot>(_onSelectSlot);
    on<ApplyPromoCode>(_onApplyPromo);
    on<PlaceOrder>(_onPlaceOrder);
  }

  Future<void> _onInitialize(InitializeCheckout event, Emitter<CheckoutState> emit) async {
    emit(state.copyWith(status: CheckoutStatus.loading));
    await Future.delayed(const Duration(milliseconds: 300));

    // Load saved address and set defaults
    emit(state.copyWith(
      status: CheckoutStatus.ready,
      selectedAddressId: 'addr-1',
      addressLabel: 'Home',
      fullAddress: 'Apartment 204, City Center Mall, Doha, Qatar',
      paymentMethod: 'credit_card',
      deliveryFee: 40.0,
      taxAmount: 0.0,
    ));
  }

  void _onSelectAddress(SelectDeliveryAddress event, Emitter<CheckoutState> emit) {
    emit(state.copyWith(
      selectedAddressId: event.addressId,
      addressLabel: event.addressLabel,
      fullAddress: event.fullAddress,
    ));
  }

  void _onSelectPayment(SelectPaymentMethod event, Emitter<CheckoutState> emit) {
    emit(state.copyWith(paymentMethod: event.method));
  }

  void _onSelectSlot(SelectDeliverySlot event, Emitter<CheckoutState> emit) {
    emit(state.copyWith(deliveryDate: event.date, deliveryTimeSlot: event.timeSlot));
  }

  Future<void> _onApplyPromo(ApplyPromoCode event, Emitter<CheckoutState> emit) async {
    await Future.delayed(const Duration(milliseconds: 500));
    const validPromos = {'FIRST10': 0.10, 'WELCOME': 0.15};
    final discount = validPromos[event.code.toUpperCase()];

    if (discount != null) {
      emit(state.copyWith(
        promoCode: event.code.toUpperCase(),
        promoDiscount: state.subtotal * discount,
      ));
    } else {
      emit(state.copyWith(errorMessage: 'Invalid promo code'));
    }
  }

  Future<void> _onPlaceOrder(PlaceOrder event, Emitter<CheckoutState> emit) async {
    if (!state.canPlaceOrder) {
      emit(state.copyWith(
        status: CheckoutStatus.error,
        errorMessage: 'Please complete all required fields',
      ));
      return;
    }

    emit(state.copyWith(status: CheckoutStatus.processing));

    try {
      final payload = {
        'customerId': event.customerId,
        'items': event.items.map((i) => {
          'productId': i.productId,
          'quantity': i.quantity,
          'price': i.price,
        }).toList(),
        'totalAmount': event.totalAmount,
        'deliveryAddress': state.fullAddress,
        'serviceType': 'marketplace',
        'paymentMethod': state.paymentMethod,
        'promoCode': state.promoCode,
      };

      final orderId = await apiService.placeOrder(payload);
      emit(state.copyWith(status: CheckoutStatus.success, orderId: orderId));
      debugPrint('[CheckoutBloc] ✅ Order placed: $orderId');
    } catch (e) {
      emit(state.copyWith(
        status: CheckoutStatus.error,
        errorMessage: e.toString(),
      ));
      debugPrint('[CheckoutBloc] ❌ Order placement failed: $e');
    }
  }
}
