import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

/// Shimmer loading card for categories grid.
class ShimmerCategoryCard extends StatelessWidget {
  const ShimmerCategoryCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade200,
      highlightColor: Colors.grey.shade50,
      child: Column(
        children: [
          Container(
            width: 56, height: 56,
            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
          ),
          const SizedBox(height: 8),
          Container(width: 52, height: 10, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
        ],
      ),
    );
  }
}
