import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_event.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

/// Patient Queue Screen
///
/// 3-tab layout:
///   Upcoming · In Progress · Completed
///
/// Each appointment card has:
///   • Patient name, age, gender, chief complaint
///   • Type pill (Video / In-Person) + Paid/Unpaid pill
///   • Contextual action buttons per status:
///       pending   → Accept + Cancel
///       upcoming  → Start Call / Start Consult + Reschedule + No Show
///       in_prog   → Complete + Notes
///       completed → View Diagnosis
class DoctorPatientQueueScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const DoctorPatientQueueScreen(
      {super.key, this.order, this.appointment, this.booking});

  @override
  State<DoctorPatientQueueScreen> createState() =>
      _DoctorPatientQueueScreenState();
}

class _DoctorPatientQueueScreenState extends State<DoctorPatientQueueScreen>
    with SingleTickerProviderStateMixin {
  static const _doctorBlue = Color(0xFF06B6D4);
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    final ss = context.read<SellerBloc>().state;
    context
        .read<DoctorSellerBloc>()
        .add(LoadDoctorAppointments(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
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
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<SellerBloc, dynamic>(
        builder: (context, ss) =>
            BlocBuilder<DoctorSellerBloc, DoctorSellerState>(
          builder: (context, state) {
            final upcoming   = state.upcomingAppointments;
            final inProgress = state.inProgressAppointments;
            final completed  = state.completedAppointments;

            return Scaffold(
              backgroundColor: SellerTheme.surface,
              appBar: AppBar(
                backgroundColor: _doctorBlue,
                foregroundColor: Colors.white,
                elevation: 0,
                title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  const Text('Patient Queue',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(
                      '${upcoming.length} upcoming · ${completed.length} completed',
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
                    _tab('Upcoming', upcoming.length),
                    _tab('In Progress', inProgress.length,
                        pulse: inProgress.isNotEmpty),
                    _tab('Completed', completed.length),
                  ],
                ),
              ),
              body: TabBarView(
                controller: _tabCtrl,
                children: [
                  _AptList(
                      apts: upcoming, color: _doctorBlue, tabType: 'upcoming'),
                  _AptList(
                      apts: inProgress,
                      color: SellerTheme.successGreen,
                      tabType: 'in_progress'),
                  _AptList(
                      apts: completed,
                      color: SellerTheme.textMuted,
                      tabType: 'completed'),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Tab _tab(String label, int count, {bool pulse = false}) => Tab(
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: pulse ? 0.35 : 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$count',
                  style: const TextStyle(fontSize: 9)),
            ),
          ],
        ]),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment List
// ─────────────────────────────────────────────────────────────────────────────

class _AptList extends StatelessWidget {
  final List<AppointmentModel> apts;
  final Color color;
  final String tabType;

  const _AptList(
      {required this.apts, required this.color, required this.tabType});

  @override
  Widget build(BuildContext context) {
    if (apts.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(tabType == 'completed' ? '✅' : '🗓️',
              style: const TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text(
            tabType == 'completed'
                ? 'No completed appointments yet'
                : tabType == 'in_progress'
                    ? 'No active consultations'
                    : 'No upcoming appointments',
            style: const TextStyle(
                color: SellerTheme.textSecondary, fontSize: 14),
          ),
        ]),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: apts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) =>
          _AppointmentCard(apt: apts[i], color: color, tabType: tabType),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Card
// ─────────────────────────────────────────────────────────────────────────────

class _AppointmentCard extends StatefulWidget {
  final AppointmentModel apt;
  final Color color;
  final String tabType;

  const _AppointmentCard(
      {required this.apt, required this.color, required this.tabType});

  @override
  State<_AppointmentCard> createState() => _AppointmentCardState();
}

class _AppointmentCardState extends State<_AppointmentCard> {
  bool _expanded = false;
  final _notesCtrl = TextEditingController();

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  AppointmentModel get apt => widget.apt;
  bool get isLive => apt.isInProgress;
  bool get isCompleted => apt.isCompleted;

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('EEE, d MMM · h:mm a');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLive
              ? SellerTheme.successGreen.withValues(alpha: 0.5)
              : isCompleted
                  ? SellerTheme.border
                  : SellerTheme.border,
          width: isLive ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: isLive
                ? SellerTheme.successGreen.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            // ── Header ───────────────────────────────────────────────────────
            Row(children: [
              // Avatar
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                    color: widget.color.withValues(alpha: 0.1),
                    shape: BoxShape.circle),
                child: Center(
                  child: Text(
                    apt.isVideoType ? '🎥' : '🏥',
                    style: const TextStyle(fontSize: 20),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                Row(children: [
                  Expanded(
                    child: Text(apt.patientName,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                        overflow: TextOverflow.ellipsis),
                  ),
                  if (isLive)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                          color: SellerTheme.successGreen,
                          borderRadius: BorderRadius.circular(8)),
                      child: const Text('LIVE',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold)),
                    ),
                  if (apt.isNew)
                    Container(
                      margin: const EdgeInsets.only(left: 4),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                          color: Colors.purple.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8)),
                      child: const Text('NEW',
                          style: TextStyle(
                              color: Colors.purple,
                              fontSize: 9,
                              fontWeight: FontWeight.bold)),
                    ),
                ]),
                Text(fmt.format(apt.scheduledAt),
                    style: const TextStyle(
                        color: SellerTheme.textSecondary, fontSize: 11)),
                if (apt.chiefComplaint != null)
                  Text(apt.chiefComplaint!,
                      style: const TextStyle(
                          color: SellerTheme.textMuted, fontSize: 11),
                      overflow: TextOverflow.ellipsis),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(
                  apt.consultFee > 0
                      ? '${apt.currency} ${apt.consultFee.toStringAsFixed(0)}'
                      : 'NHS',
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: widget.color),
                ),
                const SizedBox(height: 4),
                Row(children: [
                  Icon(
                    apt.isPaid
                        ? Icons.check_circle_outline
                        : Icons.payment_outlined,
                    size: 11,
                    color: apt.isPaid
                        ? SellerTheme.successGreen
                        : SellerTheme.warningAmber,
                  ),
                  const SizedBox(width: 3),
                  Text(apt.isPaid ? 'Paid' : 'Unpaid',
                      style: TextStyle(
                          fontSize: 9,
                          color: apt.isPaid
                              ? SellerTheme.successGreen
                              : SellerTheme.warningAmber)),
                ]),
              ]),
            ]),

            const SizedBox(height: 8),

            // ── Pills row ─────────────────────────────────────────────────────
            Wrap(spacing: 6, runSpacing: 4, children: [
              _pill(apt.isVideoType ? '📹 Video' : '🏥 In-Person',
                  widget.color),
              if (apt.patientAge != null)
                _pill('👤 ${apt.patientAge}', SellerTheme.textMuted),
              if (apt.patientPhone != null)
                _pill(apt.patientPhone!, SellerTheme.textMuted),
              _pill('#${apt.id}', SellerTheme.textMuted),
            ]),

            // ── Diagnosis (completed) ─────────────────────────────────────────
            if (isCompleted && apt.diagnosis != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: SellerTheme.successGreen.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: SellerTheme.successGreen.withValues(alpha: 0.2)),
                ),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  const Row(children: [
                    Icon(Icons.medical_information_outlined,
                        size: 14, color: SellerTheme.successGreen),
                    SizedBox(width: 6),
                    Text('Diagnosis',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            color: SellerTheme.successGreen)),
                  ]),
                  const SizedBox(height: 4),
                  Text(apt.diagnosis!,
                      style: const TextStyle(
                          fontSize: 11, color: SellerTheme.textPrimary)),
                  if (apt.prescriptions.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    ...apt.prescriptions.map((rx) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(children: [
                            const Text('💊',
                                style: TextStyle(fontSize: 11)),
                            const SizedBox(width: 6),
                            Expanded(
                                child: Text(rx,
                                    style: const TextStyle(fontSize: 11))),
                          ]),
                        )),
                  ],
                ]),
              ),
            ],

            // ── Expandable notes ──────────────────────────────────────────────
            if (apt.notes != null) ...[
              GestureDetector(
                onTap: () => setState(() => _expanded = !_expanded),
                child: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(children: [
                    const Icon(Icons.note_outlined,
                        size: 13, color: SellerTheme.textMuted),
                    const SizedBox(width: 4),
                    const Text('Notes',
                        style: TextStyle(
                            fontSize: 11,
                            color: SellerTheme.textSecondary)),
                    const Spacer(),
                    Icon(
                        _expanded
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        size: 16,
                        color: SellerTheme.textMuted),
                  ]),
                ),
              ),
              if (_expanded)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(apt.notes!,
                      style: const TextStyle(
                          fontSize: 11,
                          color: SellerTheme.textSecondary)),
                ),
            ],
          ]),
        ),

        // ── Action Buttons ──────────────────────────────────────────────────
        if (!isCompleted && apt.status != 'no_show') ...[
          const Divider(height: 1, color: SellerTheme.border),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: _buildActions(context),
          ),
        ],
      ]),
    );
  }

  Widget _buildActions(BuildContext context) {
    final bloc = context.read<DoctorSellerBloc>();

    Widget btn(String label, Color bg, VoidCallback onTap,
            {bool outline = false}) =>
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: outline
                ? OutlinedButton(
                    onPressed: onTap,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: bg,
                      side: BorderSide(color: bg.withValues(alpha: 0.5)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                    ),
                    child: Text(label,
                        style: const TextStyle(fontSize: 11)),
                  )
                : ElevatedButton(
                    onPressed: onTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: bg,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      elevation: 0,
                    ),
                    child: Text(label,
                        style: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
          ),
        );

    switch (apt.status) {
      case 'pending':
        return Row(children: [
          btn('❌ Decline', SellerTheme.errorRed, () => _cancelDialog(context),
              outline: true),
          btn('✅ Accept', widget.color,
              () => bloc.add(AcceptAppointmentRequest(apt.id))),
        ]);

      case 'upcoming':
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            if (apt.isVideoType)
              btn('🎥 Start Video', const Color(0xFF06B6D4), () {
                bloc.add(StartDoctorVideoCall(apt.id));
                Navigator.pushNamed(context, SellerRouter.doctorVideoCall,
                    arguments: apt.id);
              })
            else
              btn('🏥 Start Consult', SellerTheme.successGreen,
                  () => bloc.add(StartDoctorConsultation(apt.id))),
            btn('🚫 No Show', SellerTheme.errorRed,
                () => bloc.add(MarkPatientNoShow(apt.id)),
                outline: true),
          ]),
          const SizedBox(height: 6),
          Row(children: [
            btn('📅 Reschedule', SellerTheme.warningAmber,
                () => _rescheduleDialog(context),
                outline: true),
            btn('❌ Cancel', SellerTheme.errorRed,
                () => _cancelDialog(context),
                outline: true),
          ]),
        ]);

      case 'in_progress':
        return Row(children: [
          btn('📝 Add Notes', SellerTheme.infoBlue,
              () => _notesDialog(context),
              outline: true),
          btn('✅ Complete', SellerTheme.successGreen,
              () => _completeDialog(context)),
        ]);

      default:
        return const SizedBox.shrink();
    }
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────

  void _cancelDialog(BuildContext context) {
    const reasons = [
      'Doctor unavailable — emergency',
      'Patient requested cancellation',
      'Appointment slot conflict',
      'Technical issues (video)',
      'Patient did not meet criteria',
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
            const Text('Cancel Appointment',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${apt.patientName} · ${apt.id}',
                style: const TextStyle(
                    color: SellerTheme.textMuted, fontSize: 12)),
            const SizedBox(height: 14),
            ...reasons.asMap().entries.map((e) => GestureDetector(
                  onTap: () => setS(() => selected = e.key),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(children: [
                      Container(
                        width: 18, height: 18,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: selected == e.key
                                ? SellerTheme.errorRed
                                : SellerTheme.border,
                            width: 2,
                          ),
                          color: selected == e.key
                              ? SellerTheme.errorRed
                              : Colors.transparent,
                        ),
                        child: selected == e.key
                            ? const Icon(Icons.check, size: 10, color: Colors.white)
                            : null,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(e.value,
                            style: const TextStyle(fontSize: 13)),
                      ),
                    ]),
                  ),
                )),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: SellerTheme.errorRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                onPressed: () {
                  context.read<DoctorSellerBloc>().add(
                      CancelDoctorAppointment(apt.id, reasons[selected]));
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

  void _rescheduleDialog(BuildContext context) async {
    final now  = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      builder: (ctx, child) => Theme(
          data: Theme.of(ctx).copyWith(
              colorScheme: const ColorScheme.light(
                  primary: Color(0xFF06B6D4))),
          child: child!),
    );
    if (date == null || !context.mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(apt.scheduledAt),
    );
    if (time == null || !context.mounted) return;
    final newDt = DateTime(
        date.year, date.month, date.day, time.hour, time.minute);
    context
        .read<DoctorSellerBloc>()
        .add(RescheduleDoctorAppointment(apt.id, newDt));
  }

  void _notesDialog(BuildContext context) {
    _notesCtrl.text = apt.notes ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Consultation Notes',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          TextField(
            controller: _notesCtrl,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: 'Patient history, observations, vitals...',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10)),
              filled: true,
              fillColor: SellerTheme.surface,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.infoBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: () {
                context.read<DoctorSellerBloc>().add(
                    UpdateDoctorNotes(apt.id, _notesCtrl.text.trim()));
                Navigator.pop(ctx);
              },
              child: const Text('Save Notes',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }

  void _completeDialog(BuildContext context) {
    final diagCtrl = TextEditingController();
    final rxCtrl   = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          const Text('Complete Consultation',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Text('Patient: ${apt.patientName}',
              style:
                  const TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
          const SizedBox(height: 14),
          TextField(
            controller: diagCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Diagnosis / Assessment',
              hintText: 'e.g. Hypertension controlled — continue Amlodipine 5mg',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10)),
              filled: true,
              fillColor: SellerTheme.surface,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: rxCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Prescriptions (one per line)',
              hintText:
                  'e.g. Metformin 500mg BD\nVitamin D3 2000IU OD',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10)),
              filled: true,
              fillColor: SellerTheme.surface,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.successGreen,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: () {
                final prescriptions = rxCtrl.text
                    .split('\n')
                    .map((s) => s.trim())
                    .where((s) => s.isNotEmpty)
                    .toList();
                context.read<DoctorSellerBloc>().add(CompleteDoctorAppointment(
                  apt.id,
                  diagnosis: diagCtrl.text.trim(),
                  prescriptions: prescriptions,
                  notes: apt.notes,
                ));
                Navigator.pop(ctx);
              },
              child: const Text('Mark as Completed',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _pill(String label, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
            color: c.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8)),
        child: Text(label,
            style: TextStyle(
                fontSize: 10, color: c, fontWeight: FontWeight.w600)),
      );
}
