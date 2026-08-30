import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_event.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Hotel Availability Calendar Screen
///
/// 3-panel layout:
///   1. Month navigator with day grid
///   2. Selected date action panel (block/unblock, block range)
///   3. Legend + upcoming events list
class HotelAvailabilityCalendarScreen extends StatefulWidget {
  const HotelAvailabilityCalendarScreen({super.key});

  @override
  State<HotelAvailabilityCalendarScreen> createState() =>
      _HotelAvailabilityCalendarScreenState();
}

class _HotelAvailabilityCalendarScreenState
    extends State<HotelAvailabilityCalendarScreen> {
  static const _hotelPurple = Color(0xFF8B5CF6);
  static const _hotelGold = Color(0xFFF59E0B);

  DateTime _focusMonth = DateTime.now();
  DateTime? _selectedDate;
  DateTime? _rangeStart;
  bool _rangeMode = false;

  @override
  void initState() {
    super.initState();
    final ss = context.read<SellerBloc>().state;
    context
        .read<HotelSellerBloc>()
        .add(LoadHotelAvailability(countryCode: ss.countryCode));
  }

  @override
  Widget build(BuildContext context) {
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
          setState(() {
            _rangeStart = null;
          });
        }
      },
      child: BlocBuilder<SellerBloc, dynamic>(
        builder: (context, ss) =>
            BlocBuilder<HotelSellerBloc, HotelSellerState>(
          builder: (context, state) {
            final config = HotelCountryConfig(state.countryCode);
            final blocked = state.blockedDates;

            return Scaffold(
              backgroundColor: SellerTheme.surface,
              appBar: AppBar(
                backgroundColor: _hotelPurple,
                foregroundColor: Colors.white,
                title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Availability Calendar',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      Text(config.hotelName,
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white70),
                          overflow: TextOverflow.ellipsis),
                    ]),
                actions: [
                  // Range mode toggle
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Text('Range',
                          style:
                              TextStyle(color: Colors.white70, fontSize: 11)),
                      Switch(
                        value: _rangeMode,
                        onChanged: (v) => setState(() {
                          _rangeMode = v;
                          _rangeStart = null;
                        }),
                        activeThumbColor: _hotelGold,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ]),
                  ),
                ],
              ),
              body: SingleChildScrollView(
                padding: const EdgeInsets.all(14),
                child: Column(children: [
                  _buildMonthNavigator(),
                  const SizedBox(height: 10),
                  _buildCalendar(blocked),
                  const SizedBox(height: 14),
                  _buildLegend(),
                  const SizedBox(height: 14),
                  if (_selectedDate != null)
                    _buildSelectedPanel(context, state, blocked),
                  const SizedBox(height: 14),
                  _buildStats(state, blocked),
                  const SizedBox(height: 14),
                  _buildSeasonalActions(context),
                  const SizedBox(height: 14),
                  _buildBlockedList(blocked),
                  const SizedBox(height: 80),
                ]),
              ),
            );
          },
        ),
      ),
    );
  }

  // ── Month navigator ────────────────────────────────────────────────────────

  Widget _buildMonthNavigator() {
    return Row(children: [
      IconButton(
        icon: const Icon(Icons.chevron_left, color: _hotelPurple),
        onPressed: () => setState(() =>
            _focusMonth = DateTime(_focusMonth.year, _focusMonth.month - 1)),
      ),
      Expanded(
        child: Text(
          DateFormat('MMMM yyyy').format(_focusMonth),
          textAlign: TextAlign.center,
          style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.bold, color: _hotelPurple),
        ),
      ),
      IconButton(
        icon: const Icon(Icons.chevron_right, color: _hotelPurple),
        onPressed: () => setState(() =>
            _focusMonth = DateTime(_focusMonth.year, _focusMonth.month + 1)),
      ),
    ]);
  }

  // ── Calendar grid ──────────────────────────────────────────────────────────

  Widget _buildCalendar(Set<DateTime> blocked) {
    final firstDay = DateTime(_focusMonth.year, _focusMonth.month, 1);
    final daysInMonth =
        DateTime(_focusMonth.year, _focusMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday % 7; // Sun=0..Sat=6
    final cells = startWeekday + daysInMonth;
    final rows = (cells / 7).ceil();

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(12),
      child: Column(children: [
        // Day-of-week header
        Row(
          children: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
              .map((d) => Expanded(
                    child: Center(
                      child: Text(d,
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: SellerTheme.textMuted)),
                    ),
                  ))
              .toList(),
        ),
        const SizedBox(height: 6),
        ...List.generate(rows, (row) {
          return Row(
            children: List.generate(7, (col) {
              final cell = row * 7 + col;
              final day = cell - startWeekday + 1;
              if (day < 1 || day > daysInMonth) {
                return const Expanded(child: SizedBox());
              }

              final date = DateTime(_focusMonth.year, _focusMonth.month, day);
              final normDate = DateTime(date.year, date.month, date.day);
              final today = DateTime.now();
              final normToday = DateTime(today.year, today.month, today.day);
              final isToday = normDate == normToday;
              final isBlocked = blocked.any((b) =>
                  b.year == date.year &&
                  b.month == date.month &&
                  b.day == date.day);
              final isSelected = _selectedDate != null &&
                  _selectedDate!.year == date.year &&
                  _selectedDate!.month == date.month &&
                  _selectedDate!.day == date.day;
              final isRangeStart = _rangeStart != null &&
                  _rangeStart!.year == date.year &&
                  _rangeStart!.month == date.month &&
                  _rangeStart!.day == date.day;
              final isPast = date.isBefore(normToday);

              Color? bg;
              Color textColor;
              if (isSelected || isRangeStart) {
                bg = _hotelPurple;
                textColor = Colors.white;
              } else if (isBlocked) {
                bg = SellerTheme.errorRed.withValues(alpha: 0.15);
                textColor = SellerTheme.errorRed;
              } else if (isToday) {
                bg = _hotelGold.withValues(alpha: 0.15);
                textColor = _hotelGold;
              } else if (isPast) {
                bg = null;
                textColor = SellerTheme.textMuted;
              } else {
                bg = SellerTheme.successGreen.withValues(alpha: 0.08);
                textColor = SellerTheme.successGreen;
              }

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(2),
                  child: GestureDetector(
                    onTap: isPast ? null : () => _onTapDate(date),
                    child: Container(
                      height: 36,
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(8),
                        border: isToday
                            ? Border.all(color: _hotelGold, width: 1.5)
                            : isSelected
                                ? Border.all(color: _hotelPurple, width: 1.5)
                                : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$day',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: isToday || isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: textColor),
                          ),
                          if (isBlocked)
                            const Text('🚫', style: TextStyle(fontSize: 6))
                          else if (isToday)
                            Container(
                                width: 4,
                                height: 4,
                                decoration: const BoxDecoration(
                                    color: _hotelGold, shape: BoxShape.circle)),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          );
        }),
      ]),
    );
  }

  void _onTapDate(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    if (_rangeMode) {
      if (_rangeStart == null) {
        setState(() => _rangeStart = normalized);
      } else {
        final from =
            _rangeStart!.isBefore(normalized) ? _rangeStart! : normalized;
        final to =
            _rangeStart!.isBefore(normalized) ? normalized : _rangeStart!;
        context.read<HotelSellerBloc>().add(BlockDateRange(from, to));
        setState(() {
          _rangeStart = null;
          _selectedDate = null;
        });
      }
    } else {
      setState(() => _selectedDate = normalized);
    }
  }

  // ── Legend ─────────────────────────────────────────────────────────────────

  Widget _buildLegend() => Container(
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          _legendItem(SellerTheme.successGreen.withValues(alpha: 0.15),
              'Available', SellerTheme.successGreen),
          _legendItem(SellerTheme.errorRed.withValues(alpha: 0.15), 'Blocked',
              SellerTheme.errorRed),
          _legendItem(_hotelGold.withValues(alpha: 0.15), 'Today', _hotelGold),
          _legendItem(_hotelPurple, 'Selected', Colors.white),
        ]),
      );

  Widget _legendItem(Color bg, String label, Color textColor) => Row(children: [
        Container(
          width: 14,
          height: 14,
          decoration:
              BoxDecoration(color: bg, borderRadius: BorderRadius.circular(3)),
          child: bg == _hotelPurple ? null : null,
        ),
        const SizedBox(width: 5),
        Text(label,
            style: TextStyle(
                fontSize: 10,
                color: textColor == Colors.white ? _hotelPurple : textColor)),
      ]);

  // ── Selected date panel ────────────────────────────────────────────────────

  Widget _buildSelectedPanel(
      BuildContext context, HotelSellerState state, Set<DateTime> blocked) {
    final d = _selectedDate!;
    final fmt = DateFormat('EEE, d MMMM yyyy');
    final isBlocked = blocked
        .any((b) => b.year == d.year && b.month == d.month && b.day == d.day);

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.calendar_today_outlined,
              size: 16, color: _hotelPurple),
          const SizedBox(width: 8),
          Text(fmt.format(d),
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isBlocked
                  ? SellerTheme.errorRed.withValues(alpha: 0.12)
                  : SellerTheme.successGreen.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isBlocked ? '🚫 Blocked' : '✅ Available',
              style: TextStyle(
                  color: isBlocked
                      ? SellerTheme.errorRed
                      : SellerTheme.successGreen,
                  fontSize: 11,
                  fontWeight: FontWeight.bold),
            ),
          ),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(
            child: isBlocked
                ? ElevatedButton.icon(
                    icon: const Icon(Icons.lock_open_outlined, size: 14),
                    label: const Text('Unblock Date'),
                    onPressed: () => context
                        .read<HotelSellerBloc>()
                        .add(UnblockHotelDate(d)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SellerTheme.successGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                  )
                : ElevatedButton.icon(
                    icon: const Icon(Icons.block_outlined, size: 14),
                    label: const Text('Block Date'),
                    onPressed: () =>
                        context.read<HotelSellerBloc>().add(BlockHotelDate(d)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SellerTheme.errorRed,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                  ),
          ),
        ]),
      ]),
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  Widget _buildStats(HotelSellerState state, Set<DateTime> blocked) {
    final ana = state.analytics;
    if (ana == null) return const SizedBox.shrink();

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Performance Metrics',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 14),
        _metric(
            'Avg Occupancy Rate',
            '${(ana.occupancyRate * 100).toStringAsFixed(1)}%',
            ana.occupancyRate,
            _hotelPurple),
        const SizedBox(height: 8),
        _metric(
            'Blocked Days This Month',
            '${blocked.where((b) => b.month == _focusMonth.month && b.year == _focusMonth.year).length} days',
            blocked
                    .where((b) =>
                        b.month == _focusMonth.month &&
                        b.year == _focusMonth.year)
                    .length /
                30,
            SellerTheme.errorRed),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: _miniStat(
                  '${ana.totalBookings}', 'Total Bookings', _hotelPurple)),
          const SizedBox(width: 10),
          Expanded(
              child: _miniStat('${ana.newBookings}', 'New This Week',
                  SellerTheme.successGreen)),
        ]),
      ]),
    );
  }

  Widget _metric(String label, String value, double ratio, Color color) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 12, color: SellerTheme.textSecondary)),
          const Spacer(),
          Text(value,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.bold, color: color)),
        ]),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: ratio.clamp(0.0, 1.0),
            backgroundColor: color.withValues(alpha: 0.1),
            valueColor: AlwaysStoppedAnimation(color),
            minHeight: 6,
          ),
        ),
      ]);

  Widget _miniStat(String val, String label, Color c) => Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
            color: c.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: c.withValues(alpha: 0.2))),
        child: Column(children: [
          Text(val,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.bold, color: c)),
          Text(label,
              style:
                  const TextStyle(fontSize: 10, color: SellerTheme.textMuted),
              textAlign: TextAlign.center),
        ]),
      );

  // ── Seasonal rate action section ───────────────────────────────────────────

  Widget _buildSeasonalActions(BuildContext context) {
    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.trending_up_outlined, size: 16, color: _hotelGold),
          SizedBox(width: 8),
          Text('Seasonal Pricing',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        ]),
        const SizedBox(height: 6),
        const Text('Apply a rate multiplier across a date range:',
            style: TextStyle(fontSize: 11, color: SellerTheme.textSecondary)),
        const SizedBox(height: 12),
        Row(children: [
          for (final s in [
            ('🌙 Ramadan', 1.3),
            ('🎉 National', 1.5),
            ('📅 Weekend', 1.2),
            ('🌞 Peak', 1.8),
          ])
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: GestureDetector(
                  onTap: () {
                    final now = DateTime.now();
                    context.read<HotelSellerBloc>().add(
                          SetSeasonalRate(
                              now, now.add(const Duration(days: 7)), s.$2),
                        );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _hotelGold.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border:
                          Border.all(color: _hotelGold.withValues(alpha: 0.3)),
                    ),
                    child: Column(children: [
                      Text(s.$1.split(' ')[0],
                          style: const TextStyle(fontSize: 16)),
                      Text(s.$1.split(' ')[1],
                          style: const TextStyle(
                              fontSize: 8, color: SellerTheme.textMuted)),
                      Text('+${((s.$2 - 1) * 100).toStringAsFixed(0)}%',
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: _hotelGold)),
                    ]),
                  ),
                ),
              ),
            ),
        ]),
      ]),
    );
  }

  // ── Blocked dates list ─────────────────────────────────────────────────────

  Widget _buildBlockedList(Set<DateTime> blocked) {
    if (blocked.isEmpty) {
      return Container(
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.all(16),
        child: const Row(children: [
          Icon(Icons.check_circle_outline,
              color: SellerTheme.successGreen, size: 18),
          SizedBox(width: 10),
          Text('No blocked dates — all dates are available',
              style: TextStyle(color: SellerTheme.textSecondary, fontSize: 13)),
        ]),
      );
    }

    final sorted = blocked.toList()..sort();
    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.block_outlined,
              size: 16, color: SellerTheme.errorRed),
          const SizedBox(width: 8),
          Text('${blocked.length} Blocked Date${blocked.length > 1 ? 's' : ''}',
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        ]),
        const SizedBox(height: 12),
        ...sorted.take(10).map((d) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(children: [
                const Icon(Icons.calendar_today_outlined,
                    size: 13, color: SellerTheme.errorRed),
                const SizedBox(width: 8),
                Text(DateFormat('EEE, d MMMM yyyy').format(d),
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w500)),
                const Spacer(),
                GestureDetector(
                  onTap: () =>
                      context.read<HotelSellerBloc>().add(UnblockHotelDate(d)),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: SellerTheme.successGreen.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                          color:
                              SellerTheme.successGreen.withValues(alpha: 0.4)),
                    ),
                    child: const Text('Unblock',
                        style: TextStyle(
                            fontSize: 10,
                            color: SellerTheme.successGreen,
                            fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
            )),
        if (blocked.length > 10)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('+ ${blocked.length - 10} more blocked dates',
                style: const TextStyle(
                    color: SellerTheme.textMuted, fontSize: 11)),
          ),
      ]),
    );
  }
}
