import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';

/// Rate & Review — star rating + text comment.
class PharmacyReviewScreen extends StatefulWidget {
  final String storeId;
  final String? storeName;
  const PharmacyReviewScreen({super.key, required this.storeId, this.storeName});
  @override State<PharmacyReviewScreen> createState() => _PharmacyReviewScreenState();
}

class _PharmacyReviewScreenState extends State<PharmacyReviewScreen> {
  int _rating = 0;
  final _commentCtrl = TextEditingController();

  @override
  void dispose() { _commentCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.close, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Rate & Review', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            Text(widget.storeName ?? 'Pharmacy', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('How was your experience?', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
            const SizedBox(height: 32),
            // Star rating
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) => GestureDetector(
                onTap: () => setState(() => _rating = i + 1),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    i < _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 48,
                    color: i < _rating ? Colors.amber.shade400 : Colors.grey.shade300,
                  ),
                ),
              )),
            ),
            if (_rating > 0) ...[
              const SizedBox(height: 8),
              Text(
                ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'][_rating],
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _rating >= 4 ? Colors.green : (_rating >= 3 ? Colors.amber.shade700 : Colors.red)),
              ),
            ],
            const SizedBox(height: 32),
            // Comment
            TextField(
              controller: _commentCtrl,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Tell us more about your experience (optional)',
                hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade200)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppTheme.pharmacyColor, width: 2)),
                filled: true, fillColor: Colors.grey.shade50,
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity, height: 52,
              child: ElevatedButton(
                onPressed: _rating > 0 ? () {
                  context.read<PharmacyBloc>().add(SubmitPharmacyReview(
                    storeId: widget.storeId, rating: _rating, comment: _commentCtrl.text,
                  ));
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thank you for your review! ⭐')));
                } : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                child: const Text('Submit Review'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
