import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_event.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

class DoctorDashboardScreen extends StatefulWidget {
  const DoctorDashboardScreen({super.key});

  @override
  State<DoctorDashboardScreen> createState() => _DoctorDashboardScreenState();
}

class _DoctorDashboardScreenState extends State<DoctorDashboardScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  late final Animation<double> _pulseAnim;

  static const _doctorBlue = Color(0xFF06B6D4);

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _pulseAnim = Tween(begin: 0.6, end: 1.0)
        .animate(CurvedAnimation(parent: _pulse, curve: Curves.easeInOut));

    final ss = context.read<SellerBloc>().state;
    context
        .read<DoctorSellerBloc>()
        .add(LoadDoctorDashboard(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<DoctorSellerBloc, DoctorSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (_, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: (state.actionSuccess ?? true)
                ? SellerTheme.successGreen
                : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<SellerBloc, SellerState>(
        builder: (context, ss) =>
            BlocBuilder<DoctorSellerBloc, DoctorSellerState>(
          builder: (context, state) {
            final d   = state.dashboardData;
            final cur = state.doctorProfile?.currency ??
                ss.country.currencySymbol;

            return SellerModuleScaffold(
              activeRole: SellerRole.doctor,
              title: 'Doctor Dashboard',
              floatingActionButton: FloatingActionButton.extended(
                onPressed: () =>
                    Navigator.pushNamed(context, SellerRouter.doctorSchedule),
                backgroundColor: _doctorBlue,
                icon: const Icon(Icons.calendar_month_outlined, color: Colors.white),
                label: const Text('Manage Schedule',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
              ),
              body: RefreshIndicator(
                color: _doctorBlue,
                onRefresh: () async => context
                    .read<DoctorSellerBloc>()
                    .add(LoadDoctorDashboard(countryCode: ss.countryCode)),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildHero(context, ss, state),
                    const SizedBox(height: 14),
                    _buildAvailabilityToggle(context, state),
                    const SizedBox(height: 14),
                    _buildKpiRow(d, cur, state),
                    const SizedBox(height: 14),
                    if (d['weekly'] != null) ...[
                      _buildWeeklyChart(d, cur),
                      const SizedBox(height: 14),
                    ],
                    _buildQuickActions(context, state),
                    const SizedBox(height: 14),
                    if (state.inProgressCount > 0) ...[
                      _buildActiveConsultation(context, state),
                      const SizedBox(height: 14),
                    ],
                    _buildTodaySchedule(context, state, cur),
                    const SizedBox(height: 14),
                    _buildPatientQueue(context, state),
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

  Widget _buildHero(BuildContext context, SellerState ss, DoctorSellerState state) {
    final profile = state.doctorProfile;
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: _doctorBlue.withValues(alpha: 0.35),
              blurRadius: 16,
              offset: const Offset(0, 6)),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Center(child: Text('🩺', style: TextStyle(fontSize: 28))),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              profile?.name ?? 'Doctor Dashboard',
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 17),
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              profile?.specialty ?? 'General Practice',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
            if (profile != null)
              Text(
                profile.qualifications,
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7), fontSize: 11),
                overflow: TextOverflow.ellipsis,
              ),
          ])),
          if (state.inProgressCount > 0)
            Container(
              width: 54, height: 54,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white54),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('${state.inProgressCount}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                const Text('LIVE',
                    style: TextStyle(color: Colors.white70, fontSize: 8)),
              ]),
            ),
        ]),
        const SizedBox(height: 12),
        // Hospital + country + rating
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(children: [
            const Icon(Icons.local_hospital_outlined,
                size: 14, color: Colors.white70),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                profile?.hospital ?? 'Hospital',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9), fontSize: 11),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 10),
            Text(ss.country.flag, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 4),
            Text(ss.country.name,
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85), fontSize: 11)),
          ]),
        ),
        const SizedBox(height: 8),
        Row(children: [
          _heroPill('⭐ ${profile?.rating ?? 4.8}', Colors.amber),
          const SizedBox(width: 8),
          _heroPill('👥 ${profile?.totalPatients ?? 0} patients', Colors.white),
          const SizedBox(width: 8),
          _heroPill(
            profile != null && profile.consultFee > 0
                ? '${profile.currency} ${profile.consultFee.toStringAsFixed(0)}/session'
                : 'NHS Free',
            Colors.white,
          ),
        ]),
      ]),
    );
  }

  Widget _heroPill(String label, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
        color: c.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20)),
    child: Text(label,
        style: TextStyle(
            color: c, fontSize: 10, fontWeight: FontWeight.w600)),
  );

  // ── Availability Toggle ────────────────────────────────────────────────────

  Widget _buildAvailabilityToggle(BuildContext context, DoctorSellerState state) =>
      Container(
        decoration: SellerTheme.elevatedCard(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: (state.isAvailable
                        ? SellerTheme.successGreen
                        : SellerTheme.errorRed)
                    .withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                state.isAvailable
                    ? Icons.medical_services_outlined
                    : Icons.do_not_disturb_outlined,
                color: state.isAvailable
                    ? SellerTheme.successGreen
                    : SellerTheme.errorRed,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  state.isAvailable ? 'Available for Patients' : 'Currently Offline',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: state.isAvailable
                        ? SellerTheme.successGreen
                        : SellerTheme.errorRed,
                  ),
                ),
                Text(
                  state.isAvailable
                      ? 'Accepting new appointments & walk-ins'
                      : 'Toggle to start accepting appointments',
                  style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted),
                ),
              ]),
            ),
            Switch(
              value: state.isAvailable,
              onChanged: (v) => context
                  .read<DoctorSellerBloc>()
                  .add(UpdateDoctorAvailability(v)),
              activeTrackColor: SellerTheme.successGreen,
              inactiveTrackColor:
                  SellerTheme.errorRed.withValues(alpha: 0.4),
            ),
          ]),
        ),
      );

  // ── KPI Row ────────────────────────────────────────────────────────────────

  Widget _buildKpiRow(
      Map<String, dynamic> d, String cur, DoctorSellerState state) {
    final todayCount = (d['today'] as int?) ?? state.todayAppointmentCount;
    final inQueue    = state.pendingCount + state.inProgressCount;
    final todayEarnings = state.todayEarnings;

    return Row(children: [
      _kpi('$todayCount', "Today's Appts", Icons.calendar_today_outlined, _doctorBlue),
      const SizedBox(width: 10),
      _kpi('$inQueue',    'In Queue',       Icons.people_outline,          SellerTheme.warningAmber),
      const SizedBox(width: 10),
      _kpi(
        todayEarnings > 0
            ? '$cur ${_fmt(todayEarnings.toInt())}'
            : cur == 'GBP' ? 'NHS' : '$cur 0',
        'Earnings',
        Icons.payments_outlined,
        SellerTheme.successGreen,
      ),
      const SizedBox(width: 10),
      _kpi('⭐ ${(d['rating'] as num?)?.toStringAsFixed(1) ?? '4.8'}', 'Rating',
          Icons.star_outline, Colors.amber),
    ]);
  }

  Widget _kpi(String value, String label, IconData icon, Color color) =>
      Expanded(
        child: Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(height: 5),
            Text(value,
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.bold, color: color),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            Text(label,
                style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted),
                textAlign: TextAlign.center,
                maxLines: 1),
          ]),
        ),
      );

  // ── Weekly Chart ───────────────────────────────────────────────────────────

  Widget _buildWeeklyChart(Map<String, dynamic> d, String cur) {
    final raw    = List<double>.from(d['weekly'] as List);
    final isNHS  = raw.every((v) => v == 0);
    final maxVal = isNHS ? 1.0 : raw.reduce((a, b) => a > b ? a : b);
    const days   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Weekly Consultation Revenue',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 14),
        if (isNHS)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('🏥 NHS — consultations are free at point of use',
                  style: TextStyle(color: SellerTheme.textMuted, fontSize: 12),
                  textAlign: TextAlign.center),
            ),
          )
        else ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(7, (i) {
              final pct     = raw[i] / maxVal;
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
                            ? _doctorBlue
                            : _doctorBlue.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(days[i],
                        style: TextStyle(
                            fontSize: 9,
                            color: isToday ? _doctorBlue : SellerTheme.textMuted,
                            fontWeight: isToday ? FontWeight.bold : FontWeight.normal)),
                  ]),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Text('Today: $cur ${_fmt(raw[6].toInt())}',
              style: const TextStyle(
                  fontSize: 11,
                  color: SellerTheme.textSecondary,
                  fontWeight: FontWeight.w500)),
        ],
      ]),
    );
  }

  // ── Quick Actions ──────────────────────────────────────────────────────────

  Widget _buildQuickActions(BuildContext context, DoctorSellerState state) {
    final actions = [
      ('📅', 'Schedule',  SellerRouter.doctorSchedule,    _doctorBlue,               null),
      ('👥', 'Queue',     SellerRouter.doctorPatientQueue, SellerTheme.warningAmber,
          state.pendingCount > 0 ? '${state.pendingCount}' : null),
      ('📹', 'Video Call', SellerRouter.doctorVideoCall,  SellerTheme.successGreen,
          state.inProgressCount > 0 ? 'LIVE' : null),
    ];

    return Row(
      children: actions.map((a) => Expanded(
        child: GestureDetector(
          onTap: () {
            if (a.$2 == 'Video Call') {
              final live = state.inProgressAppointments;
              final id = live.isNotEmpty ? live.first.id : 'APPT-001';
              Navigator.pushNamed(context, a.$3, arguments: id);
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
                    right: -4, top: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                          color: a.$4, borderRadius: BorderRadius.circular(8)),
                      child: Text(a.$5!,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 8,
                              fontWeight: FontWeight.bold)),
                    ),
                  ),
              ]),
              const SizedBox(height: 6),
              Text(a.$2,
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600, color: a.$4)),
            ]),
          ),
        ),
      )).toList(),
    );
  }

  // ── Active Consultation Banner ─────────────────────────────────────────────

  Widget _buildActiveConsultation(BuildContext context, DoctorSellerState state) {
    final live = state.inProgressAppointments;
    if (live.isEmpty) return const SizedBox.shrink();
    final apt = live.first;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(
          context, SellerRouter.doctorVideoCall, arguments: apt.id),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [SellerTheme.successGreen, SellerTheme.successGreen.withValues(alpha: 0.75)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
                color: SellerTheme.successGreen.withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Row(children: [
          AnimatedBuilder(
            animation: _pulseAnim,
            builder: (_, __) => Container(
              width: 12, height: 12,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: _pulseAnim.value),
                shape: BoxShape.circle,
              ),
            ),
          ),
          const Text('🎥', style: TextStyle(fontSize: 20)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Consultation in Progress',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13)),
            Text('Patient: ${apt.patientName}',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 11),
                overflow: TextOverflow.ellipsis),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10)),
            child: const Text('Join →',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold)),
          ),
        ]),
      ),
    );
  }

  // ── Today's Schedule ───────────────────────────────────────────────────────

  Widget _buildTodaySchedule(
      BuildContext context, DoctorSellerState state, String cur) {
    final apts = state.upcomingAppointments.take(4).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text("Today's Schedule",
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: SellerTheme.textPrimary)),
        const Spacer(),
        GestureDetector(
          onTap: () =>
              Navigator.pushNamed(context, SellerRouter.doctorPatientQueue),
          child: const Text('View All',
              style: TextStyle(
                  color: _doctorBlue,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 10),
      if (apts.isEmpty)
        Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.all(24),
          child: const Center(child: Text('No appointments today 🗓️',
              style: TextStyle(color: SellerTheme.textMuted))),
        )
      else
        ...apts.map((apt) => _scheduleCard(context, apt, cur)),
    ]);
  }

  Widget _scheduleCard(BuildContext context, AppointmentModel apt, String cur) {
    final isLive    = apt.isInProgress;
    final hhmm      = '${apt.scheduledAt.hour.toString().padLeft(2, '0')}:${apt.scheduledAt.minute.toString().padLeft(2, '0')}';
    final statusCol = isLive
        ? SellerTheme.successGreen
        : apt.status == 'pending'
            ? SellerTheme.warningAmber
            : _doctorBlue;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(
          context, SellerRouter.doctorAppointmentDetail, arguments: apt),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isLive
                ? SellerTheme.successGreen.withValues(alpha: 0.5)
                : SellerTheme.border,
            width: isLive ? 1.5 : 1.0,
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            // Time block
            Container(
              width: 52,
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                color: _doctorBlue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(children: [
                Text(hhmm.split(':')[0],
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold, color: _doctorBlue)),
                Text(':${hhmm.split(':')[1]}',
                    style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
              ]),
            ),
            const SizedBox(width: 12),
            // Patient info
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(apt.patientName,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13),
                      overflow: TextOverflow.ellipsis),
                ),
                if (apt.isNew)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4)),
                    child: const Text('NEW',
                        style: TextStyle(
                            color: Colors.purple,
                            fontSize: 8,
                            fontWeight: FontWeight.bold)),
                  ),
              ]),
              if (apt.chiefComplaint != null)
                Text(apt.chiefComplaint!,
                    style: const TextStyle(
                        color: SellerTheme.textSecondary, fontSize: 11),
                    overflow: TextOverflow.ellipsis),
              Row(children: [
                Text(apt.isVideoType ? '📹 Video' : '🏥 In-Person',
                    style: const TextStyle(
                        color: SellerTheme.textMuted, fontSize: 10)),
                if (apt.patientAge != null) ...[
                  const Text(' · ',
                      style: TextStyle(color: SellerTheme.textMuted, fontSize: 10)),
                  Text(apt.patientAge!,
                      style: const TextStyle(
                          color: SellerTheme.textMuted, fontSize: 10)),
                ],
              ]),
            ])),
            // Status + fee
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: statusCol.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isLive
                      ? 'LIVE'
                      : apt.status == 'pending'
                          ? 'PENDING'
                          : 'UPCOMING',
                  style: TextStyle(
                      color: statusCol,
                      fontSize: 9,
                      fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                apt.consultFee > 0
                    ? '${apt.currency} ${apt.consultFee.toStringAsFixed(0)}'
                    : 'NHS',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: _doctorBlue),
              ),
              Icon(
                apt.isPaid
                    ? Icons.check_circle_outline
                    : Icons.payment_outlined,
                size: 12,
                color: apt.isPaid
                    ? SellerTheme.successGreen
                    : SellerTheme.warningAmber,
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  // ── Patient Queue ──────────────────────────────────────────────────────────

  Widget _buildPatientQueue(BuildContext context, DoctorSellerState state) {
    final queue = state.pendingAppointments.take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Walk-in Queue',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: SellerTheme.textPrimary)),
        if (queue.isNotEmpty) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: SellerTheme.warningAmber,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('${queue.length} waiting',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold)),
          ),
        ],
        const Spacer(),
        GestureDetector(
          onTap: () =>
              Navigator.pushNamed(context, SellerRouter.doctorPatientQueue),
          child: const Text('View All',
              style: TextStyle(
                  color: _doctorBlue,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 10),
      if (queue.isEmpty)
        Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.all(20),
          child: const Center(child: Text('No patients waiting 🎉',
              style: TextStyle(color: SellerTheme.textMuted))),
        )
      else
        ...queue.map((apt) => _queueCard(context, apt)),
    ]);
  }

  Widget _queueCard(BuildContext context, AppointmentModel apt) {
    final elapsed = DateTime.now().difference(apt.scheduledAt).inMinutes.abs();
    final initial = apt.patientName.isNotEmpty ? apt.patientName[0].toUpperCase() : '?';

    return GestureDetector(
      onTap: () => Navigator.pushNamed(
          context, SellerRouter.doctorPatientQueue),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: SellerTheme.elevatedCard(),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: _doctorBlue.withValues(alpha: 0.12),
              child: Text(initial,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _doctorBlue,
                      fontSize: 14)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(apt.patientName,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13)),
              Text(apt.chiefComplaint ?? 'General consultation',
                  style: const TextStyle(
                      color: SellerTheme.textSecondary, fontSize: 11),
                  overflow: TextOverflow.ellipsis),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('~${elapsed + 5}m wait',
                  style: const TextStyle(
                      color: SellerTheme.textMuted, fontSize: 11)),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () => context
                    .read<DoctorSellerBloc>()
                    .add(AcceptAppointmentRequest(apt.id)),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _doctorBlue,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('Accept',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold)),
                ),
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  String _fmt(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
    return '$v';
  }
}
