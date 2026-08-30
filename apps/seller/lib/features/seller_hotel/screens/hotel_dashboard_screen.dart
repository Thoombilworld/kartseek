import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_event.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

class HotelDashboardScreen extends StatefulWidget {
  const HotelDashboardScreen({super.key});

  @override
  State<HotelDashboardScreen> createState() => _HotelDashboardScreenState();
}

class _HotelDashboardScreenState extends State<HotelDashboardScreen>
    with SingleTickerProviderStateMixin {
  static const _hotelGold = Color(0xFFF59E0B);
  static const _hotelPurple = Color(0xFF8B5CF6);

  late AnimationController _occupancyCtrl;
  late Animation<double> _occupancyAnim;

  @override
  void initState() {
    super.initState();
    _occupancyCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200));
    _occupancyAnim =
        CurvedAnimation(parent: _occupancyCtrl, curve: Curves.easeOutCubic);

    final ss = context.read<SellerBloc>().state;
    context
        .read<HotelSellerBloc>()
        .add(LoadHotelDashboard(countryCode: ss.countryCode));
    _occupancyCtrl.forward();
  }

  @override
  void dispose() {
    _occupancyCtrl.dispose();
    super.dispose();
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
        }
      },
      child: BlocBuilder<SellerBloc, SellerState>(
        builder: (context, ss) =>
            BlocBuilder<HotelSellerBloc, HotelSellerState>(
          builder: (context, state) {
            final d = state.dashboardData;
            final cur = ss.country.currencySymbol;
            final ana = state.analytics;

            if (state.status == HotelBlocStatus.loading &&
                state.bookings.isEmpty) {
              return const SellerModuleScaffold(
                activeRole: SellerRole.hotelOwner,
                title: 'Hotel Dashboard',
                body:
                    Center(child: CircularProgressIndicator(color: _hotelGold)),
              );
            }

            return SellerModuleScaffold(
              activeRole: SellerRole.hotelOwner,
              title: 'Hotel Dashboard',
              floatingActionButton: FloatingActionButton.extended(
                onPressed: () => Navigator.pushNamed(
                    context, SellerRouter.hotelAvailability),
                backgroundColor: _hotelPurple,
                icon: const Icon(Icons.calendar_month_outlined,
                    color: Colors.white),
                label: const Text('Manage Availability',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
              ),
              body: RefreshIndicator(
                color: _hotelGold,
                onRefresh: () async => context
                    .read<HotelSellerBloc>()
                    .add(LoadHotelDashboard(countryCode: ss.countryCode)),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildHeroCard(d, ss, state),
                    const SizedBox(height: 14),
                    _buildKpiRow(d, cur, state),
                    const SizedBox(height: 14),
                    _buildOccupancyBar(state),
                    const SizedBox(height: 14),
                    if (ana != null) ...[
                      _buildRevenueChart(ana, cur),
                      const SizedBox(height: 14),
                    ],
                    _buildQuickActions(context, state),
                    const SizedBox(height: 14),
                    _buildTodayActivity(context, state, cur),
                    const SizedBox(height: 14),
                    _buildRoomSnapshot(context, state),
                    if (state.staff.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      _buildStaffOnDuty(state),
                    ],
                    if (d['policy'] != null) ...[
                      const SizedBox(height: 14),
                      _buildPolicyCard(d),
                    ],
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  // ── Hero Card ──────────────────────────────────────────────────────────────

  Widget _buildHeroCard(
      Map<String, dynamic> d, SellerState ss, HotelSellerState state) {
    final stars = d['star_rating'] as String? ?? '4-Star';
    final name = d['hotel_name'] as String? ?? 'Hotel Dashboard';
    final city = d['city'] as String? ?? '';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: _hotelGold.withValues(alpha: 0.35),
              blurRadius: 16,
              offset: const Offset(0, 6)),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child:
                const Center(child: Text('🏨', style: TextStyle(fontSize: 30))),
          ),
          const SizedBox(width: 14),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(name,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16),
                    overflow: TextOverflow.ellipsis),
                Text(city,
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 12),
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Row(children: [
                  _heroPill('⭐ $stars', Colors.white),
                  const SizedBox(width: 6),
                  _heroPill(
                      '${ss.country.flag} ${ss.country.name}', Colors.white),
                ]),
              ])),
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white38),
            ),
            child:
                Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('${(state.occupancyRate * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold)),
              const Text('OCC',
                  style: TextStyle(color: Colors.white70, fontSize: 8)),
            ]),
          ),
        ]),
        const SizedBox(height: 12),
        // Check-in / Check-out times
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child:
              Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _timePair('Check-in', d['check_in_time'] as String? ?? '14:00'),
            Container(width: 1, height: 24, color: Colors.white30),
            _timePair('Check-out', d['check_out_time'] as String? ?? '12:00'),
            Container(width: 1, height: 24, color: Colors.white30),
            _timePair('Rating',
                '⭐ ${(d['rating'] as num?)?.toStringAsFixed(1) ?? '4.8'}'),
          ]),
        ),
      ]),
    );
  }

  Widget _heroPill(String label, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
            color: c.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style:
                TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w600)),
      );

  Widget _timePair(String l, String v) => Column(children: [
        Text(l, style: const TextStyle(color: Colors.white54, fontSize: 9)),
        Text(v,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 12)),
      ]);

  // ── KPI Row ────────────────────────────────────────────────────────────────

  Widget _buildKpiRow(
      Map<String, dynamic> d, String cur, HotelSellerState state) {
    final ana = state.analytics;
    final totalRooms = (d['total_rooms'] as int?) ?? 60;
    final available = state.availableRooms;
    final checkedIn = state.checkedInCount;
    final upcoming = state.upcomingCount;
    final adr = ana?.adr ?? 0.0;

    return Row(children: [
      _kpi('$checkedIn', 'Checked In', Icons.people_outline, _hotelPurple),
      const SizedBox(width: 8),
      _kpi('$upcoming', 'Arriving', Icons.luggage_outlined,
          SellerTheme.infoBlue),
      const SizedBox(width: 8),
      _kpi('$available / $totalRooms', 'Available', Icons.king_bed_outlined,
          SellerTheme.successGreen),
      const SizedBox(width: 8),
      _kpi(
        adr > 0 ? '$cur ${_fmt(adr.toInt())}' : '--',
        'ADR',
        Icons.trending_up_outlined,
        _hotelGold,
      ),
    ]);
  }

  Widget _kpi(String value, String label, IconData icon, Color color) =>
      Expanded(
        child: Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 4),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: Icon(icon, size: 15, color: color),
            ),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    fontSize: 10, fontWeight: FontWeight.bold, color: color),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            Text(label,
                style:
                    const TextStyle(fontSize: 9, color: SellerTheme.textMuted),
                textAlign: TextAlign.center),
          ]),
        ),
      );

  // ── Occupancy Bar ──────────────────────────────────────────────────────────

  Widget _buildOccupancyBar(HotelSellerState state) {
    final occ = state.occupancyRate.clamp(0.0, 1.0);
    final cleaning = state.cleaningRooms;
    final maintenance = state.maintenanceRooms;
    final available = state.availableRooms;
    final checkedIn =
        state.hotelRooms.where((r) => r.status == RoomStatus.occupied).length;

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Occupancy Overview',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const Spacer(),
          Text('${(occ * 100).toStringAsFixed(1)}%',
              style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: _hotelGold)),
        ]),
        const SizedBox(height: 12),
        // Segmented bar
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: AnimatedBuilder(
            animation: _occupancyAnim,
            builder: (_, __) {
              final total = state.hotelRooms.length;
              if (total == 0) return const SizedBox.shrink();
              final occW = checkedIn / total;
              final cleanW = cleaning / total;
              final maintW = maintenance / total;
              final availW = available / total;

              return SizedBox(
                height: 14,
                child: Row(children: [
                  if (checkedIn > 0)
                    Flexible(
                        flex: (occW * 100).round(),
                        child: Container(color: _hotelPurple)),
                  if (cleaning > 0)
                    Flexible(
                        flex: (cleanW * 100).round(),
                        child: Container(color: SellerTheme.infoBlue)),
                  if (maintenance > 0)
                    Flexible(
                        flex: (maintW * 100).round(),
                        child: Container(color: SellerTheme.warningAmber)),
                  if (available > 0)
                    Flexible(
                        flex: (availW * 100).round(),
                        child: Container(
                            color: SellerTheme.successGreen
                                .withValues(alpha: 0.3))),
                ]),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        Row(children: [
          _legend(_hotelPurple, 'Occupied', '$checkedIn'),
          const SizedBox(width: 16),
          _legend(SellerTheme.infoBlue, 'Cleaning', '$cleaning'),
          const SizedBox(width: 16),
          _legend(SellerTheme.warningAmber, 'Maintenance', '$maintenance'),
          const SizedBox(width: 16),
          _legend(SellerTheme.successGreen, 'Available', '$available'),
        ]),
      ]),
    );
  }

  Widget _legend(Color c, String label, String val) => Row(children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text('$label ($val)',
            style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
      ]);

  // ── Revenue Chart ──────────────────────────────────────────────────────────

  Widget _buildRevenueChart(HotelAnalyticsData ana, String cur) {
    final rev = ana.weeklyRevenue;
    final maxVal = rev.reduce((a, b) => a > b ? a : b);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Weekly Revenue',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: _hotelGold.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('RevPAR $cur ${_fmt(ana.revPar.toInt())}',
                style: const TextStyle(
                    color: _hotelGold,
                    fontSize: 10,
                    fontWeight: FontWeight.bold)),
          ),
        ]),
        const SizedBox(height: 14),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: List.generate(7, (i) {
            final pct = rev[i] / maxVal;
            final isToday = i == 6;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: Column(children: [
                  AnimatedContainer(
                    duration: Duration(milliseconds: 400 + i * 60),
                    height: 80 * pct,
                    decoration: BoxDecoration(
                      color: isToday
                          ? _hotelGold
                          : _hotelGold.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(days[i],
                      style: TextStyle(
                          fontSize: 9,
                          color: isToday ? _hotelGold : SellerTheme.textMuted,
                          fontWeight:
                              isToday ? FontWeight.bold : FontWeight.normal)),
                ]),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Row(children: [
          const Spacer(),
          Text('Total $cur ${_fmt(rev.reduce((a, b) => a + b).toInt())} / week',
              style: const TextStyle(
                  fontSize: 11,
                  color: SellerTheme.textSecondary,
                  fontWeight: FontWeight.w500)),
        ]),
      ]),
    );
  }

  // ── Quick Actions ──────────────────────────────────────────────────────────

  Widget _buildQuickActions(BuildContext context, HotelSellerState state) {
    final actions = [
      (
        '📋',
        'Bookings',
        SellerRouter.hotelBookingDetail,
        _hotelPurple,
        state.upcomingCount > 0 ? '${state.upcomingCount}' : null
      ),
      (
        '🛏',
        'Rooms',
        SellerRouter.hotelRoomInventory,
        SellerTheme.infoBlue,
        state.cleaningRooms > 0 ? '${state.cleaningRooms}🧹' : null
      ),
      ('📅', 'Calendar', SellerRouter.hotelAvailability, _hotelGold, null),
    ];

    return Row(
      children: actions
          .map((a) => Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (a.$2 == 'Bookings' && state.bookings.isNotEmpty) {
                      Navigator.pushNamed(
                          context, SellerRouter.hotelBookingDetail,
                          arguments: state.bookings.first);
                    } else {
                      Navigator.pushNamed(context, a.$3);
                    }
                  },
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: a.$4.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: a.$4.withValues(alpha: 0.25)),
                    ),
                    child: Column(children: [
                      Stack(alignment: Alignment.topRight, children: [
                        Text(a.$1, style: const TextStyle(fontSize: 22)),
                        if (a.$5 != null)
                          Positioned(
                            right: -4,
                            top: -4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                  color: a.$4,
                                  borderRadius: BorderRadius.circular(8)),
                              child: Text(a.$5!,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 7,
                                      fontWeight: FontWeight.bold)),
                            ),
                          ),
                      ]),
                      const SizedBox(height: 6),
                      Text(a.$2,
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: a.$4)),
                    ]),
                  ),
                ),
              ))
          .toList(),
    );
  }

  // ── Today's Activity ───────────────────────────────────────────────────────

  Widget _buildTodayActivity(
      BuildContext context, HotelSellerState state, String cur) {
    final checkins =
        state.bookings.where((b) => b.status == 'upcoming').take(3).toList();
    final inhouse =
        state.bookings.where((b) => b.status == 'checked_in').take(3).toList();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text("Today's Activity",
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const Spacer(),
        GestureDetector(
          onTap: () => Navigator.pushNamed(
              context, SellerRouter.hotelBookingDetail,
              arguments:
                  state.bookings.isNotEmpty ? state.bookings.first : null),
          child: const Text('All Bookings',
              style: TextStyle(
                  color: _hotelPurple,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 10),

      // Arrivals
      if (checkins.isNotEmpty) ...[
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(children: [
            const Icon(Icons.luggage_outlined,
                size: 14, color: SellerTheme.successGreen),
            const SizedBox(width: 6),
            Text('${checkins.length} Arriving Today',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: SellerTheme.successGreen)),
          ]),
        ),
        ...checkins.map((b) => _bookingCard(context, b, cur, 'arrival')),
      ],

      // In-house
      if (inhouse.isNotEmpty) ...[
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(children: [
            const Icon(Icons.people_outline, size: 14, color: _hotelPurple),
            const SizedBox(width: 6),
            Text('${inhouse.length} In-House',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: _hotelPurple)),
          ]),
        ),
        ...inhouse.map((b) => _bookingCard(context, b, cur, 'inhouse')),
      ],
    ]);
  }

  Widget _bookingCard(
      BuildContext context, HotelBookingModel b, String cur, String kind) {
    final statusColor = b.status == 'checked_in'
        ? _hotelPurple
        : b.status == 'upcoming'
            ? SellerTheme.successGreen
            : SellerTheme.textMuted;
    final statusLabel = b.status == 'checked_in'
        ? 'IN-HOUSE'
        : b.status == 'upcoming'
            ? 'ARRIVING'
            : 'DEPARTED';

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, SellerRouter.hotelBookingDetail,
          arguments: b),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: SellerTheme.elevatedCard(),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            // Room badge
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('🛏', style: TextStyle(fontSize: 16)),
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
                          overflow: TextOverflow.ellipsis),
                    ),
                    if (b.guestNationality != null)
                      Text(b.guestNationality!,
                          style: const TextStyle(
                              color: SellerTheme.textMuted, fontSize: 10)),
                  ]),
                  Text(
                      '${b.roomType} · ${b.nights} night${b.nights > 1 ? 's' : ''}',
                      style: const TextStyle(
                          color: SellerTheme.textSecondary, fontSize: 11)),
                  if (b.specialRequests != null)
                    Text('⚠ ${b.specialRequests}',
                        style: const TextStyle(
                            color: SellerTheme.warningAmber, fontSize: 10),
                        overflow: TextOverflow.ellipsis),
                ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(statusLabel,
                    style: TextStyle(
                        color: statusColor,
                        fontSize: 8,
                        fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 4),
              Text('$cur ${_fmt(b.totalAmount.toInt())}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: _hotelPurple)),
              Icon(
                b.isPaid ? Icons.check_circle_outline : Icons.payment_outlined,
                size: 12,
                color: b.isPaid
                    ? SellerTheme.successGreen
                    : SellerTheme.warningAmber,
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  // ── Room Snapshot ──────────────────────────────────────────────────────────

  Widget _buildRoomSnapshot(BuildContext context, HotelSellerState state) {
    final rooms = state.hotelRooms.take(12).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Room Availability',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const Spacer(),
        GestureDetector(
          onTap: () =>
              Navigator.pushNamed(context, SellerRouter.hotelRoomInventory),
          child: const Text('All Rooms',
              style: TextStyle(
                  color: _hotelPurple,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 10),
      Container(
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.all(14),
        child: Column(children: [
          // Legend
          Row(children: [
            _legend(_hotelPurple, 'Occupied', ''),
            const SizedBox(width: 12),
            _legend(SellerTheme.successGreen, 'Available', ''),
            const SizedBox(width: 12),
            _legend(SellerTheme.infoBlue, 'Cleaning', ''),
            const SizedBox(width: 12),
            _legend(SellerTheme.warningAmber, 'Maintenance', ''),
          ]),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 6,
              childAspectRatio: 1.3,
              crossAxisSpacing: 6,
              mainAxisSpacing: 6,
            ),
            itemCount: rooms.length,
            itemBuilder: (ctx, i) {
              final r = rooms[i];
              final col = switch (r.status) {
                RoomStatus.occupied => _hotelPurple,
                RoomStatus.available => SellerTheme.successGreen,
                RoomStatus.cleaning => SellerTheme.infoBlue,
                RoomStatus.maintenance => SellerTheme.warningAmber,
                RoomStatus.outOfOrder => SellerTheme.errorRed,
              };
              return GestureDetector(
                onTap: () => Navigator.pushNamed(
                    context, SellerRouter.hotelRoomInventory),
                child: Container(
                  decoration: BoxDecoration(
                    color: col.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: col.withValues(alpha: 0.4)),
                  ),
                  child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('${r.number}',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: col)),
                      ]),
                ),
              );
            },
          ),
        ]),
      ),
    ]);
  }

  // ── Staff on Duty ──────────────────────────────────────────────────────────

  Widget _buildStaffOnDuty(HotelSellerState state) {
    final onDuty = state.staff.where((s) => s.isOnDuty).take(4).toList();
    if (onDuty.isEmpty) return const SizedBox.shrink();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Staff on Duty',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      const SizedBox(height: 10),
      Container(
        decoration: SellerTheme.elevatedCard(),
        child: Column(
          children: onDuty.map((s) {
            final roleEmoji = switch (s.role) {
              'receptionist' => '🎫',
              'housekeeping' => '🧹',
              'maintenance' => '🔧',
              'manager' => '👔',
              'chef' => '👨‍🍳',
              _ => '👤',
            };
            return ListTile(
              dense: true,
              leading: Text(roleEmoji, style: const TextStyle(fontSize: 20)),
              title: Text(s.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13)),
              subtitle: Text('${s.role.toUpperCase()} · ${s.shift} shift',
                  style: const TextStyle(
                      fontSize: 10, color: SellerTheme.textMuted)),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: SellerTheme.successGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8)),
                child: const Text('On Duty',
                    style: TextStyle(
                        color: SellerTheme.successGreen,
                        fontSize: 9,
                        fontWeight: FontWeight.bold)),
              ),
            );
          }).toList(),
        ),
      ),
    ]);
  }

  // ── Policy Card ────────────────────────────────────────────────────────────

  Widget _buildPolicyCard(Map<String, dynamic> d) {
    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.policy_outlined, size: 16, color: SellerTheme.textMuted),
          SizedBox(width: 8),
          Text('Hotel Policy',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        ]),
        const SizedBox(height: 8),
        Text(d['policy'] as String,
            style: const TextStyle(
                fontSize: 12, color: SellerTheme.textSecondary, height: 1.4)),
      ]),
    );
  }

  String _fmt(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
    return '$v';
  }
}
