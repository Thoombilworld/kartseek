import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_feed_screen.dart';

/// Recently Viewed.
///
/// Showed `MarketplaceMockData.allProducts.take(6)` — the same six products for
/// everyone, whether or not they had ever opened one — and "Clear All" only
/// raised a snackbar. Both now go through the API.
class RecentlyViewedScreen extends StatefulWidget {
  const RecentlyViewedScreen({super.key});

  @override
  State<RecentlyViewedScreen> createState() => _RecentlyViewedScreenState();
}

class _RecentlyViewedScreenState extends State<RecentlyViewedScreen> {
  final _api = MarketplaceApiService();

  /// Bumped to force the feed to rebuild and refetch after a clear.
  int _reloadToken = 0;

  Future<void> _clearAll() async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await _api.clearRecentlyViewed();
      if (!mounted) return;
      setState(() => _reloadToken++);
      messenger
        ..clearSnackBars()
        ..showSnackBar(const SnackBar(
            content: Text('Recently viewed cleared'), behavior: SnackBarBehavior.floating));
    } catch (_) {
      if (!mounted) return;
      messenger
        ..clearSnackBars()
        ..showSnackBar(const SnackBar(
            content: Text("We couldn't clear your history. Please try again."),
            behavior: SnackBarBehavior.floating));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ProductFeedScreen(
      // Rebuilding under a new key restarts the feed's own load cycle, which
      // keeps "clear" honest: the list comes back from the server, not from
      // local state we edited optimistically.
      key: ValueKey(_reloadToken),
      title: 'Recently Viewed',
      subjectForErrors: 'your recently viewed items',
      emptyTitle: 'Nothing viewed yet',
      emptySubtitle: 'Products you open will show up here.',
      emptyIcon: Icons.history,
      loader: (page) =>
          page == 0 ? _api.getRecentlyViewed() : Future.value(<ProductModel>[]),
      actions: [
        TextButton(
          onPressed: _clearAll,
          child: Text('Clear All',
              style: TextStyle(color: Colors.red.shade600, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}
