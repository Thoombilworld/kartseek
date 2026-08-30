import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// GrocerySellerErrorBoundary — Error/empty/loading state widgets for seller grocery screens.

class GrocerySellerErrorWidget extends StatelessWidget {
  final String? message;
  final VoidCallback? onRetry;
  const GrocerySellerErrorWidget({super.key, this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.cloud_off, size: 48, color: Colors.grey.shade400),
      const SizedBox(height: 12),
      Text(message ?? 'Unable to load data', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade600)),
      if (onRetry != null) ...[
        const SizedBox(height: 16),
        TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh, size: 16),
          label: const Text('Retry', style: TextStyle(fontWeight: FontWeight.w700)),
          style: TextButton.styleFrom(foregroundColor: SellerTheme.grocery)),
      ],
    ])));
  }
}

class GrocerySellerLoadingWidget extends StatelessWidget {
  const GrocerySellerLoadingWidget({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator(color: SellerTheme.grocery));
}
