import 'package:flutter/material.dart';

class HotelSavedScreen extends StatefulWidget {
  const HotelSavedScreen({super.key});

  @override
  State<HotelSavedScreen> createState() => _HotelSavedScreenState();
}

class _HotelSavedScreenState extends State<HotelSavedScreen> {
  final List<Map<String, dynamic>> _savedHotels = [
    {
      'id': 'htl-001',
      'name': 'The Grand Palace Hotel',
      'city': 'Dubai, UAE',
      'rating': 4.8,
      'reviewCount': 1240,
      'starRating': 5,
      'pricePerNight': 450,
      'currency': 'AED',
      'emoji': '🏰',
      'amenities': ['Pool', 'Spa', 'Gym', 'Restaurant'],
      'savedAt': '2 days ago',
    },
    {
      'id': 'htl-005',
      'name': 'Heritage Boutique Hotel',
      'city': 'London, UK',
      'rating': 4.9,
      'reviewCount': 430,
      'starRating': 5,
      'pricePerNight': 320,
      'currency': '£',
      'emoji': '🏛️',
      'amenities': ['Spa', 'Fine Dining', 'Concierge', 'WiFi'],
      'savedAt': '1 week ago',
    },
    {
      'id': 'htl-006',
      'name': 'Royal Palm Resort',
      'city': 'Muscat, Oman',
      'rating': 4.5,
      'reviewCount': 780,
      'starRating': 5,
      'pricePerNight': 45,
      'currency': 'OMR',
      'emoji': '🌴',
      'amenities': ['Pool', 'Beach', 'WiFi', 'Restaurant'],
      'savedAt': '2 weeks ago',
    },
  ];

  void _removeSaved(int index) {
    setState(() {
      _savedHotels.removeAt(index);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Hotel removed from saved list'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: const Color(0xFF0F172A),
        action: SnackBarAction(
          label: 'Undo',
          textColor: const Color(0xFFFB7185),
          onPressed: () {},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Saved Hotels',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          if (_savedHotels.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_savedHotels.length} saved',
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFE11D48)),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _savedHotels.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('❤️', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 16),
                  const Text('No saved hotels',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  const Text('Tap the heart icon to save hotels for later.',
                      style: TextStyle(fontSize: 14, color: Color(0xFF94A3B8))),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/hotel-booking'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE11D48),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Explore Hotels',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _savedHotels.length,
              itemBuilder: (context, index) {
                final hotel = _savedHotels[index];
                return Dismissible(
                  key: Key(hotel['id']),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.delete_outline,
                        color: Colors.white, size: 28),
                  ),
                  onDismissed: (_) => _removeSaved(index),
                  child: _buildHotelCard(hotel),
                );
              },
            ),
    );
  }

  Widget _buildHotelCard(Map<String, dynamic> hotel) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Image Area
          Container(
            height: 140,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFFFF1F2), Color(0xFFFEF3C7)],
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Stack(
              children: [
                Center(
                  child: Text(hotel['emoji'],
                      style: const TextStyle(fontSize: 56)),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: GestureDetector(
                    onTap: () => _removeSaved(_savedHotels.indexOf(hotel)),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 8)
                        ],
                      ),
                      child: const Icon(Icons.favorite,
                          color: Color(0xFFE11D48), size: 18),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star, color: Colors.white, size: 12),
                        const SizedBox(width: 4),
                        Text('${hotel['rating']}',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(hotel['name'],
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.location_on,
                                  size: 12, color: Color(0xFF94A3B8)),
                              const SizedBox(width: 4),
                              Text(hotel['city'],
                                  style: const TextStyle(
                                      fontSize: 12, color: Color(0xFF94A3B8))),
                              const SizedBox(width: 8),
                              Text('⭐' * (hotel['starRating'] as int),
                                  style: const TextStyle(fontSize: 10)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${hotel['currency']} ${hotel['pricePerNight']}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w900, fontSize: 18),
                        ),
                        const Text('/ night',
                            style: TextStyle(
                                fontSize: 10, color: Color(0xFF94A3B8))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: (hotel['amenities'] as List)
                      .take(4)
                      .map((a) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(6),
                              border:
                                  Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Text(a,
                                style: const TextStyle(
                                    fontSize: 10,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w600)),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text('Saved ${hotel['savedAt']}',
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFF94A3B8))),
                    const Spacer(),
                    SizedBox(
                      height: 36,
                      child: ElevatedButton(
                        onPressed: () {},
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE11D48),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                        child: const Text('View Hotel',
                            style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 13)),
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
}
