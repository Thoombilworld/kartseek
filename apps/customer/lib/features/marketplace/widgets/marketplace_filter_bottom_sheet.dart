import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Filter Bottom Sheet — comprehensive product filters.
class MarketplaceFilterBottomSheet extends StatefulWidget {
  final ProductFilter currentFilter;
  final ValueChanged<ProductFilter> onApply;

  const MarketplaceFilterBottomSheet({super.key, required this.currentFilter, required this.onApply});

  static Future<void> show(BuildContext context, {required ProductFilter current, required ValueChanged<ProductFilter> onApply}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MarketplaceFilterBottomSheet(currentFilter: current, onApply: onApply),
    );
  }

  @override
  State<MarketplaceFilterBottomSheet> createState() => _MarketplaceFilterBottomSheetState();
}

class _MarketplaceFilterBottomSheetState extends State<MarketplaceFilterBottomSheet> {
  late RangeValues _priceRange;
  late double _minRating;
  late int _minDiscount;
  late bool _inStockOnly;
  late bool _freeDeliveryOnly;

  @override
  void initState() {
    super.initState();
    _priceRange = RangeValues(widget.currentFilter.minPrice ?? 0, widget.currentFilter.maxPrice ?? 200000);
    _minRating = widget.currentFilter.minRating ?? 0;
    _minDiscount = widget.currentFilter.minDiscount ?? 0;
    _inStockOnly = widget.currentFilter.inStockOnly ?? false;
    _freeDeliveryOnly = widget.currentFilter.freeDeliveryOnly ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Container(width: 40, height: 4, margin: const EdgeInsets.only(top: 12), decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(children: [
              const Text('Filters', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() { _priceRange = const RangeValues(0, 200000); _minRating = 0; _minDiscount = 0; _inStockOnly = false; _freeDeliveryOnly = false; }),
                child: Text('Clear All', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.red.shade600)),
              ),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(20),
              children: [
                // Price Range
                const Text('Price Range', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Row(children: [
                  Text('${RegionService.instance.currentCountry.currencySymbol} ${_priceRange.start.toInt()}', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                  const Spacer(),
                  Text('${RegionService.instance.currentCountry.currencySymbol} ${_priceRange.end.toInt()}', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                ]),
                RangeSlider(
                  values: _priceRange, min: 0, max: 200000, divisions: 40,
                  activeColor: AppTheme.marketplaceColor,
                  onChanged: (v) => setState(() => _priceRange = v),
                ),
                const SizedBox(height: 20),
                // Rating
                const Text('Minimum Rating', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                Wrap(spacing: 8, children: [0, 3, 3.5, 4, 4.5].map((r) => _chipSelect(r == 0 ? 'All' : '$r★+', _minRating == r, () => setState(() => _minRating = r.toDouble()))).toList()),
                const SizedBox(height: 20),
                // Discount
                const Text('Minimum Discount', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                Wrap(spacing: 8, children: [0, 10, 20, 30, 50].map((d) => _chipSelect(d == 0 ? 'All' : '$d%+', _minDiscount == d, () => setState(() => _minDiscount = d))).toList()),
                const SizedBox(height: 20),
                // Toggles
                _toggle('In Stock Only', _inStockOnly, (v) => setState(() => _inStockOnly = v)),
                _toggle('Free Delivery Only', _freeDeliveryOnly, (v) => setState(() => _freeDeliveryOnly = v)),
              ],
            ),
          ),
          // Apply
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))]),
            child: SizedBox(
              width: double.infinity, height: 52,
              child: ElevatedButton(
                onPressed: () {
                  widget.onApply(widget.currentFilter.copyWith(
                    minPrice: _priceRange.start, maxPrice: _priceRange.end,
                    minRating: _minRating > 0 ? _minRating : null,
                    minDiscount: _minDiscount > 0 ? _minDiscount : null,
                    inStockOnly: _inStockOnly ? true : null,
                    freeDeliveryOnly: _freeDeliveryOnly ? true : null,
                  ));
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chipSelect(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.marketplaceColor.withValues(alpha: 0.1) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? AppTheme.marketplaceColor : Colors.grey.shade200),
        ),
        child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: selected ? AppTheme.marketplaceColor : AppTheme.textSecondary)),
      ),
    );
  }

  Widget _toggle(String label, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
        Switch(value: value, onChanged: onChanged, activeTrackColor: AppTheme.marketplaceColor),
      ]),
    );
  }
}
