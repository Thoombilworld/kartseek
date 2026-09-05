import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/utils/responsive.dart';
import 'package:shimmer/shimmer.dart';

/// Shimmer loading skeleton for product card grids.
class ShimmerProductCard extends StatelessWidget {
  const ShimmerProductCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade200,
      highlightColor: Colors.grey.shade50,
      child: DecoratedBox(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(flex: 3, child: Container(decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(14))))),
          Expanded(flex: 2, child: Padding(padding: const EdgeInsets.all(10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(height: 10, width: 50, color: Colors.white),
            const SizedBox(height: 6),
            Container(height: 12, width: double.infinity, color: Colors.white),
            const SizedBox(height: 4),
            Container(height: 12, width: 80, color: Colors.white),
            const Spacer(),
            Container(height: 14, width: 60, color: Colors.white),
          ]))),
        ]),
      ),
    );
  }
}

/// Full-screen shimmer grid for product listings.
class ShimmerProductGrid extends StatelessWidget {
  final int count;
  const ShimmerProductGrid({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      padding: const EdgeInsets.all(12),
      gridDelegate: Responsive.productGridDelegate,
      itemCount: count,
      itemBuilder: (_, __) => const ShimmerProductCard(),
    );
  }
}
