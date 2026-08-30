import 'package:flutter/material.dart';

class BottomNavSheet extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double initialChildSize;
  final double minChildSize;
  final double maxChildSize;

  const BottomNavSheet({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.initialChildSize = 0.35,
    this.minChildSize = 0.15,
    this.maxChildSize = 0.65,
  });

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: initialChildSize,
      minChildSize: minChildSize,
      maxChildSize: maxChildSize,
      snap: true,
      snapSizes: [minChildSize, initialChildSize, maxChildSize],
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black12,
                blurRadius: 10,
                offset: Offset(0, -2),
              ),
            ],
          ),
          child: SingleChildScrollView(
            controller: scrollController,
            physics: const ClampingScrollPhysics(),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: padding,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Drag handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    child,
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

