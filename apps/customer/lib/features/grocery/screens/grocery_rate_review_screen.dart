import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Rate & Review Screen — Post-delivery product review.
class GroceryRateReviewScreen extends StatefulWidget {
  final String? productName;
  const GroceryRateReviewScreen({super.key, this.productName});
  @override
  State<GroceryRateReviewScreen> createState() => _GroceryRateReviewScreenState();
}

class _GroceryRateReviewScreenState extends State<GroceryRateReviewScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() { _commentController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.thumb_up, size: 64, color: _groceryColor),
            const SizedBox(height: 16),
            const Text('Thank you!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('Your review has been submitted', style: TextStyle(color: Colors.grey.shade500)),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: const Text('Done')),
          ]),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Write Review', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Star rating
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(children: [
              Text(widget.productName ?? 'Rate this product', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setState(() => _rating = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(i < _rating ? Icons.star : Icons.star_border, size: 40, color: i < _rating ? Colors.amber : Colors.grey.shade300),
                  ),
                )),
              ),
              const SizedBox(height: 8),
              Text(_rating == 0 ? 'Tap a star' : ['', 'Poor', 'Below Average', 'Good', 'Very Good', 'Excellent'][_rating],
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
            ]),
          ),
          const SizedBox(height: 12),

          // Comment
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Your Review', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              TextField(
                controller: _commentController,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: 'Share your experience...',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _groceryColor)),
                ),
              ),
              const SizedBox(height: 8),
              // Photo upload
              Row(children: [
                Container(
                  width: 60, height: 60,
                  decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid), borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.add_a_photo, color: Colors.grey.shade400, size: 24),
                ),
                const SizedBox(width: 8),
                Text('Add photos (optional)', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
            ]),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton.icon(
              onPressed: _rating > 0 ? () => setState(() => _submitted = true) : null,
              icon: const Icon(Icons.send, size: 16),
              label: const Text('Submit Review', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0, disabledBackgroundColor: Colors.grey.shade300),
            ),
          ),
        ],
      ),
    );
  }
}
