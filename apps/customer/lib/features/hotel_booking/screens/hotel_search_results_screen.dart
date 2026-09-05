import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_event.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_state.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';

/// Hotel Search Results — Filter, sort, and browse hotel cards.
class HotelSearchResultsScreen extends StatefulWidget {
  final Map<String, dynamic>? searchParams;
  const HotelSearchResultsScreen({super.key, this.searchParams});

  @override
  State<HotelSearchResultsScreen> createState() => _HotelSearchResultsScreenState();
}

class _HotelSearchResultsScreenState extends State<HotelSearchResultsScreen> {
  String _sortBy = 'rating';
  int _minStars = 0;
  static const _hotelColor = AppTheme.hotelColor;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HotelBloc>().add(SearchHotels(city: widget.searchParams?['city'] ?? 'Dubai'));
    });
  }

  List<Map<String, dynamic>> _sortedResults(List<Map<String, dynamic>> hotels) {
    var filtered = _minStars > 0 ? hotels.where((h) => (h['stars'] as int? ?? 0) >= _minStars).toList() : hotels.toList();
    switch (_sortBy) {
      case 'price-low': filtered.sort((a, b) => ((a['price'] as num?) ?? 0).compareTo((b['price'] as num?) ?? 0));
      case 'price-high': filtered.sort((a, b) => ((b['price'] as num?) ?? 0).compareTo((a['price'] as num?) ?? 0));
      default: filtered.sort((a, b) => ((b['rating'] as num?) ?? 0).compareTo((a['rating'] as num?) ?? 0));
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _hotelColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Text(widget.searchParams?['city'] ?? 'Hotels', style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.mic_none_rounded, color: Colors.white, size: 22),
            onPressed: () => VoiceSearchSheet.show(
              context: context,
              accentColor: _hotelColor,
              hintText: 'Try "Dubai" or "Maldives resorts"',
              onResult: (text) {
                context.read<HotelBloc>().add(SearchHotels(city: text));
              },
            ),
          ),
          IconButton(icon: const Icon(Icons.map_outlined, color: Colors.white, size: 22), onPressed: () {}),
        ],
      ),
      body: BlocBuilder<HotelBloc, HotelState>(
        builder: (context, state) {
          if (state.status == HotelStatus.searching) {
            return const Center(child: CircularProgressIndicator(color: _hotelColor));
          }
          final results = _sortedResults(state.searchResults);

          return Column(children: [
            // ── Sort & Filter ──
            Container(
              color: Colors.white, padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
              child: Row(children: [
                Text('${results.length} hotels', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                const Spacer(),
                // Star filter
                ...List.generate(3, (i) {
                  final stars = [3, 4, 5][i];
                  final active = _minStars == stars;
                  return GestureDetector(
                    onTap: () => setState(() => _minStars = active ? 0 : stars),
                    child: Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: active ? _hotelColor.withValues(alpha: 0.1) : Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: active ? _hotelColor : const Color(0xFFE2E8F0)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.star, size: 10, color: active ? _hotelColor : Colors.grey),
                        Text('$stars+', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: active ? _hotelColor : const Color(0xFF64748B))),
                      ]),
                    ),
                  );
                }),
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFE2E8F0))),
                  child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                    value: _sortBy, isDense: true,
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                    items: const [
                      DropdownMenuItem(value: 'rating', child: Text('Top Rated')),
                      DropdownMenuItem(value: 'price-low', child: Text('Price ↑')),
                      DropdownMenuItem(value: 'price-high', child: Text('Price ↓')),
                    ],
                    onChanged: (v) => setState(() => _sortBy = v!),
                  )),
                ),
              ]),
            ),
            const Divider(height: 1),

            // ── Hotel Cards ──
            Expanded(child: results.isEmpty
              ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('🏨', style: TextStyle(fontSize: 48)),
                  SizedBox(height: 12),
                  Text('No hotels found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  Text('Try adjusting your filters', style: TextStyle(color: Color(0xFF64748B))),
                ]))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: results.length,
                  itemBuilder: (_, i) => _buildHotelCard(context, results[i]),
                ),
            ),
          ]);
        },
      ),
    );
  }

  Widget _buildHotelCard(BuildContext context, Map<String, dynamic> hotel) {
    final name = hotel['name'] ?? 'Hotel';
    final city = hotel['city'] ?? '';
    final rating = hotel['rating'] ?? 0.0;
    final price = hotel['price'] ?? 0;
    final currency = hotel['currency'] ?? '\$';
    final stars = hotel['stars'] as int? ?? 4;
    final amenities = hotel['amenities'] as List? ?? [];
    final distance = hotel['distance'] ?? '';
    final offer = hotel['offer'] as String?;
    final reviewCount = hotel['reviewCount'] ?? 0;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, CustomerRouter.hotelDetail, arguments: hotel),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, 4))]),
        clipBehavior: Clip.antiAlias,
        child: Column(children: [
          // Image area
          Container(
            height: 140,
            decoration: BoxDecoration(gradient: LinearGradient(colors: [_hotelColor.withValues(alpha: 0.08), const Color(0xFFFFF7ED)])),
            child: Stack(children: [
              const Center(child: Text('🏨', style: TextStyle(fontSize: 50))),
              if (offer != null) Positioned(top: 10, left: 10, child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: _hotelColor, borderRadius: BorderRadius.circular(8)),
                child: Text(offer, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
              )),
              Positioned(top: 10, right: 10, child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)]),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 2),
                  Text('$rating', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  Text(' ($reviewCount)', style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
                ]),
              )),
              Positioned(bottom: 10, left: 10, child: Row(children: List.generate(stars, (_) => const Icon(Icons.star, size: 14, color: Color(0xFFF59E0B))))),
            ]),
          ),
          // Info
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
              const SizedBox(height: 4),
              Row(children: [
                const Icon(Icons.location_on, size: 12, color: Color(0xFF64748B)),
                const SizedBox(width: 3),
                Text(city, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                const SizedBox(width: 8),
                Text('• $distance', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              ]),
              const SizedBox(height: 8),
              // Amenities
              Wrap(spacing: 6, runSpacing: 4, children: amenities.take(4).map((a) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(6)),
                child: Text(a.toString(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
              )).toList()),
              const SizedBox(height: 10),
              Row(children: [
                Text('$currency $price', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                Text(' / night', style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: _hotelColor, borderRadius: BorderRadius.circular(10)),
                  child: const Text('View', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                ),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}
