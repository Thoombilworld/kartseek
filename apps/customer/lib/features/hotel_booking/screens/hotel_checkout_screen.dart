import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Hotel Checkout Screen — Guest details, date selection, room summary, payment.
class HotelCheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> bookingData;
  const HotelCheckoutScreen({super.key, required this.bookingData});

  @override
  State<HotelCheckoutScreen> createState() => _HotelCheckoutScreenState();
}

class _HotelCheckoutScreenState extends State<HotelCheckoutScreen> {
  final _nameController = TextEditingController(text: 'John Doe');
  final _emailController = TextEditingController(text: 'john@example.com');
  final _phoneController = TextEditingController(text: '+971 50 123 4567');
  final _promoController = TextEditingController();
  String _paymentMethod = 'card';
  bool _promoApplied = false;
  late DateTime _checkIn;
  late DateTime _checkOut;
  static const _hotelColor = AppTheme.hotelColor;
  final _dateFormat = DateFormat('MMM d, yyyy');

  @override
  void initState() {
    super.initState();
    // Try to get dates from booking data, or default to tomorrow + 2 nights
    final ciStr = widget.bookingData['checkin']?.toString();
    final coStr = widget.bookingData['checkout']?.toString();
    final now = DateTime.now();
    _checkIn = ciStr != null ? (DateTime.tryParse(ciStr) ?? now.add(const Duration(days: 1))) : now.add(const Duration(days: 1));
    _checkOut = coStr != null ? (DateTime.tryParse(coStr) ?? _checkIn.add(const Duration(days: 2))) : _checkIn.add(const Duration(days: 2));
    if (!_checkOut.isAfter(_checkIn)) _checkOut = _checkIn.add(const Duration(days: 1));
  }

  @override
  void dispose() { _nameController.dispose(); _emailController.dispose(); _phoneController.dispose(); _promoController.dispose(); super.dispose(); }

  int get _nights => _checkOut.difference(_checkIn).inDays.clamp(1, 365);

  Future<void> _pickDate({required bool isCheckIn}) async {
    final initial = isCheckIn ? _checkIn : _checkOut;
    final first = isCheckIn ? DateTime.now() : _checkIn.add(const Duration(days: 1));
    final last = DateTime.now().add(const Duration(days: 365));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: last,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: _hotelColor, onPrimary: Colors.white, onSurface: Color(0xFF0F172A)),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          _checkIn = picked;
          if (!_checkOut.isAfter(_checkIn)) _checkOut = _checkIn.add(const Duration(days: 1));
        } else {
          _checkOut = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final hotel = widget.bookingData;
    final name = (hotel['name'] ?? 'Hotel').toString();
    final roomDataRaw = hotel['selectedRoom'];
    final roomData = roomDataRaw is Map<String, dynamic> ? roomDataRaw : <String, dynamic>{};
    final roomType = (roomData['type'] ?? 'Standard Room').toString();
    final priceValue = hotel['roomPrice'] ?? hotel['price'];
    final price = priceValue is num ? priceValue.toInt() : 100;
    final currency = (hotel['currency'] ?? '\$').toString();
    final nights = _nights;
    final subtotal = price * nights;
    final tax = (subtotal * 0.1).round();
    final serviceFee = (subtotal * 0.05).round();
    final promoDiscount = _promoApplied ? (subtotal * 0.15).round() : 0;
    final total = subtotal + tax + serviceFee - promoDiscount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('Checkout', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // ── Room Summary ──
          _card([
            Row(children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.hotel, color: _hotelColor, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Text(roomType, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                Text('$nights ${nights == 1 ? 'night' : 'nights'}  •  $currency $price/night', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              ])),
            ]),
          ]),

          const SizedBox(height: 12),

          // ── Date Selection (L1/L2 fix) ──
          _card([
            const Text('Travel Dates', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _dateButton('Check-in', _checkIn, () => _pickDate(isCheckIn: true))),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
                child: Text('$nights ${nights == 1 ? 'night' : 'nights'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: _hotelColor)),
              ),
              const SizedBox(width: 12),
              Expanded(child: _dateButton('Check-out', _checkOut, () => _pickDate(isCheckIn: false))),
            ]),
          ]),

          const SizedBox(height: 12),

          // ── Guest Details ──
          _card([
            const Text('Guest Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            _inputField('Full Name', _nameController, Icons.person),
            _inputField('Email', _emailController, Icons.email),
            _inputField('Phone', _phoneController, Icons.phone),
          ]),

          const SizedBox(height: 12),

          // ── Payment Method ──
          _card([
            const Text('Payment Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            _paymentOption('card', 'Credit / Debit Card', Icons.credit_card, '**** 4242'),
            _paymentOption('wallet', 'KARTSEEK Wallet', Icons.account_balance_wallet, 'Balance: $currency 2,500'),
            _paymentOption('upi', 'UPI / Bank Transfer', Icons.account_balance, 'Pay via bank'),
          ]),

          const SizedBox(height: 12),

          // ── Promo Code ──
          _card([
            const Text('Promo Code', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(
                controller: _promoController,
                decoration: InputDecoration(
                  hintText: 'Enter code', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                  filled: true, fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              )),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => setState(() => _promoApplied = _promoController.text.isNotEmpty),
                style: ElevatedButton.styleFrom(backgroundColor: _hotelColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                child: const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ]),
            if (_promoApplied) Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(children: [
                const Icon(Icons.check_circle, size: 14, color: Color(0xFF10B981)),
                const SizedBox(width: 4),
                Text('15% discount applied! (-$currency $promoDiscount)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF10B981))),
              ]),
            ),
          ]),

          const SizedBox(height: 12),

          // ── Price Breakdown ──
          _card([
            const Text('Price Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),
            _priceRow('$roomType × $nights ${nights == 1 ? 'night' : 'nights'}', '$currency $subtotal'),
            _priceRow('Tax (10%)', '$currency $tax'),
            _priceRow('Service Fee', '$currency $serviceFee'),
            if (_promoApplied) _priceRow('Promo Discount', '-$currency $promoDiscount', isDiscount: true),
            const Divider(height: 20),
            Row(children: [
              const Text('Total', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              const Spacer(),
              Text('$currency $total', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            ]),
          ]),

          const SizedBox(height: 20),

          // ── Confirm Button ──
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () {
              final confirmationArgs = <String, dynamic>{
                'name': name,
                'city': (hotel['city'] ?? '').toString(),
                'currency': currency,
                'total': total,
                'bookingId': 'BK-${DateTime.now().millisecondsSinceEpoch}',
                'guestName': _nameController.text,
                'paymentMethod': _paymentMethod,
                'roomType': roomType,
                'checkin': _checkIn.toIso8601String(),
                'checkout': _checkOut.toIso8601String(),
                'nights': nights,
              };
              Navigator.pushNamed(context, CustomerRouter.hotelConfirmation, arguments: confirmationArgs);
            },
            style: ElevatedButton.styleFrom(backgroundColor: _hotelColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: Text('Confirm & Pay $currency $total', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          )),

          const SizedBox(height: 30),
        ]),
      ),
    );
  }

  Widget _dateButton(String label, DateTime date, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.calendar_today, size: 14, color: _hotelColor),
            const SizedBox(width: 6),
            Flexible(child: Text(_dateFormat.format(date), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)))),
          ]),
        ]),
      ),
    );
  }

  Widget _paymentOption(String id, String label, IconData icon, String sub) {
    final selected = _paymentMethod == id;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? _hotelColor.withValues(alpha: 0.05) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? _hotelColor : const Color(0xFFE2E8F0)),
        ),
        child: Row(children: [
          Icon(icon, color: selected ? _hotelColor : const Color(0xFF64748B), size: 20),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
            Text(sub, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
          ])),
          Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? _hotelColor : const Color(0xFFE2E8F0), size: 20),
        ]),
      ),
    );
  }

  Widget _card(List<Widget> children) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
  );

  Widget _inputField(String label, TextEditingController ctrl, IconData icon) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label, labelStyle: TextStyle(fontSize: 13, color: Colors.grey.shade500),
        prefixIcon: Icon(icon, size: 18, color: _hotelColor),
        filled: true, fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
      ),
    ),
  );

  Widget _priceRow(String label, String amount, {bool isDiscount = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
      const Spacer(),
      Text(amount, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: isDiscount ? const Color(0xFF10B981) : const Color(0xFF0F172A))),
    ]),
  );
}
