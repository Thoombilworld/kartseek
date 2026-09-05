import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';

/// Write a product review.
///
/// Two faults, both of the same kind. Nothing was validated - no `Form`, no
/// `validator`, so a review could be submitted with an empty body - and
/// "Submit Review" called `Navigator.pop(context)`: it posted nothing, the
/// review was never written, and the customer had no way to tell. The product
/// name also defaulted to 'Wireless Headphones', so a screen opened without
/// arguments reviewed a product that may not exist.
class WriteReviewScreen extends StatefulWidget {
  const WriteReviewScreen({super.key, required this.productId, required this.productName});

  final String productId;
  final String productName;

  @override
  State<WriteReviewScreen> createState() => _WriteReviewScreenState();
}

class _WriteReviewScreenState extends State<WriteReviewScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = MarketplaceApiService();

  bool _submitting = false;
  String? _submitError;

  int _rating = 0;
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _prosController = TextEditingController();
  final _consController = TextEditingController();
  bool _recommend = true;

  @override
  void dispose() { _titleController.dispose(); _bodyController.dispose(); _prosController.dispose(); _consController.dispose(); super.dispose(); }

  /// Write the review, or say why it could not be written.
  Future<void> _submit() async {
    setState(() => _submitError = null);
    if (_rating == 0) {
      setState(() => _submitError = 'Choose a star rating first.');
      return;
    }
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _submitting = true);
    try {
      await _api.addProductReview(widget.productId, {
        'rating': _rating,
        'title': _titleController.text.trim(),
        'body': _bodyController.text.trim(),
        'pros': _prosController.text.trim(),
        'cons': _consController.text.trim(),
        'recommend': _recommend,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(const SnackBar(
            content: Text('Thanks - your review has been submitted.'),
            behavior: SnackBarBehavior.floating));
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _submitError = e is MarketplaceApiException
            ? e.message
            : "We couldn't post your review. Your text is still here - please try again.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0.5,
        title: const Text('Write a Review', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Product
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.borderLight)),
            child: Row(children: [
              Container(width: 56, height: 56, decoration: BoxDecoration(color: AppTheme.surfaceMuted, borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.headphones, color: AppTheme.marketplaceColor, size: 28)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(widget.productName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const Text('Purchased Jun 15, 2026', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ])),
            ]),
          ),
          const SizedBox(height: 24),

          // Star Rating
          const Text('Overall Rating', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          Center(child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => GestureDetector(
              onTap: () => setState(() => _rating = i + 1),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Icon(i < _rating ? Icons.star : Icons.star_border,
                  color: const Color(0xFFFBBF24), size: 40),
              ),
            ))),
            if (_rating > 0) ...[
              const SizedBox(height: 6),
              Text(ratingLabels[_rating], style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _rating >= 4 ? AppTheme.successGreen : _rating >= 3 ? AppTheme.warningAmber : AppTheme.errorRed)),
            ],
          ])),
          const SizedBox(height: 24),

          // Title
          const Text('Review Title', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextFormField(controller: _titleController,
            textInputAction: TextInputAction.next,
            maxLength: 80,
            validator: (v) {
              final t = (v ?? '').trim();
              if (t.isEmpty) return 'Give your review a short title.';
              if (t.length < 3) return 'That title is too short.';
              return null;
            },
            decoration: InputDecoration(hintText: 'Sum up your experience...', hintStyle: const TextStyle(color: AppTheme.textMuted),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.marketplaceColor)))),
          const SizedBox(height: 16),

          // Body
          const Text('Your Review', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextFormField(controller: _bodyController, maxLines: 4,
            maxLength: 2000,
            validator: (v) {
              final t = (v ?? '').trim();
              if (t.isEmpty) return 'Tell other shoppers what you thought.';
              if (t.length < 10) return 'Add a little more detail - at least 10 characters.';
              return null;
            },
            decoration: InputDecoration(hintText: 'Share your experience with this product...', hintStyle: const TextStyle(color: AppTheme.textMuted),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.marketplaceColor)))),
          const SizedBox(height: 16),

          // Pros & Cons
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('👍 Pros', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.successGreen)),
              const SizedBox(height: 8),
              TextFormField(controller: _prosController, maxLines: 2, maxLength: 200,
                decoration: InputDecoration(hintText: 'What did you like?', hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  filled: true, fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.successGreen)))),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('👎 Cons', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.errorRed)),
              const SizedBox(height: 8),
              TextFormField(controller: _consController, maxLines: 2, maxLength: 200,
                decoration: InputDecoration(hintText: "What didn't you like?", hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  filled: true, fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.errorRed)))),
            ])),
          ]),
          const SizedBox(height: 16),

          // Photos
          const Text('Add Photos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          Row(children: [
            GestureDetector(
              onTap: () {},
              child: Container(
                width: 72, height: 72,
                decoration: BoxDecoration(border: Border.all(color: const Color(0xFFC7D2FE), style: BorderStyle.solid), borderRadius: BorderRadius.circular(12)),
                child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.add_a_photo, color: AppTheme.marketplaceColor, size: 24),
                  SizedBox(height: 2),
                  Text('Upload', style: TextStyle(fontSize: 10, color: AppTheme.marketplaceColor, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
          ]),
          const SizedBox(height: 16),

          // Recommend
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.borderLight)),
            child: Row(children: [
              const Expanded(child: Text('Would you recommend this product?', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
              Row(children: [
                GestureDetector(
                  onTap: () => setState(() => _recommend = true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(color: _recommend ? AppTheme.successGreen : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppTheme.borderLight)),
                    child: Text('Yes', style: TextStyle(fontWeight: FontWeight.w700, color: _recommend ? Colors.white : AppTheme.textSecondary)),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => setState(() => _recommend = false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(color: !_recommend ? AppTheme.errorRed : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppTheme.borderLight)),
                    child: Text('No', style: TextStyle(fontWeight: FontWeight.w700, color: !_recommend ? Colors.white : AppTheme.textSecondary)),
                  ),
                ),
              ]),
            ]),
          ),
          if (_submitError != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(children: [
                const Icon(Icons.error_outline, size: 18, color: Color(0xFFB4241C)),
                const SizedBox(width: 8),
                Expanded(child: Text(_submitError!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFFB4241C)))),
              ]),
            ),
          ],
          const SizedBox(height: 80),
        ]),
      ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppTheme.borderLight))),
        child: SafeArea(
          child: ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, disabledBackgroundColor: AppTheme.borderLight, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: _submitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
          ),
        ),
      ),
    );
  }
}
