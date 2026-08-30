import 'package:flutter/material.dart';

class HotelGuestCheckinScreen extends StatefulWidget {
  const HotelGuestCheckinScreen({super.key});

  @override
  State<HotelGuestCheckinScreen> createState() =>
      _HotelGuestCheckinScreenState();
}

class _HotelGuestCheckinScreenState extends State<HotelGuestCheckinScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _arrivingToday = [
    {
      'guestName': 'Sarah Al Maktoum',
      'roomType': 'Deluxe King Room',
      'roomNumber': '405',
      'bookingId': 'HBK-A7B3C9',
      'checkoutDate': '2026-07-18',
      'adults': 2,
      'children': 0,
      'status': 'pending',
      'specialRequests': 'Late check-in (8 PM), extra pillows',
      'isVip': true,
    },
    {
      'guestName': 'James Clarke',
      'roomType': 'Executive Suite',
      'roomNumber': '812',
      'bookingId': 'HBK-D4E5F6',
      'checkoutDate': '2026-07-20',
      'adults': 1,
      'children': 0,
      'status': 'pending',
      'specialRequests': 'High floor, non-smoking',
      'isVip': false,
    },
    {
      'guestName': 'Priya Sharma',
      'roomType': 'Family Suite',
      'roomNumber': '604',
      'bookingId': 'HBK-G7H8I9',
      'checkoutDate': '2026-07-19',
      'adults': 2,
      'children': 2,
      'status': 'checked_in',
      'specialRequests': 'Baby crib, connecting rooms if possible',
      'isVip': false,
    },
  ];

  final List<Map<String, dynamic>> _departingToday = [
    {
      'guestName': 'Ahmed Al Thani',
      'roomType': 'Premium Twin Room',
      'roomNumber': '302',
      'bookingId': 'HBK-J1K2L3',
      'checkinDate': '2026-07-12',
      'adults': 2,
      'children': 0,
      'status': 'checked_in',
      'minibar': 'AED 85',
      'extraCharges': 'AED 150',
      'isVip': true,
    },
    {
      'guestName': 'Maria Gonzalez',
      'roomType': 'Standard Room',
      'roomNumber': '211',
      'bookingId': 'HBK-M4N5O6',
      'checkinDate': '2026-07-13',
      'adults': 1,
      'children': 0,
      'status': 'checked_in',
      'minibar': 'AED 0',
      'extraCharges': 'AED 0',
      'isVip': false,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _handleCheckin(Map<String, dynamic> guest) {
    setState(() {
      guest['status'] = 'checked_in';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${guest['guestName']} checked in to Room ${guest['roomNumber']}'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  void _handleCheckout(Map<String, dynamic> guest) {
    setState(() {
      guest['status'] = 'checked_out';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${guest['guestName']} checked out from Room ${guest['roomNumber']}'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: const Color(0xFF2563EB),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Guest Check-in/out',
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
          tabs: [
            Tab(text: 'Arriving (${_arrivingToday.where((g) => g['status'] == 'pending').length})'),
            Tab(text: 'Departing (${_departingToday.where((g) => g['status'] == 'checked_in').length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildArrivalsList(),
          _buildDeparturesList(),
        ],
      ),
    );
  }

  Widget _buildArrivalsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _arrivingToday.length,
      itemBuilder: (context, index) {
        final guest = _arrivingToday[index];
        return _buildArrivalCard(guest);
      },
    );
  }

  Widget _buildDeparturesList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _departingToday.length,
      itemBuilder: (context, index) {
        final guest = _departingToday[index];
        return _buildDepartureCard(guest);
      },
    );
  }

  Widget _buildArrivalCard(Map<String, dynamic> guest) {
    final isCheckedIn = guest['status'] == 'checked_in';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isCheckedIn
            ? Border.all(color: const Color(0xFF059669), width: 1.5)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: const Color(0xFFFFF1F2),
                  child: Text(
                    guest['guestName'].toString().substring(0, 1),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: Color(0xFFE11D48)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(guest['guestName'],
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 15)),
                          if (guest['isVip'])
                            Container(
                              margin: const EdgeInsets.only(left: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('VIP',
                                  style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFFF59E0B))),
                            ),
                        ],
                      ),
                      Text('${guest['roomType']} · Room ${guest['roomNumber']}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF94A3B8))),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCheckedIn
                        ? const Color(0xFFF0FDF4)
                        : const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isCheckedIn ? 'Checked In' : 'Arriving',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: isCheckedIn
                          ? const Color(0xFF059669)
                          : const Color(0xFFF59E0B),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Info row
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  _miniInfo('Guests',
                      '${guest['adults']}A${guest['children'] > 0 ? ' + ${guest['children']}C' : ''}'),
                  _miniInfo('Checkout', guest['checkoutDate']),
                  _miniInfo('Booking', guest['bookingId']),
                ],
              ),
            ),

            if (guest['specialRequests'] != null &&
                guest['specialRequests'].toString().isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline,
                        size: 14, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        guest['specialRequests'],
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFF92400E)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (!isCheckedIn) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _handleCheckin(guest),
                  icon: const Icon(Icons.login, size: 18),
                  label: const Text('Check In Guest',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDepartureCard(Map<String, dynamic> guest) {
    final isCheckedOut = guest['status'] == 'checked_out';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isCheckedOut
            ? Border.all(color: const Color(0xFF2563EB), width: 1.5)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: const Color(0xFFEFF6FF),
                  child: Text(
                    guest['guestName'].toString().substring(0, 1),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: Color(0xFF2563EB)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(guest['guestName'],
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 15)),
                          if (guest['isVip'])
                            Container(
                              margin: const EdgeInsets.only(left: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('VIP',
                                  style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFFF59E0B))),
                            ),
                        ],
                      ),
                      Text('${guest['roomType']} · Room ${guest['roomNumber']}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF94A3B8))),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCheckedOut
                        ? const Color(0xFFEFF6FF)
                        : const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isCheckedOut ? 'Checked Out' : 'In Hotel',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: isCheckedOut
                          ? const Color(0xFF2563EB)
                          : const Color(0xFFE11D48),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  _miniInfo('Minibar', guest['minibar']),
                  _miniInfo('Extras', guest['extraCharges']),
                  _miniInfo('Booking', guest['bookingId']),
                ],
              ),
            ),

            if (!isCheckedOut) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _handleCheckout(guest),
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Check Out Guest',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _miniInfo(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF94A3B8),
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
