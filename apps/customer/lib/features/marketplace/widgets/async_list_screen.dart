import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_empty_state.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';

/// A directory screen: load a list, render a row per item.
///
/// The brand, seller and category directories were `StatelessWidget`s reading
/// `MarketplaceMockData` in `build`. Like the product feeds, that left them with
/// no loading, error or empty state and no way to retry — there was nothing to
/// wait for. This is the non-product counterpart to [ProductFeedScreen]: the
/// four states live here once, and each screen supplies a [loader] and a
/// [itemBuilder].
///
/// Deliberately not merged with [ProductFeedScreen] — that one owns a grid, a
/// card frame and pagination, none of which a short directory list wants.
class AsyncListScreen<T> extends StatefulWidget {
  const AsyncListScreen({
    super.key,
    required this.title,
    required this.loader,
    required this.itemBuilder,
    required this.emptyTitle,
    required this.emptySubtitle,
    this.emptyIcon = Icons.inbox_outlined,
    this.subjectForErrors,
    this.padding = const EdgeInsets.all(16),
  });

  final String title;

  /// Fetches the list. Throws [MarketplaceApiException] on failure.
  final Future<List<T>> Function() loader;

  final Widget Function(BuildContext context, T item) itemBuilder;

  final String emptyTitle;
  final String emptySubtitle;
  final IconData emptyIcon;
  final String? subjectForErrors;
  final EdgeInsets padding;

  @override
  State<AsyncListScreen<T>> createState() => _AsyncListScreenState<T>();
}

class _AsyncListScreenState<T> extends State<AsyncListScreen<T>> {
  List<T> _items = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.loader();
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is MarketplaceApiException
            ? e.message
            : 'Something went wrong loading ${widget.subjectForErrors ?? 'this'}. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text(widget.title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
      ),
      body: RefreshIndicator(onRefresh: _load, child: _body()),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(strokeWidth: 2));
    }

    if (_error != null) {
      // Scrollable so pull-to-refresh still works from the error state.
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.18),
          MarketplaceErrorState(message: _error!, onRetry: _load),
        ],
      );
    }

    if (_items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.14),
          MarketplaceEmptyState(
            title: widget.emptyTitle,
            subtitle: widget.emptySubtitle,
            icon: widget.emptyIcon,
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: widget.padding,
      itemCount: _items.length,
      itemBuilder: (context, i) => widget.itemBuilder(context, _items[i]),
    );
  }
}
