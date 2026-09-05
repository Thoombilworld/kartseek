import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Customer ride history screen — shows past trips with filters.
class RideHistoryScreen extends StatefulWidget {
  const RideHistoryScreen({super.key});

  @override
  State<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends State<RideHistoryScreen> {
  String _filter = 'all';

  List<Map<String, dynamic>> get _rides {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    return [
      {
        'id': 'RIDE-4823',
        'date': '17 Jun 2026',
        'time': '10:30 AM',
        'pickup': 'Garden City Mall',
        'dropoff': 'City Centre',
        'fare': 650,
        'currency': currency,
        'vehicle': 'Comfort',
        'driverName': 'James M.',
        'rating': 4,
        'status': 'completed',
        'vendorName': 'SafeRide',
      },
      {
        'id': 'RIDE-4815',
        'date': '16 Jun 2026',
        'time': '6:15 PM',
        'pickup': 'Downtown Shopping Centre',
        'dropoff': 'Residential District',
        'fare': 420,
        'currency': currency,
        'vehicle': 'Economy',
        'driverName': 'Peter K.',
        'rating': 5,
        'status': 'completed',
        'vendorName': null,
      },
      {
        'id': 'RIDE-4790',
        'date': '15 Jun 2026',
        'time': '8:00 AM',
        'pickup': 'International Airport',
        'dropoff': 'Grand Hotel, CBD',
        'fare': 1200,
        'currency': currency,
        'vehicle': 'Premium',
        'driverName': 'Samuel O.',
        'rating': 5,
        'status': 'completed',
        'vendorName': 'SafeRide',
      },
      {
        'id': 'RIDE-4780',
        'date': '14 Jun 2026',
        'time': '3:45 PM',
        'pickup': 'Central Mall',
        'dropoff': 'Medical Centre',
        'fare': 0,
        'currency': currency,
        'vehicle': 'Economy',
        'driverName': null,
        'rating': null,
        'status': 'cancelled',
        'vendorName': null,
      },
      {
        'id': 'RIDE-4770',
        'date': '13 Jun 2026',
        'time': '7:20 AM',
        'pickup': 'Train Station',
        'dropoff': 'CBD, Main Street',
        'fare': 180,
        'currency': currency,
        'vehicle': 'Moto',
        'driverName': 'Otieno W.',
        'rating': 4,
        'status': 'completed',
        'vendorName': null,
      },
    ];
  }

  List<Map<String, dynamic>> get _filteredRides {
    if (_filter == 'all') return _rides;
    return _rides.where((r) => r['status'] == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'My Rides',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 20),
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _filterChip('All', 'all'),
                const SizedBox(width: 8),
                _filterChip('Completed', 'completed'),
                const SizedBox(width: 8),
                _filterChip('Cancelled', 'cancelled'),
              ],
            ),
          ),

          // Rides list
          Expanded(
            child: _filteredRides.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.directions_car_outlined, size: 64, color: Colors.grey[300]),
                        const SizedBox(height: 16),
                        Text('No rides found', style: TextStyle(color: Colors.grey[400], fontSize: 16)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredRides.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) => _rideCard(_filteredRides[index]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final isActive = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? Colors.black : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : Colors.grey[600],
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _rideCard(Map<String, dynamic> ride) {
    final isCancelled = ride['status'] == 'cancelled';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: vehicle + fare + date
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCancelled ? Colors.red[50] : Colors.grey[100],
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    ride['vehicle'],
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isCancelled ? Colors.red[700] : Colors.grey[700],
                    ),
                  ),
                ),
                if (ride['vendorName'] != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFFED7AA)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified, size: 10, color: Color(0xFFD97706)),
                        const SizedBox(width: 2),
                        Text(
                          ride['vendorName'],
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFFD97706)),
                        ),
                      ],
                    ),
                  ),
                ],
                const Spacer(),
                if (!isCancelled)
                  Text(
                    '${ride['currency']} ${ride['fare']}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.black),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(4)),
                    child: Text('Cancelled', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.red[700])),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Route
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(width: 10, height: 10, decoration: BoxDecoration(color: Colors.grey[400], shape: BoxShape.circle)),
                    Container(width: 1, height: 24, color: Colors.grey[300]),
                    Container(width: 10, height: 10, decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(2))),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ride['pickup'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 14),
                      Text(ride['dropoff'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Footer: date + driver + rating
            Row(
              children: [
                Icon(Icons.schedule, size: 14, color: Colors.grey[400]),
                const SizedBox(width: 4),
                Text('${ride['date']} • ${ride['time']}', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                const Spacer(),
                if (ride['driverName'] != null) ...[
                  Text(ride['driverName'], style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey[700])),
                  if (ride['rating'] != null) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.star, size: 12, color: Color(0xFFFBBF24)),
                    Text('${ride['rating']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  ],
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
