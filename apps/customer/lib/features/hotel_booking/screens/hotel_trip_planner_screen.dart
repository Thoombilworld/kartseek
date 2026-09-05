import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Hotel Trip Planner Screen — Multi-city itinerary builder.
///
/// Features:
///   • Add multiple city stops
///   • Select hotels for each stop
///   • Total cost summary
///   • Share itinerary
class HotelTripPlannerScreen extends StatefulWidget {
  const HotelTripPlannerScreen({super.key});

  @override
  State<HotelTripPlannerScreen> createState() => _HotelTripPlannerScreenState();
}

class _HotelTripPlannerScreenState extends State<HotelTripPlannerScreen> {
  static const _color = AppTheme.hotelColor;

  final List<Map<String, dynamic>> _stops = [
    {'city': 'Dubai', 'flag': '🇦🇪', 'nights': 3, 'hotel': 'The Grand Palace Hotel', 'price': 450, 'currency': 'AED', 'emoji': '🏰'},
    {'city': 'Doha', 'flag': '🇶🇦', 'nights': 2, 'hotel': 'KARTSEEK Business Suites', 'price': 280, 'currency': 'QAR', 'emoji': '🏢'},
  ];

  static const _suggestedCities = [
    {'city': 'Mumbai', 'flag': '🇮🇳', 'hotels': 32, 'gradient': [Color(0xFFFEF3C7), Color(0xFFFDE68A)]},
    {'city': 'London', 'flag': '🇬🇧', 'hotels': 12, 'gradient': [Color(0xFFE0F2FE), Color(0xFFBAE6FD)]},
    {'city': 'Riyadh', 'flag': '🇸🇦', 'hotels': 22, 'gradient': [Color(0xFFF0FDF4), Color(0xFFDCFCE7)]},
    {'city': 'Muscat', 'flag': '🇴🇲', 'hotels': 8, 'gradient': [Color(0xFFF5F3FF), Color(0xFFEDE9FE)]},
    {'city': 'Istanbul', 'flag': '🇹🇷', 'hotels': 15, 'gradient': [Color(0xFFFFF1F2), Color(0xFFFFE4E6)]},
    {'city': 'Singapore', 'flag': '🇸🇬', 'hotels': 28, 'gradient': [Color(0xFFF0FDFA), Color(0xFFCCFBF1)]},
  ];

  int get _totalNights => _stops.fold(0, (s, stop) => s + (stop['nights'] as int));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('✈️ Trip Planner', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        actions: [
          IconButton(icon: const Icon(Icons.share_outlined, color: _color), onPressed: _sharePlan),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _buildTripSummary(),
                const SizedBox(height: 16),
                const Text('Your Stops', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                const SizedBox(height: 12),
                ...List.generate(_stops.length, _buildStopCard),
                _buildAddStop(),
                const SizedBox(height: 20),
                const Text('Suggested Destinations', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                const SizedBox(height: 12),
                _buildSuggestedCities(),
              ],
            ),
          ),
          _buildBottomBar(),
        ],
      ),
    );
  }

  Widget _buildTripSummary() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFE11D48), Color(0xFFBE123C)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _summaryItem('🏙️', '${_stops.length}', 'Cities'),
          Container(width: 1, height: 40, color: Colors.white24),
          _summaryItem('🌙', '$_totalNights', 'Nights'),
          Container(width: 1, height: 40, color: Colors.white24),
          _summaryItem('🏨', '${_stops.length}', 'Hotels'),
        ],
      ),
    );
  }

  Widget _summaryItem(String emoji, String value, String label) {
    return Column(children: [
      Text(emoji, style: const TextStyle(fontSize: 24)),
      const SizedBox(height: 4),
      Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
      Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70)),
    ]);
  }

  Widget _buildStopCard(int index) {
    final stop = _stops[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: Column(
        children: [
          // Stop header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: _color.withValues(alpha: 0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  width: 28, height: 28,
                  decoration: BoxDecoration(color: _color, borderRadius: BorderRadius.circular(8)),
                  child: Center(child: Text('${index + 1}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white))),
                ),
                const SizedBox(width: 10),
                Text('${stop['flag']} ${stop['city']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _stops.removeAt(index)),
                  child: Icon(Icons.close, size: 18, color: Colors.grey.shade400),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Text(stop['emoji'] as String, style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(stop['hotel'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        Text('${stop['currency']} ${stop['price']}/night', style: const TextStyle(fontSize: 13, color: _color, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Nights selector
                Row(
                  children: [
                    const Text('Nights:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                    const Spacer(),
                    GestureDetector(
                      onTap: () { if (stop['nights'] > 1) setState(() => stop['nights'] = (stop['nights'] as int) - 1); },
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.remove, size: 16),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text('${stop['nights']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => stop['nights'] = (stop['nights'] as int) + 1),
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(color: _color, borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.add, size: 16, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddStop() {
    return GestureDetector(
      onTap: _addCity,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: _color, width: 1.5, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_circle_outline, color: _color, size: 22),
            SizedBox(width: 8),
            Text('Add City Stop', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _color)),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestedCities() {
    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _suggestedCities.length,
        itemBuilder: (_, i) {
          final city = _suggestedCities[i];
          final gradient = city['gradient'] as List<Color>;
          return GestureDetector(
            onTap: () => setState(() => _stops.add({
              'city': city['city'], 'flag': city['flag'], 'nights': 2,
              'hotel': 'Select Hotel', 'price': 0, 'currency': '', 'emoji': '🏨',
            })),
            child: Container(
              width: 120,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: gradient),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(city['flag'] as String, style: const TextStyle(fontSize: 28)),
                  const SizedBox(height: 4),
                  Text(city['city'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  Text('${city['hotels']} hotels', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$_totalNights nights • ${_stops.length} cities', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              const Text('View Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            ]),
            const Spacer(),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: _color,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Book Trip', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _addCity() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: 350,
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 20),
            const Text('Add a City', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                hintText: 'Search city...',
                prefixIcon: const Icon(Icons.search),
                filled: true, fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: _suggestedCities.map((c) => ListTile(
                  leading: Text(c['flag'] as String, style: const TextStyle(fontSize: 24)),
                  title: Text(c['city'] as String, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${c['hotels']} hotels'),
                  onTap: () {
                    setState(() => _stops.add({
                      'city': c['city'], 'flag': c['flag'], 'nights': 2,
                      'hotel': 'Select Hotel', 'price': 0, 'currency': '', 'emoji': '🏨',
                    }));
                    Navigator.pop(context);
                  },
                )).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _sharePlan() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Trip plan copied to clipboard!')),
    );
  }
}
