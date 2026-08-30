import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_event.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_state.dart';

/// Hotel Reviews Screen — API-connected reviews with fallback data.
class HotelReviewsScreen extends StatefulWidget {
  final String hotelId;
  final String hotelName;
  final double overallRating;

  const HotelReviewsScreen({
    super.key,
    required this.hotelId,
    this.hotelName = 'Hotel',
    this.overallRating = 4.5,
  });

  @override
  State<HotelReviewsScreen> createState() => _HotelReviewsScreenState();
}

class _HotelReviewsScreenState extends State<HotelReviewsScreen> {
  String _sortBy = 'newest';
  static const _color = AppTheme.hotelColor;

  // Fallback reviews if API returns empty
  static const _fallbackReviews = <Map<String, dynamic>>[
    {'id': 'rv-01', 'user': 'Sarah M.', 'avatar': '👩', 'rating': 5.0, 'date': '2 days ago', 'title': 'Absolutely incredible stay!', 'body': 'The room was spotless, staff were incredibly welcoming, and the breakfast buffet was outstanding. The pool area is gorgeous and well maintained. Would definitely come back!', 'helpful': 24, 'photos': 3, 'tags': ['Clean', 'Friendly Staff', 'Great Breakfast']},
    {'id': 'rv-02', 'user': 'Ahmed K.', 'avatar': '👨', 'rating': 4.0, 'date': '1 week ago', 'title': 'Great location, minor issues', 'body': 'Perfect location for business. Walking distance to everything. The WiFi was excellent. Only issue was slow room service on the first night. Overall good value for money.', 'helpful': 12, 'photos': 1, 'tags': ['Good Location', 'Fast WiFi', 'Business Friendly']},
    {'id': 'rv-03', 'user': 'Priya R.', 'avatar': '👩‍🦱', 'rating': 5.0, 'date': '2 weeks ago', 'title': 'Family-friendly paradise', 'body': 'Kids loved the pool and kids club! The staff arranged a birthday surprise for our daughter. Restaurant had great options for picky eaters. Highly recommend for families.', 'helpful': 31, 'photos': 5, 'tags': ['Family Friendly', 'Kids Club', 'Great Pool']},
    {'id': 'rv-04', 'user': 'James T.', 'avatar': '🧑', 'rating': 3.0, 'date': '3 weeks ago', 'title': 'Decent but overpriced', 'body': 'Room was nice but nothing spectacular for the price. Bathroom could use updating. The spa was the highlight — truly relaxing experience. Breakfast was average.', 'helpful': 8, 'photos': 0, 'tags': ['Good Spa', 'Needs Updating']},
    {'id': 'rv-05', 'user': 'Fatima A.', 'avatar': '🧕', 'rating': 5.0, 'date': '1 month ago', 'title': 'Best hotel experience ever', 'body': 'From check-in to check-out, everything was perfect. The suite was luxurious with an amazing city view. The concierge helped plan our entire trip. Will be back!', 'helpful': 45, 'photos': 7, 'tags': ['Luxurious', 'Great View', 'Excellent Concierge']},
  ];

  static const _fallbackRatingDist = [
    {'stars': 5, 'pct': 0.68},
    {'stars': 4, 'pct': 0.20},
    {'stars': 3, 'pct': 0.08},
    {'stars': 2, 'pct': 0.03},
    {'stars': 1, 'pct': 0.01},
  ];

  @override
  void initState() {
    super.initState();
    // Dispatch API call for reviews (M5 fix)
    context.read<HotelBloc>().add(LoadHotelReviews(hotelId: widget.hotelId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: Text('Reviews — ${widget.hotelName}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        actions: [
          TextButton.icon(
            onPressed: _showWriteReview,
            icon: const Icon(Icons.edit_outlined, size: 18, color: _color),
            label: const Text('Write', style: TextStyle(color: _color, fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ],
      ),
      body: BlocBuilder<HotelBloc, HotelState>(
        builder: (context, state) {
          final reviews = state.reviews.isNotEmpty ? state.reviews : _fallbackReviews;
          final isLoading = state.status == HotelStatus.loading;

          // Get rating distribution from API meta or fallback
          final ratingDist = _getRatingDist(state.reviewMeta);
          final avgRating = state.reviewMeta != null
              ? (state.reviewMeta!['averageRating'] as num?)?.toDouble() ?? widget.overallRating
              : widget.overallRating;
          final totalReviews = state.reviewMeta != null
              ? (state.reviewMeta!['total'] as num?)?.toInt() ?? reviews.length
              : reviews.length;

          if (isLoading) {
            return const Center(child: CircularProgressIndicator(color: _color));
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<HotelBloc>().add(LoadHotelReviews(hotelId: widget.hotelId));
              await Future.delayed(const Duration(milliseconds: 500));
            },
            color: _color,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              children: [
                _buildRatingSummary(avgRating, totalReviews, ratingDist),
                _buildSortBar(),
                ...reviews.map(_buildReviewCard),
                const SizedBox(height: 80),
              ],
            ),
          );
        },
      ),
    );
  }

  List<Map<String, dynamic>> _getRatingDist(Map<String, dynamic>? meta) {
    if (meta == null) return List<Map<String, dynamic>>.from(_fallbackRatingDist);
    final dist = meta['ratingDistribution'];
    if (dist is! Map) return List<Map<String, dynamic>>.from(_fallbackRatingDist);
    final total = dist.values.fold<num>(0, (a, b) => a + (b is num ? b : 0));
    if (total == 0) return List<Map<String, dynamic>>.from(_fallbackRatingDist);
    return [5, 4, 3, 2, 1].map((s) {
      final count = dist['$s'] is num ? (dist['$s'] as num) : 0;
      return <String, dynamic>{'stars': s, 'pct': count / total};
    }).toList();
  }

  Widget _buildRatingSummary(double rating, int totalReviews, List<Map<String, dynamic>> ratingDist) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Row(children: [
        Column(children: [
          Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          Row(children: List.generate(5, (i) => Icon(i < rating.floor() ? Icons.star_rounded : Icons.star_outline_rounded, color: const Color(0xFFF59E0B), size: 18))),
          const SizedBox(height: 4),
          Text('$totalReviews reviews', style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(width: 24),
        Expanded(child: Column(
          children: ratingDist.map((d) {
            final stars = d['stars'] is int ? d['stars'] as int : 0;
            final pct = d['pct'] is double ? d['pct'] as double : 0.0;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(children: [
                Text('$stars', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const Icon(Icons.star_rounded, size: 12, color: Color(0xFFF59E0B)),
                const SizedBox(width: 8),
                Expanded(child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(value: pct, backgroundColor: const Color(0xFFF1F5F9), color: _color, minHeight: 8),
                )),
                const SizedBox(width: 8),
                SizedBox(width: 35, child: Text('${(pct * 100).toInt()}%', style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w600))),
              ]),
            );
          }).toList(),
        )),
      ]),
    );
  }

  Widget _buildSortBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(children: [
        const Text('Sort by:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(width: 8),
        ...['newest', 'highest', 'helpful'].map((s) => Padding(
          padding: const EdgeInsets.only(right: 6),
          child: GestureDetector(
            onTap: () => setState(() => _sortBy = s),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _sortBy == s ? _color : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _sortBy == s ? _color : const Color(0xFFE2E8F0)),
              ),
              child: Text(
                s == 'newest' ? 'Newest' : s == 'highest' ? 'Highest' : 'Helpful',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _sortBy == s ? Colors.white : const Color(0xFF64748B)),
              ),
            ),
          ),
        )),
      ]),
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review) {
    final ratingValue = review['rating'];
    final rating = ratingValue is num ? ratingValue.toDouble() : 0.0;
    final user = (review['user'] ?? 'Guest').toString();
    final avatar = (review['avatar'] ?? '👤').toString();
    final date = (review['date'] ?? '').toString();
    final title = (review['title'] ?? '').toString();
    final body = (review['body'] ?? '').toString();
    final photosValue = review['photos'];
    final photos = photosValue is int ? photosValue : 0;
    final helpful = review['helpful'] is int ? review['helpful'] as int : 0;
    final tagsRaw = review['tags'];
    final tags = tagsRaw is List ? tagsRaw.whereType<String>().toList() : <String>[];

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(backgroundColor: _color.withValues(alpha: 0.1), child: Text(avatar, style: const TextStyle(fontSize: 20))),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(user, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            Text(date, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
          ])),
          Row(children: List.generate(5, (i) => Icon(i < rating ? Icons.star_rounded : Icons.star_outline_rounded, color: const Color(0xFFF59E0B), size: 16))),
        ]),
        const SizedBox(height: 10),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        const SizedBox(height: 6),
        Text(body, style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.5)),
        if (photos > 0) ...[
          const SizedBox(height: 10),
          Row(children: [
            Icon(Icons.photo_library_outlined, size: 14, color: Colors.grey.shade400),
            const SizedBox(width: 4),
            Text('$photos photos', style: TextStyle(fontSize: 12, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
          ]),
        ],
        const SizedBox(height: 10),
        Wrap(
          spacing: 6, runSpacing: 4,
          children: tags.map<Widget>((t) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: _color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
            child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _color)),
          )).toList(),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Icon(Icons.thumb_up_outlined, size: 14, color: Colors.grey.shade400),
          const SizedBox(width: 4),
          Text('$helpful found this helpful', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ]),
      ]),
    );
  }

  void _showWriteReview() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 20),
          const Text('Write a Review', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text('Share your experience at ${widget.hotelName}', style: TextStyle(color: Colors.grey.shade500)),
          const SizedBox(height: 24),
          const Text('Your Rating', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(children: List.generate(5, (i) => IconButton(icon: const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 36), onPressed: () {}))),
          const SizedBox(height: 16),
          TextField(
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Tell others about your experience...',
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            ),
          ),
          const Spacer(),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: _color, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Submit Review', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
          )),
        ]),
      ),
    );
  }
}
