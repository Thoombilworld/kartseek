import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_event.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_state.dart';

class HotelMyBookingsScreen extends StatefulWidget {
  const HotelMyBookingsScreen({super.key});

  @override
  State<HotelMyBookingsScreen> createState() => _HotelMyBookingsScreenState();
}

class _HotelMyBookingsScreenState extends State<HotelMyBookingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Fallback data if API returns empty
  static const _fallbackUpcoming = <Map<String, dynamic>>[
    {'id': 'HBK-A7B3C9', 'hotelName': 'The Grand Palace Hotel', 'roomType': 'Deluxe King Room', 'city': 'Dubai, UAE', 'checkin': '2026-07-15', 'checkout': '2026-07-18', 'nights': 3, 'status': 'CONFIRMED', 'total': 'AED 1,551', 'emoji': '🏰', 'confirmationCode': 'KS-A7B3C9'},
    {'id': 'HBK-D4E5F6', 'hotelName': 'Seaside Family Resort', 'roomType': 'Family Suite', 'city': 'Mumbai, India', 'checkin': '2026-08-10', 'checkout': '2026-08-14', 'nights': 4, 'status': 'CONFIRMED', 'total': '₹ 43,120', 'emoji': '🏖️', 'confirmationCode': 'KS-D4E5F6'},
  ];
  static const _fallbackPast = <Map<String, dynamic>>[
    {'id': 'HBK-G7H8I9', 'hotelName': 'Heritage Boutique Hotel', 'roomType': 'Premium Twin Room', 'city': 'London, UK', 'checkin': '2026-03-05', 'checkout': '2026-03-08', 'nights': 3, 'status': 'COMPLETED', 'total': '£ 1,104', 'emoji': '🏛️', 'confirmationCode': 'KS-G7H8I9', 'hasReview': true},
    {'id': 'HBK-J1K2L3', 'hotelName': 'KARTSEEK Business Suites', 'roomType': 'Executive Suite', 'city': 'Doha, Qatar', 'checkin': '2026-01-15', 'checkout': '2026-01-17', 'nights': 2, 'status': 'COMPLETED', 'total': 'QAR 1,954', 'emoji': '🏢', 'confirmationCode': 'KS-J1K2L3', 'hasReview': false},
    {'id': 'HBK-M4N5O6', 'hotelName': 'Budget Inn Express', 'roomType': 'Standard Room', 'city': 'Riyadh, KSA', 'checkin': '2025-12-20', 'checkout': '2025-12-22', 'nights': 2, 'status': 'CANCELLED', 'total': 'SAR 276', 'emoji': '🏨', 'confirmationCode': 'KS-M4N5O6', 'hasReview': false},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Dispatch API call for user bookings (L3 fix)
    context.read<HotelBloc>().add(const LoadMyBookings());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'CONFIRMED':
        return const Color(0xFF059669);
      case 'COMPLETED':
        return const Color(0xFF2563EB);
      case 'CANCELLED':
        return const Color(0xFFDC2626);
      case 'CHECKED_IN':
        return const Color(0xFFF59E0B);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('My Bookings',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFE11D48),
          unselectedLabelColor: const Color(0xFF94A3B8),
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          indicatorColor: const Color(0xFFE11D48),
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Past'),
          ],
        ),
      ),
      body: BlocBuilder<HotelBloc, HotelState>(
        builder: (context, state) {
          final allBookings = state.myBookings;
          final upcoming = allBookings.isNotEmpty
              ? allBookings.where((b) => b['status'] == 'CONFIRMED' || b['status'] == 'CHECKED_IN').toList()
              : List<Map<String, dynamic>>.from(_fallbackUpcoming);
          final past = allBookings.isNotEmpty
              ? allBookings.where((b) => b['status'] == 'COMPLETED' || b['status'] == 'CANCELLED').toList()
              : List<Map<String, dynamic>>.from(_fallbackPast);

          if (state.status == HotelStatus.loading) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFFE11D48)));
          }

          return TabBarView(
            controller: _tabController,
            children: [
              _buildBookingList(upcoming, isUpcoming: true),
              _buildBookingList(past, isUpcoming: false),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBookingList(List<Map<String, dynamic>> bookings,
      {required bool isUpcoming}) {
    if (bookings.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(isUpcoming ? '🏨' : '📋',
                style: const TextStyle(fontSize: 56)),
            const SizedBox(height: 16),
            Text(
              isUpcoming ? 'No upcoming bookings' : 'No past bookings',
              style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            Text(
              isUpcoming
                  ? 'Search for hotels to plan your next trip!'
                  : 'Your completed stays will appear here.',
              style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: bookings.length,
      itemBuilder: (context, index) {
        final booking = bookings[index];
        return _buildBookingCard(booking, isUpcoming: isUpcoming);
      },
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking,
      {required bool isUpcoming}) {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFFFF1F2), Color(0xFFFEF3C7)],
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Text(booking['emoji'], style: const TextStyle(fontSize: 36)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(booking['hotelName'],
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 2),
                      Text('${booking['city']} · ${booking['roomType']}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor(booking['status']).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    booking['status'],
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: _statusColor(booking['status']),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    _infoItem('Check-in', booking['checkin']),
                    Container(
                        width: 1, height: 30, color: const Color(0xFFE2E8F0)),
                    _infoItem('Check-out', booking['checkout']),
                    Container(
                        width: 1, height: 30, color: const Color(0xFFE2E8F0)),
                    _infoItem('Nights', '${booking['nights']}'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Confirmation: ${booking['confirmationCode']}',
                        style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600)),
                    Text(booking['total'],
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A))),
                  ],
                ),
              ],
            ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              children: [
                if (isUpcoming) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {},
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFDC2626),
                        side: const BorderSide(color: Color(0xFFFECACA)),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE11D48),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: const Text('View Details',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ] else ...[
                  if (booking['status'] == 'COMPLETED' &&
                      booking['hasReview'] == false)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.star_border, size: 16),
                        label: const Text('Write Review',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFF59E0B),
                          side: const BorderSide(color: Color(0xFFFDE68A)),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  if (booking['status'] == 'COMPLETED' &&
                      booking['hasReview'] == false)
                    const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(
                          booking['status'] == 'COMPLETED'
                              ? 'Rebook'
                              : 'View Details',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoItem(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF94A3B8),
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}
