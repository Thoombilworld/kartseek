import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Restaurant Review Screen — Multi-category star ratings with photo upload.
class RestaurantReviewScreen extends StatefulWidget {
  final String orderId;
  final String? restaurantName;
  const RestaurantReviewScreen({super.key, required this.orderId, this.restaurantName});

  @override
  State<RestaurantReviewScreen> createState() => _RestaurantReviewScreenState();
}

class _RestaurantReviewScreenState extends State<RestaurantReviewScreen> {
  final _ratings = <String, int>{'Food Quality': 0, 'Delivery Speed': 0, 'Packaging': 0};
  final _reviewController = TextEditingController();
  final _photos = <String>[];
  bool _submitted = false;
  static const _restaurantColor = AppTheme.restaurantColor;

  @override
  void dispose() { _reviewController.dispose(); super.dispose(); }

  double get _avgRating {
    final vals = _ratings.values.where((v) => v > 0);
    return vals.isEmpty ? 0 : vals.reduce((a, b) => a + b) / vals.length;
  }

  bool get _canSubmit => _ratings.values.every((v) => v > 0);

  @override
  Widget build(BuildContext context) {
    if (_submitted) return _successState(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.close, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('Rate Your Order', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          // ── Restaurant Info ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFE11D48), Color(0xFFF97316)]), borderRadius: BorderRadius.circular(20)),
            child: Column(children: [
              const Text('🍽️', style: TextStyle(fontSize: 36)),
              const SizedBox(height: 8),
              Text(widget.restaurantName ?? 'Restaurant', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
              Text('Order #${widget.orderId}', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
            ]),
          ),

          const SizedBox(height: 24),

          // ── Category Ratings ──
          ..._ratings.entries.map((entry) => _buildCategoryRating(entry.key, entry.value)),

          const SizedBox(height: 20),

          // ── Text Review ──
          const Align(alignment: Alignment.centerLeft, child: Text('Write a review (optional)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)))),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: TextField(
              controller: _reviewController, maxLines: 4, maxLength: 500,
              decoration: InputDecoration(hintText: 'How was your experience?', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13), border: InputBorder.none, contentPadding: const EdgeInsets.all(14), counterStyle: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
            ),
          ),

          const SizedBox(height: 20),

          // ── Photos ──
          const Align(alignment: Alignment.centerLeft, child: Text('Add Photos (optional)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)))),
          const SizedBox(height: 10),
          SizedBox(
            height: 80,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                ..._photos.asMap().entries.map((e) => Container(
                  width: 80, height: 80, margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                  child: Stack(children: [
                    const Center(child: Icon(Icons.image, color: Colors.grey, size: 30)),
                    Positioned(top: 2, right: 2, child: GestureDetector(
                      onTap: () => setState(() => _photos.removeAt(e.key)),
                      child: Container(width: 20, height: 20, decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle), child: const Icon(Icons.close, size: 12, color: Colors.white)),
                    )),
                  ]),
                )),
                if (_photos.length < 4) GestureDetector(
                  onTap: () => setState(() => _photos.add('photo_${_photos.length}')),
                  child: Container(
                    width: 80, height: 80,
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.solid), borderRadius: BorderRadius.circular(12)),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.add_a_photo, size: 22, color: Colors.grey.shade400),
                      Text('Add', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                    ]),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // ── Submit ──
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: _canSubmit ? () => setState(() => _submitted = true) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: _restaurantColor, foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFFE2E8F0),
              padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          )),

          const SizedBox(height: 30),
        ]),
      ),
    );
  }

  Widget _buildCategoryRating(String category, int rating) {
    final emojis = ['😞', '😐', '🙂', '😊', '🤩'];
    final labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8)]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(category, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        const SizedBox(height: 10),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) {
          final selected = rating >= i + 1;
          return GestureDetector(
            onTap: () => setState(() => _ratings[category] = i + 1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 6),
              width: rating == i + 1 ? 46 : 38,
              height: rating == i + 1 ? 46 : 38,
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: selected ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0)),
              ),
              child: Center(child: Text(selected ? emojis[i] : '⭐', style: TextStyle(fontSize: rating == i + 1 ? 22 : 18))),
            ),
          );
        })),
        if (rating > 0) Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Center(child: Text(labels[rating - 1], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B)))),
        ),
      ]),
    );
  }

  Widget _successState(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: Center(child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(width: 80, height: 80, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle), child: const Icon(Icons.check, color: Colors.white, size: 40)),
          const SizedBox(height: 24),
          const Text('Thank You!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text('Your review for ${widget.restaurantName ?? 'the restaurant'} has been submitted.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
          const SizedBox(height: 12),
          Text('Average: ${_avgRating.toStringAsFixed(1)} ⭐', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFFF59E0B))),
          const SizedBox(height: 30),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: _restaurantColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          )),
        ]),
      )),
    );
  }
}
