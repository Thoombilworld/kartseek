import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';

/// Reorder — loads previous order items into cart.
class PharmacyReorderScreen extends StatelessWidget {
  final String orderId;
  const PharmacyReorderScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    // Immediately reorder and redirect to cart
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PharmacyBloc>().add(ReorderPharmacyOrder(orderId));
      Navigator.pushReplacementNamed(context, '/pharmacy/cart');
    });
    return const Scaffold(
      body: Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading your previous order...', style: TextStyle(fontSize: 14, color: Colors.grey)),
        ],
      )),
    );
  }
}
