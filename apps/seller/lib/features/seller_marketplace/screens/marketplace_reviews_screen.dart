import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Reviews & Ratings — View customer reviews, respond, and track rating trends.
class MarketplaceReviewsScreen extends StatefulWidget {
  const MarketplaceReviewsScreen({super.key});

  @override
  State<MarketplaceReviewsScreen> createState() =>
      _MarketplaceReviewsScreenState();
}

class _MarketplaceReviewsScreenState extends State<MarketplaceReviewsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _filter = 'all';

  final List<_Review> _reviews = [
    const _Review(
        id: 'R1',
        product: 'iPhone 15 Pro Max',
        customer: 'Ahmed K.',
        avatar: 'A',
        rating: 5,
        comment:
            'Excellent phone! Fast delivery and genuine product. The camera quality is absolutely stunning. Highly recommend this seller.',
        date: '25 Jun',
        replied: false),
    const _Review(
        id: 'R2',
        product: 'Sony WH-1000XM5',
        customer: 'Sara M.',
        avatar: 'S',
        rating: 4,
        comment:
            'Good noise cancellation but the ear cups get warm after 2 hours of use. Sound quality is top-notch.',
        date: '24 Jun',
        replied: true,
        reply:
            'Thank you for your feedback, Sara! The XM5 ear cups are designed for breathability — try the included mesh pads for cooler comfort.'),
    const _Review(
        id: 'R3',
        product: 'Samsung Galaxy S24 Ultra',
        customer: 'Khalid R.',
        avatar: 'K',
        rating: 3,
        comment:
            'Phone is good but arrived with minor scratches on the frame. Packaging could be improved.',
        date: '23 Jun',
        replied: false),
    const _Review(
        id: 'R4',
        product: 'Apple Watch Series 9',
        customer: 'Fatima A.',
        avatar: 'F',
        rating: 5,
        comment:
            'Perfect! Works great with my iPhone. The health tracking features are incredible. Best smartwatch I have owned.',
        date: '22 Jun',
        replied: false),
    const _Review(
        id: 'R5',
        product: 'MacBook Air M3',
        customer: 'Omar H.',
        avatar: 'O',
        rating: 2,
        comment:
            'The laptop is fine but took 10 days to deliver. Was promised 3-5 days. Also the charger cable was tangled.',
        date: '20 Jun',
        replied: true,
        reply:
            'We sincerely apologize for the delay, Omar. We have escalated this with our logistics partner to ensure faster delivery. Thank you for your patience.'),
    const _Review(
        id: 'R6',
        product: 'JBL Flip 6',
        customer: 'Noura S.',
        avatar: 'N',
        rating: 1,
        comment: 'Speaker stopped working after 3 days. Very disappointed.',
        date: '19 Jun',
        replied: false),
  ];

  List<_Review> get _filtered {
    if (_filter == 'all') return _reviews;
    if (_filter == 'positive') {
      return _reviews.where((r) => r.rating >= 4).toList();
    }
    if (_filter == 'negative') {
      return _reviews.where((r) => r.rating <= 2).toList();
    }
    if (_filter == 'unreplied') {
      return _reviews.where((r) => !r.replied).toList();
    }
    return _reviews;
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    final avgRating = _reviews.isEmpty
        ? 0.0
        : _reviews.map((r) => r.rating).reduce((a, b) => a + b) /
            _reviews.length;
    final ratingDist = List.generate(
        5, (i) => _reviews.where((r) => r.rating == 5 - i).length);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Reviews · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Rating Summary
                _buildRatingSummary(avgRating, ratingDist),
                const SizedBox(height: 16),

                // Filters
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children:
                        ['all', 'positive', 'negative', 'unreplied'].map((f) {
                      final active = _filter == f;
                      final label = f == 'all'
                          ? 'All'
                          : f[0].toUpperCase() + f.substring(1);
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(label),
                          selected: active,
                          onSelected: (_) => setState(() => _filter = f),
                          selectedColor: _mp.withValues(alpha: 0.15),
                          checkmarkColor: _mp,
                          labelStyle: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: active ? _mp : SellerTheme.textSecondary),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          side: BorderSide(
                              color: active ? _mp : SellerTheme.border),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Reviews list
                ..._filtered.map((r) => _buildReviewCard(r)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRatingSummary(double avg, List<int> dist) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Row(children: [
        // Left: big number
        Column(children: [
          Text(avg.toStringAsFixed(1),
              style: const TextStyle(
                  fontSize: 40, fontWeight: FontWeight.w800, color: _mp)),
          Row(
              children: List.generate(
                  5,
                  (i) => Icon(i < avg.round() ? Icons.star : Icons.star_border,
                      color: Colors.amber, size: 16))),
          const SizedBox(height: 4),
          Text('${_reviews.length} reviews',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
        const SizedBox(width: 24),
        // Right: distribution bars
        Expanded(
          child: Column(
              children: List.generate(5, (i) {
            final star = 5 - i;
            final count = dist[i];
            final pct = _reviews.isEmpty ? 0.0 : count / _reviews.length;
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(children: [
                Text('$star',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(width: 4),
                const Icon(Icons.star, size: 12, color: Colors.amber),
                const SizedBox(width: 8),
                Expanded(
                    child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                      value: pct,
                      backgroundColor: SellerTheme.border,
                      color: _mp,
                      minHeight: 6),
                )),
                const SizedBox(width: 8),
                SizedBox(
                    width: 20,
                    child: Text('$count',
                        style: const TextStyle(
                            fontSize: 11, color: SellerTheme.textMuted),
                        textAlign: TextAlign.right)),
              ]),
            );
          })),
        ),
      ]),
    );
  }

  Widget _buildReviewCard(_Review r) {
    final starColor = r.rating >= 4
        ? SellerTheme.successGreen
        : r.rating >= 3
            ? SellerTheme.warningAmber
            : SellerTheme.errorRed;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
              radius: 18,
              backgroundColor: _mp.withValues(alpha: 0.1),
              child: Text(r.avatar,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, color: _mp))),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(r.customer,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
                Text(r.date,
                    style: const TextStyle(
                        fontSize: 11, color: SellerTheme.textMuted)),
              ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
                color: starColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              ...List.generate(r.rating,
                  (_) => Icon(Icons.star, size: 12, color: starColor)),
              ...List.generate(
                  5 - r.rating,
                  (_) => Icon(Icons.star_border,
                      size: 12, color: starColor.withValues(alpha: 0.4))),
            ]),
          ),
        ]),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
              color: SellerTheme.surface,
              borderRadius: BorderRadius.circular(6)),
          child: Text(r.product,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: SellerTheme.textSecondary)),
        ),
        const SizedBox(height: 8),
        Text(r.comment,
            style: const TextStyle(
                fontSize: 13, color: SellerTheme.textPrimary, height: 1.4)),
        if (r.replied && r.reply != null) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _mp.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _mp.withValues(alpha: 0.15)),
            ),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.reply, size: 14, color: _mp),
                SizedBox(width: 6),
                Text('Your Reply',
                    style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600, color: _mp)),
              ]),
              const SizedBox(height: 6),
              Text(r.reply!,
                  style: const TextStyle(
                      fontSize: 12,
                      color: SellerTheme.textSecondary,
                      height: 1.4)),
            ]),
          ),
        ],
        if (!r.replied) ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _showReplyDialog(r),
              icon: const Icon(Icons.reply, size: 16),
              label: const Text('Reply to Review'),
              style: OutlinedButton.styleFrom(
                foregroundColor: _mp,
                side: const BorderSide(color: _mp),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ]),
    );
  }

  void _showReplyDialog(_Review r) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Reply to ${r.customer}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: TextField(
          controller: ctrl,
          maxLines: 4,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Write your response...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (ctrl.text.isNotEmpty) {
                setState(() {
                  final idx = _reviews.indexOf(r);
                  if (idx >= 0) {
                    _reviews[idx] = r.copyWith(replied: true, reply: ctrl.text);
                  }
                });
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: _mp),
            child:
                const Text('Send Reply', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

class _Review {
  final String id, product, customer, avatar, comment, date;
  final int rating;
  final bool replied;
  final String? reply;
  const _Review(
      {required this.id,
      required this.product,
      required this.customer,
      required this.avatar,
      required this.rating,
      required this.comment,
      required this.date,
      this.replied = false,
      this.reply});
  _Review copyWith({bool? replied, String? reply}) => _Review(
      id: id,
      product: product,
      customer: customer,
      avatar: avatar,
      rating: rating,
      comment: comment,
      date: date,
      replied: replied ?? this.replied,
      reply: reply ?? this.reply);
}
