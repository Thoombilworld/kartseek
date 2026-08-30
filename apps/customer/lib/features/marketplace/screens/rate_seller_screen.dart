import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Rate Seller Screen — Rate and review a seller after purchase.
class RateSellerScreen extends StatefulWidget {
  final String sellerName;
  const RateSellerScreen({super.key, this.sellerName = 'TechVision Electronics'});
  @override
  State<RateSellerScreen> createState() => _RateSellerScreenState();
}

class _RateSellerScreenState extends State<RateSellerScreen> {
  final _ratings = <String, int>{'Overall': 0, 'Delivery Speed': 0, 'Product Quality': 0, 'Communication': 0, 'Packaging': 0};
  final _commentController = TextEditingController();

  @override
  void dispose() { _commentController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0.5,
        title: const Text('Rate Seller', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Seller info
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.borderLight)),
            child: Row(children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.store, color: AppTheme.marketplaceColor, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(widget.sellerName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const Row(children: [
                  Icon(Icons.star, color: Color(0xFFFBBF24), size: 14),
                  Text(' 4.3 • ', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                  Text('2,450 ratings', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                ]),
              ])),
            ]),
          ),
          const SizedBox(height: 24),

          // Rating categories
          ..._ratings.entries.map((entry) {
            final isOverall = entry.key == 'Overall';
            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isOverall ? const Color(0xFFC7D2FE) : AppTheme.borderLight),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(entry.key, style: TextStyle(fontWeight: FontWeight.w700, fontSize: isOverall ? 16 : 14)),
                const SizedBox(height: 10),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setState(() => _ratings[entry.key] = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      i < entry.value ? Icons.star : Icons.star_border,
                      color: const Color(0xFFFBBF24),
                      size: isOverall ? 40 : 32,
                    ),
                  ),
                ))),
                if (entry.value > 0) Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(labels[entry.value], style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600,
                      color: entry.value >= 4 ? AppTheme.successGreen : entry.value >= 3 ? AppTheme.warningAmber : AppTheme.errorRed,
                    )),
                  ),
                ),
              ]),
            );
          }),

          // Comment
          const Text('Additional Comments (optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextField(
            controller: _commentController, maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Share your experience with this seller...', hintStyle: const TextStyle(color: AppTheme.textMuted),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.marketplaceColor)),
            ),
          ),
          const SizedBox(height: 80),
        ]),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppTheme.borderLight))),
        child: SafeArea(
          child: ElevatedButton(
            onPressed: _ratings['Overall']! > 0 ? () => Navigator.pop(context) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.marketplaceColor,
              disabledBackgroundColor: AppTheme.borderLight,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text('Submit Rating', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
          ),
        ),
      ),
    );
  }
}
