import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// GroceryErrorBoundary — wraps a child widget with graceful error handling.
///
/// Usage:
/// ```dart
/// GroceryErrorBoundary(
///   onRetry: () => context.read<GroceryBloc>().add(LoadGroceryHome()),
///   child: _buildContent(),
/// )
/// ```
class GroceryErrorBoundary extends StatefulWidget {
  final Widget child;
  final VoidCallback? onRetry;
  final String? errorTitle;
  final String? errorMessage;

  const GroceryErrorBoundary({
    super.key,
    required this.child,
    this.onRetry,
    this.errorTitle,
    this.errorMessage,
  });

  @override
  State<GroceryErrorBoundary> createState() => _GroceryErrorBoundaryState();
}

class _GroceryErrorBoundaryState extends State<GroceryErrorBoundary> {
  bool _hasError = false;
  String? _errorDetail;

  @override
  void initState() {
    super.initState();
    FlutterError.onError = (details) {
      if (mounted) setState(() { _hasError = true; _errorDetail = details.exceptionAsString(); });
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) return _buildErrorView();
    return widget.child;
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: AppTheme.groceryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.error_outline, color: AppTheme.groceryColor, size: 36),
          ),
          const SizedBox(height: 16),
          Text(widget.errorTitle ?? 'Something went wrong', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(widget.errorMessage ?? 'We couldn\'t load this page. Please try again.',
            textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey.shade500, height: 1.4)),
          if (_errorDetail != null) ...[
            const SizedBox(height: 8),
            Text(_errorDetail!, textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
          ],
          const SizedBox(height: 20),
          if (widget.onRetry != null) SizedBox(height: 44, child: ElevatedButton.icon(
            onPressed: () { setState(() => _hasError = false); widget.onRetry!(); },
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.groceryColor, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
          )),
        ]),
      ),
    );
  }
}

/// GroceryBlocErrorWidget — Inline error display for BLoC error states.
/// Used inside BlocBuilder when `state.status == error`.
class GroceryBlocErrorWidget extends StatelessWidget {
  final String? message;
  final VoidCallback? onRetry;

  const GroceryBlocErrorWidget({super.key, this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.cloud_off, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text(message ?? 'Unable to load data', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade600)),
          const SizedBox(height: 6),
          Text('Please check your connection and try again.',
            textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry', style: TextStyle(fontWeight: FontWeight.w700)),
              style: TextButton.styleFrom(foregroundColor: AppTheme.groceryColor),
            ),
          ],
        ]),
      ),
    );
  }
}

/// GroceryEmptyStateWidget — Shown when a list/grid has no data.
class GroceryEmptyStateWidget extends StatelessWidget {
  final String emoji;
  final String title;
  final String? subtitle;
  final VoidCallback? onAction;
  final String? actionLabel;

  const GroceryEmptyStateWidget({
    super.key,
    this.emoji = '📦',
    required this.title,
    this.subtitle,
    this.onAction,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(emoji, style: const TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ],
          if (onAction != null && actionLabel != null) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.groceryColor, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0),
              child: Text(actionLabel!, style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ]),
      ),
    );
  }
}
