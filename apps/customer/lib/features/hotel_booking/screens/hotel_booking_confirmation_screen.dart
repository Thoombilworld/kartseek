import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Hotel Booking Confirmation Screen — Success state with booking details.
class HotelBookingConfirmationScreen extends StatelessWidget {
  final Map<String, dynamic> bookingData;
  const HotelBookingConfirmationScreen({super.key, required this.bookingData});

  static const _hotelColor = AppTheme.hotelColor;

  @override
  Widget build(BuildContext context) {
    final name = (bookingData['name'] ?? 'Hotel').toString();
    final city = (bookingData['city'] ?? '').toString();
    final bookingId = (bookingData['bookingId'] ?? 'BK-12345').toString();
    final totalValue = bookingData['total'];
    final total = totalValue is num ? totalValue : 0;
    final currency = (bookingData['currency'] ?? '\$').toString();
    final roomDataRaw = bookingData['selectedRoom'];
    final roomType = roomDataRaw is Map<String, dynamic>
        ? (roomDataRaw['type'] ?? 'Standard Room').toString()
        : (bookingData['roomType'] ?? 'Standard Room').toString();
    final guestName = (bookingData['guestName'] ?? 'Guest').toString();

    // Dynamic dates (L1 fix)
    final dateFormat = DateFormat('MMM d, yyyy');
    final ciStr = bookingData['checkin']?.toString();
    final coStr = bookingData['checkout']?.toString();
    final nightsValue = bookingData['nights'];
    final checkIn = ciStr != null ? DateTime.tryParse(ciStr) : null;
    final checkOut = coStr != null ? DateTime.tryParse(coStr) : null;
    final checkinDisplay = checkIn != null ? '${dateFormat.format(checkIn)} • 2:00 PM' : 'Check-in confirmed';
    final checkoutDisplay = checkOut != null ? '${dateFormat.format(checkOut)} • 12:00 PM' : 'Check-out confirmed';
    final nights = nightsValue is int
        ? nightsValue
        : (checkIn != null && checkOut != null ? checkOut.difference(checkIn).inDays : 2);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const SizedBox(height: 30),

            // ── Success Animation ──
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: const Color(0xFF10B981).withValues(alpha: 0.3), blurRadius: 30)],
              ),
              child: const Icon(Icons.check, color: Colors.white, size: 50),
            ),
            const SizedBox(height: 24),
            const Text('Booking Confirmed!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            const SizedBox(height: 6),
            Text('Your reservation has been confirmed', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),

            const SizedBox(height: 30),

            // ── Booking Card ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 4))],
              ),
              child: Column(children: [
                // Hotel icon
                Container(
                  width: 60, height: 60,
                  decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.hotel, color: _hotelColor, size: 30),
                ),
                const SizedBox(height: 12),
                Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                Text(city, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),

                const SizedBox(height: 16),
                Container(width: double.infinity, height: 1, color: const Color(0xFFF1F5F9)),
                const SizedBox(height: 16),

                // Booking ID
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFBBF7D0))),
                  child: Row(children: [
                    const Icon(Icons.confirmation_number, color: Color(0xFF10B981), size: 20),
                    const SizedBox(width: 10),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Booking ID', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                      Text(bookingId, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF166534), letterSpacing: 1)),
                    ]),
                  ]),
                ),

                const SizedBox(height: 16),

                _detailRow(Icons.person, 'Guest', guestName),
                _detailRow(Icons.king_bed, 'Room', roomType),
                _detailRow(Icons.calendar_today, 'Check-in', checkinDisplay),
                _detailRow(Icons.calendar_today, 'Check-out', checkoutDisplay),
                _detailRow(Icons.nights_stay, 'Duration', '$nights ${nights == 1 ? 'Night' : 'Nights'}'),

                const SizedBox(height: 14),
                Container(width: double.infinity, height: 1, color: const Color(0xFFF1F5F9)),
                const SizedBox(height: 14),

                Row(children: [
                  const Text('Total Paid', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                  const Spacer(),
                  Text('$currency $total', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                ]),
              ]),
            ),

            const SizedBox(height: 20),

            // ── Quick Actions ──
            Row(children: [
              Expanded(child: _actionButton(Icons.calendar_month, 'Add to\nCalendar', () {})),
              const SizedBox(width: 10),
              Expanded(child: _actionButton(Icons.share, 'Share\nDetails', () {})),
              const SizedBox(width: 10),
              Expanded(child: _actionButton(Icons.phone, 'Contact\nHotel', () {})),
            ]),

            const SizedBox(height: 24),

            // ── Navigation ──
            SizedBox(width: double.infinity, child: ElevatedButton(
              onPressed: () => Navigator.popUntil(context, (route) => route.isFirst),
              style: ElevatedButton.styleFrom(backgroundColor: _hotelColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            )),
            const SizedBox(height: 10),
            SizedBox(width: double.infinity, child: OutlinedButton(
              onPressed: () => Navigator.pushNamedAndRemoveUntil(context, CustomerRouter.hotelBooking, (route) => route.isFirst),
              style: OutlinedButton.styleFrom(foregroundColor: _hotelColor, side: const BorderSide(color: _hotelColor), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              child: const Text('Browse More Hotels', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            )),

            const SizedBox(height: 30),
          ]),
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      Icon(icon, size: 16, color: const Color(0xFF64748B)),
      const SizedBox(width: 10),
      Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
      const Spacer(),
      Flexible(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)), textAlign: TextAlign.end)),
    ]),
  );

  Widget _actionButton(IconData icon, String label, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)]),
      child: Column(children: [
        Icon(icon, color: _hotelColor, size: 22),
        const SizedBox(height: 6),
        Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
      ]),
    ),
  );
}
