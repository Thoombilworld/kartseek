import 'package:flutter/material.dart';

/// Shared route transition helpers used by both Customer and Partner routers.
class RouteHelpers {
  RouteHelpers._();

  static PageRouteBuilder fadeRoute(Widget page, RouteSettings settings) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, animation, __, child) => FadeTransition(opacity: animation, child: child),
      transitionDuration: const Duration(milliseconds: 200),
    );
  }

  static PageRouteBuilder slideRoute(Widget page, RouteSettings settings) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, animation, __, child) {
        return SlideTransition(
          position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
          child: child,
        );
      },
      transitionDuration: const Duration(milliseconds: 300),
    );
  }

  /// Deferred slide route — renders a lightweight placeholder during the
  /// transition, then builds the actual page on the next frame. Use for
  /// heavy screens (>20KB) like ProductDetail, CategoryDetail to prevent
  /// transition jank.
  static PageRouteBuilder deferredSlideRoute(Widget page, RouteSettings settings) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (_, __, ___) => _DeferredPage(child: page),
      transitionsBuilder: (_, animation, __, child) {
        return SlideTransition(
          position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
          child: child,
        );
      },
      transitionDuration: const Duration(milliseconds: 300),
    );
  }
}

/// Defers building the actual child until the first frame completes.
/// Shows a minimal Scaffold with a centered spinner during the defer frame.
class _DeferredPage extends StatefulWidget {
  final Widget child;
  const _DeferredPage({required this.child});

  @override
  State<_DeferredPage> createState() => _DeferredPageState();
}

class _DeferredPageState extends State<_DeferredPage> {
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return _ready
        ? widget.child
        : const Scaffold(
            body: Center(
              child: CircularProgressIndicator.adaptive(),
            ),
          );
  }
}
