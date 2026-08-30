import 'package:flutter/material.dart';

class HotelCancelModifyScreen extends StatefulWidget {
  final String bookingId;
  final String mode; // 'cancel' or 'modify'
  const HotelCancelModifyScreen({super.key, required this.bookingId, this.mode = 'cancel'});

  @override
  State<HotelCancelModifyScreen> createState() => _HotelCancelModifyScreenState();
}

class _HotelCancelModifyScreenState extends State<HotelCancelModifyScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _cancelReason;
  DateTime? _newCheckin;
  DateTime? _newCheckout;
  int _guests = 2;
  bool _isProcessing = false;

  final _cancelReasons = [
    'Change of plans',
    'Found a better deal',
    'Travel restrictions',
    'Medical emergency',
    'Work schedule change',
    'Other',
  ];

  // Mock booking data
  final _booking = {
    'id': 'HBK-A7B3C9',
    'hotelName': 'The Grand Palace Hotel',
    'roomName': 'Deluxe King Room',
    'checkin': '2026-07-15',
    'checkout': '2026-07-18',
    'guests': 2,
    'totalAmount': 1035,
    'currency': 'AED',
    'status': 'CONFIRMED',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this, initialIndex: widget.mode == 'modify' ? 1 : 0);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  double _calculateRefund() {
    final checkin = DateTime.parse(_booking['checkin'] as String);
    final hoursUntil = checkin.difference(DateTime.now()).inHours;
    final total = (_booking['totalAmount'] as int).toDouble();
    if (hoursUntil >= 48) return total;
    if (hoursUntil >= 24) return total * 0.75;
    if (hoursUntil >= 12) return total * 0.5;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text('Manage Booking', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.grey.shade900)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFE11D48),
          unselectedLabelColor: Colors.grey.shade500,
          indicatorColor: const Color(0xFFE11D48),
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          tabs: const [Tab(text: 'Cancel'), Tab(text: 'Modify')],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildCancelTab(), _buildModifyTab()],
      ),
    );
  }

  Widget _buildCancelTab() {
    final refund = _calculateRefund();
    final total = (_booking['totalAmount'] as int).toDouble();
    final refundPercent = total > 0 ? (refund / total * 100).round() : 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Booking Card
          _buildBookingCard(),
          const SizedBox(height: 20),

          // Refund Estimate
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFE11D48), Color(0xFFDB2777)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text('Estimated Refund', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('${_booking['currency']} ${refund.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text('$refundPercent% of total booking value', style: const TextStyle(color: Colors.white70, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Reason Selection
          Text('Reason for cancellation', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900)),
          const SizedBox(height: 12),
          ..._cancelReasons.map((reason) => GestureDetector(
            onTap: () => setState(() => _cancelReason = reason),
            child: Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _cancelReason == reason ? const Color(0xFFE11D48) : Colors.grey.shade200, width: _cancelReason == reason ? 2 : 1),
              ),
              child: Row(
                children: [
                  Container(
                    width: 20, height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: _cancelReason == reason ? const Color(0xFFE11D48) : Colors.grey.shade300, width: 2),
                      color: _cancelReason == reason ? const Color(0xFFE11D48) : Colors.transparent,
                    ),
                    child: _cancelReason == reason ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                  ),
                  const SizedBox(width: 12),
                  Text(reason, style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade800)),
                ],
              ),
            ),
          )),
          const SizedBox(height: 24),

          // Cancel Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _cancelReason != null && !_isProcessing ? () {
                setState(() => _isProcessing = true);
                Future.delayed(const Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() => _isProcessing = false);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Booking cancelled successfully'), backgroundColor: Color(0xFFE11D48)));
                    Navigator.of(context).pop();
                  }
                });
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                disabledBackgroundColor: Colors.grey.shade300,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isProcessing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Confirm Cancellation', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModifyTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildBookingCard(),
          const SizedBox(height: 20),

          Text('Change Dates', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900)),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(child: _buildDatePicker('Check-in', _newCheckin ?? DateTime.parse(_booking['checkin'] as String), (d) => setState(() => _newCheckin = d))),
              const SizedBox(width: 12),
              Expanded(child: _buildDatePicker('Check-out', _newCheckout ?? DateTime.parse(_booking['checkout'] as String), (d) => setState(() => _newCheckout = d))),
            ],
          ),
          const SizedBox(height: 20),

          Text('Number of Guests', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: _guests > 1 ? () => setState(() => _guests--) : null,
                  icon: Icon(Icons.remove_circle_outline, color: _guests > 1 ? const Color(0xFFE11D48) : Colors.grey.shade300),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text('$_guests', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: Colors.grey.shade900)),
                ),
                IconButton(
                  onPressed: _guests < 10 ? () => setState(() => _guests++) : null,
                  icon: Icon(Icons.add_circle_outline, color: _guests < 10 ? const Color(0xFFE11D48) : Colors.grey.shade300),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text('Special Requests', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900)),
          const SizedBox(height: 12),
          TextField(
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'e.g. Late checkout, extra pillows...',
              hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE11D48), width: 2)),
              filled: true, fillColor: Colors.white,
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: !_isProcessing ? () {
                setState(() => _isProcessing = true);
                Future.delayed(const Duration(seconds: 2), () {
                  if (mounted) {
                    setState(() => _isProcessing = false);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Booking modified successfully'), backgroundColor: Color(0xFF059669)));
                    Navigator.of(context).pop();
                  }
                });
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE11D48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isProcessing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_booking['hotelName'] as String, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                child: Text(_booking['status'] as String, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 10, color: Colors.green.shade700)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(_booking['roomName'] as String, style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade400),
              const SizedBox(width: 6),
              Text('${_booking['checkin']} → ${_booking['checkout']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
              const Spacer(),
              Text('${_booking['currency']} ${_booking['totalAmount']}', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Colors.grey.shade900)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDatePicker(String label, DateTime current, ValueChanged<DateTime> onChanged) {
    return GestureDetector(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: current,
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (context, child) => Theme(
            data: Theme.of(context).copyWith(colorScheme: const ColorScheme.light(primary: Color(0xFFE11D48))),
            child: child!,
          ),
        );
        if (picked != null) onChanged(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey.shade400)),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 8),
                Text('${current.year}-${current.month.toString().padLeft(2, '0')}-${current.day.toString().padLeft(2, '0')}',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.grey.shade800)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
