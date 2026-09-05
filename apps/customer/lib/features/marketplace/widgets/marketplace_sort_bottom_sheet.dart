import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Sort Bottom Sheet — product sort options.
class MarketplaceSortBottomSheet extends StatelessWidget {
  final String currentSort;
  final ValueChanged<String> onSelect;

  const MarketplaceSortBottomSheet({super.key, required this.currentSort, required this.onSelect});

  static Future<void> show(BuildContext context, {required String current, required ValueChanged<String> onSelect}) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => MarketplaceSortBottomSheet(currentSort: current, onSelect: onSelect),
    );
  }

  static const _options = [
    {'key': 'relevance', 'label': 'Relevance', 'icon': Icons.auto_awesome},
    {'key': 'price_asc', 'label': 'Price: Low to High', 'icon': Icons.arrow_upward},
    {'key': 'price_desc', 'label': 'Price: High to Low', 'icon': Icons.arrow_downward},
    {'key': 'newest', 'label': 'Newest First', 'icon': Icons.schedule},
    {'key': 'rating', 'label': 'Best Rated', 'icon': Icons.star},
    {'key': 'discount', 'label': 'Biggest Discount', 'icon': Icons.local_offer},
  ];

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.only(top: 12), decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(children: [Text('Sort By', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))]),
          ),
          const Divider(height: 1),
          ...(_options.map((opt) {
            final selected = currentSort == opt['key'];
            return ListTile(
              leading: Icon(opt['icon'] as IconData, color: selected ? AppTheme.marketplaceColor : AppTheme.textMuted, size: 22),
              title: Text(opt['label'] as String, style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w500, color: selected ? AppTheme.marketplaceColor : AppTheme.textPrimary)),
              trailing: selected ? const Icon(Icons.check_circle, color: AppTheme.marketplaceColor, size: 22) : null,
              onTap: () { onSelect(opt['key'] as String); Navigator.pop(context); },
            );
          })),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
