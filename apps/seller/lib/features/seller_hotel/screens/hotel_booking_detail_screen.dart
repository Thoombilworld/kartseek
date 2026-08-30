import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_event.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

/// Hotel Booking Detail Screen
///
/// When called with a booking argument → shows single booking detail.
/// When called without → shows 4-tab booking management list.
class HotelBookingDetailScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const HotelBookingDetailScreen(
      {super.key, this.order, this.appointment, this.booking});

  @override
  State<HotelBookingDetailScreen> createState() =>
      _HotelBookingDetailScreenState();
}

class _HotelBookingDetailScreenState extends State<HotelBookingDetailScreen>
    with SingleTickerProviderStateMixin {
  static const _hotelPurple = Color(0xFF8B5CF6);
  static const _hotelGold = Color(0xFFF59E0B);

  late TabController _tabCtrl;
  HotelBookingModel? _singleBooking;
  final _noteCtrl = TextEditingController();
  final _payCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);

    if (widget.booking is HotelBookingModel) {
      _singleBooking = widget.booking as HotelBookingModel;
      _noteCtrl.text = _singleBooking!.specialRequests ?? '';
    }

    final ss = context.read<SellerBloc>().state;
    context
        .read<HotelSellerBloc>()
        .add(LoadHotelBookings(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _noteCtrl.dispose();
    _payCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // If a single booking was passed, show the detail view
    if (_singleBooking != null) return _buildDetailView(context);

    return BlocListener<HotelSellerBloc, HotelSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (_, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: SellerTheme.successGreen,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<SellerBloc, dynamic>(
        builder: (context, ss) =>
            BlocBuilder<HotelSellerBloc, HotelSellerState>(
          builder: (context, state) {
            final all = state.bookings;
            final checkedIn =
                all.where((b) => b.status == 'checked_in').toList();
            final upcoming = all.where((b) => b.status == 'upcoming').toList();
            final checkedOut =
                all.where((b) => b.status == 'checked_out').toList();
            final cancelled =
                all.where((b) => b.status == 'cancelled').toList();

            return Scaffold(
              backgroundColor: SellerTheme.surface,
              appBar: AppBar(
                backgroundColor: _hotelPurple,
                foregroundColor: Colors.white,
                title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Bookings',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      Text('${all.length} total · ${checkedIn.length} in-house',
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white70)),
                    ]),
                bottom: TabBar(
                  controller: _tabCtrl,
                  indicatorColor: Colors.white,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white60,
                  labelStyle: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.bold),
                  tabs: [
                    _tab('In-House', checkedIn.length, _hotelPurple),
                    _tab('Upcoming', upcoming.length, SellerTheme.successGreen),
                    _tab('Checked Out', checkedOut.length,
                        SellerTheme.textMuted),
                    _tab('Cancelled', cancelled.length, SellerTheme.errorRed),
                  ],
                ),
              ),
              body: TabBarView(
                controller: _tabCtrl,
                children: [
                  _BookingList(bookings: checkedIn, tabType: 'checked_in'),
                  _BookingList(bookings: upcoming, tabType: 'upcoming'),
                  _BookingList(bookings: checkedOut, tabType: 'checked_out'),
                  _BookingList(bookings: cancelled, tabType: 'cancelled'),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Tab _tab(String label, int count, Color c) => Tab(
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$count', style: const TextStyle(fontSize: 9)),
            ),
          ],
        ]),
      );

  // ── Single Booking Detail ─────────────────────────────────────────────────

  Widget _buildDetailView(BuildContext context) {
    return BlocListener<HotelSellerBloc, HotelSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (_, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: SellerTheme.successGreen,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
          // Refresh local state
          final id = _singleBooking?.id;
          if (id != null) {
            final bloc = context.read<HotelSellerBloc>();
            final fresh = bloc.state.bookings.where((b) => b.id == id).toList();
            if (fresh.isNotEmpty && mounted) {
              setState(() => _singleBooking = fresh.first);
            }
          }
        }
      },
      child: BlocBuilder<SellerBloc, dynamic>(
        builder: (context, ss) {
          final cur = ss.country?.currencySymbol ?? 'AED';
          final b = _singleBooking!;
          final fmt = DateFormat('EEE, MMM d, yyyy');

          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: _hotelPurple,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Booking Detail',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(b.id,
                        style: const TextStyle(
                            fontSize: 11, color: Colors.white70)),
                  ]),
              actions: [
                Padding(
                  padding: const EdgeInsets.only(right: 14),
                  child: _statusChip(b.status),
                ),
              ],
            ),
            body: ListView(padding: const EdgeInsets.all(16), children: [
              // ── Hero stay card
              Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF8B5CF6), Color(0xFFA78BFA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                        color: _hotelPurple.withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 6))
                  ],
                ),
                padding: const EdgeInsets.all(20),
                child: Column(children: [
                  Row(children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14)),
                      child: const Center(
                          child: Text('🏨', style: TextStyle(fontSize: 28))),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text('${b.roomType} — Room ${b.roomNumber}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16)),
                          Text(
                              '${b.nights} night${b.nights > 1 ? 's' : ''} · ${b.adults} adult${b.adults > 1 ? 's' : ''}',
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 12)),
                        ])),
                  ]),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 14),
                    decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12)),
                    child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _heroPair('Check-in', fmt.format(b.checkIn)),
                          Container(
                              width: 1, height: 24, color: Colors.white30),
                          _heroPair('Check-out', fmt.format(b.checkOut)),
                          Container(
                              width: 1, height: 24, color: Colors.white30),
                          _heroPair('Total',
                              '$cur ${b.totalAmount.toStringAsFixed(0)}'),
                        ]),
                  ),
                ]),
              ),

              const SizedBox(height: 16),
              _buildTimeline(b.status),

              // Guest info
              const SizedBox(height: 14),
              _card(
                  '👤 Guest Information',
                  Column(children: [
                    _infoRow(Icons.person_outline, 'Guest', b.guestName),
                    if (b.guestPhone != null)
                      _infoRow(Icons.phone_outlined, 'Phone', b.guestPhone!),
                    if (b.guestEmail != null)
                      _infoRow(Icons.email_outlined, 'Email', b.guestEmail!),
                    if (b.guestNationality != null)
                      _infoRow(Icons.flag_outlined, 'Nationality',
                          b.guestNationality!),
                    _infoRow(Icons.king_bed_outlined, 'Room',
                        '${b.roomType} · Room ${b.roomNumber}'),
                    _infoRow(Icons.source_outlined, 'Platform',
                        b.platform ?? b.source),
                  ])),

              // Payment
              const SizedBox(height: 14),
              _card(
                  '💳 Payment',
                  Column(children: [
                    _summaryRow('Rate / Night',
                        '$cur ${b.pricePerNight.toStringAsFixed(0)}'),
                    _summaryRow('Duration', '${b.nights} nights'),
                    const Divider(height: 20),
                    _summaryRow(
                        'Total', '$cur ${b.totalAmount.toStringAsFixed(0)}',
                        bold: true, color: _hotelPurple),
                    _summaryRow(
                        'Paid',
                        b.isPaid
                            ? '$cur ${b.totalAmount.toStringAsFixed(0)} ✅'
                            : '⏳ Pending',
                        color: b.isPaid
                            ? SellerTheme.successGreen
                            : SellerTheme.warningAmber),
                    if (!b.isPaid) ...[
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(
                          child: TextField(
                            controller: _payCtrl,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: 'Enter amount received...',
                              prefixText: '$cur ',
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10)),
                              filled: true,
                              fillColor: SellerTheme.surface,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton(
                          onPressed: () {
                            final amt =
                                double.tryParse(_payCtrl.text.trim()) ?? 0;
                            if (amt > 0) {
                              context
                                  .read<HotelSellerBloc>()
                                  .add(MarkPaymentReceived(b.id, amt));
                              _payCtrl.clear();
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: SellerTheme.successGreen,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(
                                vertical: 12, horizontal: 14),
                            elevation: 0,
                          ),
                          child: const Text('Record',
                              style: TextStyle(fontSize: 12)),
                        ),
                      ]),
                    ],
                  ])),

              // Special requests
              const SizedBox(height: 14),
              _card(
                  '🛎 Special Requests',
                  Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (b.specialRequests != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: _hotelGold.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: _hotelGold.withValues(alpha: 0.3)),
                            ),
                            child: Row(children: [
                              const Text('⚠ ', style: TextStyle(fontSize: 14)),
                              Expanded(
                                  child: Text(b.specialRequests!,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          color: SellerTheme.textPrimary))),
                            ]),
                          ),
                        TextField(
                          controller: _noteCtrl,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'Add or update housekeeping notes...',
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10)),
                            filled: true,
                            fillColor: SellerTheme.surface,
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => context
                                .read<HotelSellerBloc>()
                                .add(AddSpecialRequest(
                                    b.id, _noteCtrl.text.trim())),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _hotelPurple,
                              side: BorderSide(
                                  color: _hotelPurple.withValues(alpha: 0.5)),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Save Request'),
                          ),
                        ),
                      ])),

              // Extend stay (checked-in only)
              if (b.status == 'checked_in') ...[
                const SizedBox(height: 14),
                _card(
                    '📅 Extend Stay',
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Add extra nights to current booking:',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: SellerTheme.textSecondary)),
                          const SizedBox(height: 10),
                          Row(children: [
                            for (final n in [1, 2, 3, 5, 7])
                              Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: OutlinedButton(
                                  onPressed: () => context
                                      .read<HotelSellerBloc>()
                                      .add(ExtendStay(b.id, n)),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: _hotelPurple,
                                    side: BorderSide(
                                        color: _hotelPurple.withValues(
                                            alpha: 0.5)),
                                    shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8)),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 8),
                                  ),
                                  child: Text('+${n}N',
                                      style: const TextStyle(fontSize: 11)),
                                ),
                              ),
                          ]),
                        ])),
              ],

              const SizedBox(height: 24),
              _buildActions(context, b),
              const SizedBox(height: 40),
            ]),
          );
        },
      ),
    );
  }

  Widget _buildActions(BuildContext context, HotelBookingModel b) {
    final bloc = context.read<HotelSellerBloc>();

    Widget bigBtn(String label, Color c, VoidCallback onTap) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                    backgroundColor: c,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0),
                child: Text(label,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14)),
              )),
        );

    if (b.status == 'upcoming') {
      return Column(children: [
        bigBtn('✅  Check In Guest', _hotelPurple, () {
          bloc.add(CheckInGuest(b.id));
          setState(() => _singleBooking = b.copyWith(status: 'checked_in'));
        }),
        bigBtn('❌  Cancel Booking', SellerTheme.errorRed,
            () => _cancelDialog(context, b)),
      ]);
    }
    if (b.status == 'checked_in') {
      return bigBtn('🚪  Check Out Guest', SellerTheme.infoBlue, () {
        bloc.add(CheckOutGuest(b.id));
        setState(() => _singleBooking = b.copyWith(status: 'checked_out'));
      });
    }
    if (b.status == 'checked_out') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: SellerTheme.successGreen.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: SellerTheme.successGreen.withValues(alpha: 0.3)),
        ),
        child: const Row(children: [
          Icon(Icons.check_circle, color: SellerTheme.successGreen),
          SizedBox(width: 10),
          Text('Checkout complete — room queued for housekeeping',
              style: TextStyle(
                  color: SellerTheme.successGreen,
                  fontWeight: FontWeight.bold)),
        ]),
      );
    }
    return const SizedBox.shrink();
  }

  void _cancelDialog(BuildContext context, HotelBookingModel b) {
    final reasons = [
      'Guest requested cancellation',
      'No-show — guest did not arrive',
      'Room unavailable due to maintenance',
      'Overbooking — system error',
      'Act of God / Emergency',
    ];
    int selected = 0;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Cancel Booking',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text('${b.guestName} · ${b.id}',
                    style: const TextStyle(
                        color: SellerTheme.textMuted, fontSize: 12)),
                const SizedBox(height: 14),
                ...reasons.asMap().entries.map((e) => GestureDetector(
                      onTap: () => setS(() => selected = e.key),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(children: [
                          Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: selected == e.key
                                      ? SellerTheme.errorRed
                                      : SellerTheme.border,
                                  width: 2),
                              color: selected == e.key
                                  ? SellerTheme.errorRed
                                  : Colors.transparent,
                            ),
                            child: selected == e.key
                                ? const Icon(Icons.check,
                                    size: 10, color: Colors.white)
                                : null,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                              child: Text(e.value,
                                  style: const TextStyle(fontSize: 13))),
                        ]),
                      ),
                    )),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: SellerTheme.errorRed,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0),
                    onPressed: () {
                      context
                          .read<HotelSellerBloc>()
                          .add(CancelHotelBooking(b.id, reasons[selected]));
                      setState(() =>
                          _singleBooking = b.copyWith(status: 'cancelled'));
                      Navigator.pop(ctx);
                    },
                    child: const Text('Confirm Cancellation',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
        ),
      ),
    );
  }

  Widget _buildTimeline(String status) {
    const steps = [
      ('upcoming', '📅', 'Booked'),
      ('checked_in', '🏨', 'Checked In'),
      ('checked_out', '🚪', 'Checked Out'),
    ];
    final idx = steps.indexWhere((s) => s.$1 == status);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.elevatedCard(),
      child: Row(
        children: List.generate(steps.length * 2 - 1, (i) {
          if (i.isOdd) {
            return Expanded(
                child: Container(
                    height: 2,
                    color: (i ~/ 2) < idx ? _hotelPurple : SellerTheme.border));
          }
          final si = i ~/ 2;
          final s = steps[si];
          final isDone = si < idx;
          final isActive = si == idx;
          final c = isDone || isActive ? _hotelPurple : SellerTheme.textMuted;
          return Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isDone
                    ? _hotelPurple
                    : isActive
                        ? _hotelPurple.withValues(alpha: 0.12)
                        : SellerTheme.surface,
                shape: BoxShape.circle,
                border: Border.all(
                    color:
                        isDone || isActive ? _hotelPurple : SellerTheme.border,
                    width: 2),
              ),
              child: Center(
                  child: isDone
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                      : Text(s.$2, style: const TextStyle(fontSize: 14))),
            ),
            const SizedBox(height: 4),
            Text(s.$3,
                style: TextStyle(
                    fontSize: 9,
                    color: c,
                    fontWeight:
                        isActive ? FontWeight.bold : FontWeight.normal)),
          ]);
        }),
      ),
    );
  }

  Widget _statusChip(String s) {
    final color = switch (s) {
      'checked_in' => SellerTheme.successGreen,
      'upcoming' => SellerTheme.infoBlue,
      'checked_out' => SellerTheme.textMuted,
      _ => SellerTheme.errorRed,
    };
    final label = switch (s) {
      'checked_in' => '✅ Checked In',
      'upcoming' => '📅 Upcoming',
      'checked_out' => '🚪 Checked Out',
      _ => '❌ Cancelled',
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(12)),
      child: Text(label,
          style: TextStyle(
              color: color, fontWeight: FontWeight.bold, fontSize: 11)),
    );
  }

  Widget _card(String title, Widget child) => Container(
        padding: const EdgeInsets.all(16),
        decoration: SellerTheme.elevatedCard(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          child,
        ]),
      );

  Widget _infoRow(IconData icon, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          Icon(icon, size: 16, color: SellerTheme.textMuted),
          const SizedBox(width: 10),
          Text('$label: ',
              style: const TextStyle(
                  color: SellerTheme.textSecondary, fontSize: 12)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 12),
                  overflow: TextOverflow.ellipsis)),
        ]),
      );

  Widget _summaryRow(String l, String v, {bool bold = false, Color? color}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child:
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(l,
              style: const TextStyle(
                  color: SellerTheme.textSecondary, fontSize: 12)),
          Text(v,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.w500,
                  fontSize: bold ? 15 : 12,
                  color: color ?? SellerTheme.textPrimary)),
        ]),
      );

  Widget _heroPair(String l, String v) => Column(children: [
        Text(l, style: const TextStyle(color: Colors.white60, fontSize: 10)),
        Text(v,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
            textAlign: TextAlign.center),
      ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking List Tab Widget
// ─────────────────────────────────────────────────────────────────────────────

class _BookingList extends StatelessWidget {
  final List<HotelBookingModel> bookings;
  final String tabType;
  const _BookingList({required this.bookings, required this.tabType});

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(tabType == 'checked_out' ? '🚪' : '🏨',
              style: const TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text(
            tabType == 'checked_in'
                ? 'No guests currently in-house'
                : tabType == 'upcoming'
                    ? 'No upcoming arrivals'
                    : tabType == 'checked_out'
                        ? 'No recent checkouts'
                        : 'No cancellations',
            style:
                const TextStyle(color: SellerTheme.textSecondary, fontSize: 14),
          ),
        ]),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: bookings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) => _BookingListCard(booking: bookings[i]),
    );
  }
}

class _BookingListCard extends StatelessWidget {
  final HotelBookingModel booking;
  const _BookingListCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final cur = ss.country.currencySymbol;
    final fmt = DateFormat('d MMM');
    final b = booking;

    final statusColor = switch (b.status) {
      'checked_in' => const Color(0xFF8B5CF6),
      'upcoming' => SellerTheme.successGreen,
      'checked_out' => SellerTheme.textMuted,
      _ => SellerTheme.errorRed,
    };

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, SellerRouter.hotelBookingDetail,
          arguments: b),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: SellerTheme.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2))
          ],
        ),
        padding: const EdgeInsets.all(13),
        child: Row(children: [
          // Room badge
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12)),
            child:
                Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('🛏', style: TextStyle(fontSize: 18)),
              Text('${b.roomNumber}',
                  style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: statusColor)),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Row(children: [
                  Expanded(
                      child: Text(b.guestName,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                          overflow: TextOverflow.ellipsis)),
                  if (b.guestNationality != null)
                    Text(b.guestNationality!,
                        style: const TextStyle(
                            color: SellerTheme.textMuted, fontSize: 10)),
                ]),
                Text('${b.roomType} · ${b.nights}N · ${b.adults} pax',
                    style: const TextStyle(
                        color: SellerTheme.textSecondary, fontSize: 11)),
                const SizedBox(height: 3),
                Row(children: [
                  const Icon(Icons.login_outlined,
                      size: 10, color: SellerTheme.textMuted),
                  const SizedBox(width: 3),
                  Text(fmt.format(b.checkIn),
                      style: const TextStyle(
                          fontSize: 10, color: SellerTheme.textMuted)),
                  const Text(' → ',
                      style: TextStyle(
                          fontSize: 10, color: SellerTheme.textMuted)),
                  const Icon(Icons.logout_outlined,
                      size: 10, color: SellerTheme.textMuted),
                  const SizedBox(width: 3),
                  Text(fmt.format(b.checkOut),
                      style: const TextStyle(
                          fontSize: 10, color: SellerTheme.textMuted)),
                ]),
                if (b.specialRequests != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text('⚠ ${b.specialRequests}',
                        style: const TextStyle(
                            color: SellerTheme.warningAmber, fontSize: 10),
                        overflow: TextOverflow.ellipsis),
                  ),
              ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('$cur ${b.totalAmount.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: Color(0xFF8B5CF6))),
            const SizedBox(height: 4),
            Row(children: [
              Icon(
                b.isPaid ? Icons.check_circle_outline : Icons.payment_outlined,
                size: 10,
                color: b.isPaid
                    ? SellerTheme.successGreen
                    : SellerTheme.warningAmber,
              ),
              const SizedBox(width: 3),
              Text(b.isPaid ? 'Paid' : 'Unpaid',
                  style: TextStyle(
                      fontSize: 9,
                      color: b.isPaid
                          ? SellerTheme.successGreen
                          : SellerTheme.warningAmber)),
            ]),
            const SizedBox(height: 4),
            if (b.platform != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                    color: SellerTheme.border,
                    borderRadius: BorderRadius.circular(4)),
                child: Text(b.platform!,
                    style: const TextStyle(
                        fontSize: 8, color: SellerTheme.textMuted)),
              ),
          ]),
        ]),
      ),
    );
  }
}
