import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_event.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

/// Appointment Detail Screen
///
/// Shows full appointment information for a single patient.
/// Actions available based on status.
class DoctorAppointmentDetailScreen extends StatefulWidget {
  final dynamic appointment;
  const DoctorAppointmentDetailScreen({super.key, this.appointment});

  @override
  State<DoctorAppointmentDetailScreen> createState() =>
      _DoctorAppointmentDetailScreenState();
}

class _DoctorAppointmentDetailScreenState
    extends State<DoctorAppointmentDetailScreen> {
  static const _doctorBlue = Color(0xFF06B6D4);
  final _notesCtrl = TextEditingController();
  final _diagCtrl  = TextEditingController();
  final _rxCtrl    = TextEditingController();

  AppointmentModel? _apt;

  @override
  void initState() {
    super.initState();
    final arg = widget.appointment;
    if (arg is AppointmentModel) {
      _apt = arg;
      _notesCtrl.text = arg.notes ?? '';
      _diagCtrl.text  = arg.diagnosis ?? '';
      _rxCtrl.text    = arg.prescriptions.join('\n');
    }
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    _diagCtrl.dispose();
    _rxCtrl.dispose();
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
          // Refresh local apt from updated state
          final id = _apt?.id;
          if (id != null) {
            final updated = [
              ...state.upcomingAppointments,
              ...state.completedAppointments,
            ].where((a) => a.id == id).toList();
            if (updated.isNotEmpty && mounted) {
              setState(() => _apt = updated.first);
            }
          }
        }
      },
      child: BlocBuilder<DoctorSellerBloc, DoctorSellerState>(
        builder: (context, state) {
          // Try to refresh apt from BLoC state
          if (_apt != null) {
            final fresh = [
              ...state.upcomingAppointments,
              ...state.completedAppointments,
            ].where((a) => a.id == _apt!.id).toList();
            if (fresh.isNotEmpty) _apt = fresh.first;
          }

          final apt = _apt;
          if (apt == null) {
            return Scaffold(
              appBar: AppBar(
                  backgroundColor: _doctorBlue,
                  foregroundColor: Colors.white,
                  title: const Text('Appointment Detail')),
              body: const Center(child: Text('Appointment not found')),
            );
          }

          final fmt        = DateFormat('EEEE, d MMMM yyyy · h:mm a');
          final isLive     = apt.isInProgress;
          final isComplete = apt.isCompleted;

          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: _doctorBlue,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(apt.id,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.bold)),
                Text(
                  isLive
                      ? '🟢 In Progress'
                      : isComplete
                          ? '✅ Completed'
                          : apt.status == 'pending'
                              ? '⏳ Awaiting Acceptance'
                              : '📅 Upcoming',
                  style: const TextStyle(
                      fontSize: 11, color: Colors.white70),
                ),
              ]),
              actions: [
                if (apt.isVideoType && !isComplete)
                  IconButton(
                    icon: const Icon(Icons.videocam_outlined,
                        color: Colors.white),
                    tooltip: 'Start Video Call',
                    onPressed: () {
                      context
                          .read<DoctorSellerBloc>()
                          .add(StartDoctorVideoCall(apt.id));
                      Navigator.pushNamed(context,
                          SellerRouter.doctorVideoCall,
                          arguments: apt.id);
                    },
                  ),
              ],
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                // ── Patient Card ──────────────────────────────────────────────
                _sectionCard('Patient Information', [
                  _infoRow(Icons.person_outline, 'Name',
                      apt.patientName),
                  if (apt.patientPhone != null)
                    _infoRow(Icons.phone_outlined, 'Phone',
                        apt.patientPhone!),
                  if (apt.patientAge != null)
                    _infoRow(Icons.cake_outlined, 'Age / Gender',
                        apt.patientAge! + (apt.patientGender != null ? ' · ${apt.patientGender}' : '')),
                  if (apt.chiefComplaint != null)
                    _infoRow(Icons.sick_outlined, 'Chief Complaint',
                        apt.chiefComplaint!),
                ]),
                const SizedBox(height: 14),

                // ── Appointment Card ──────────────────────────────────────────
                _sectionCard('Appointment Details', [
                  _infoRow(Icons.calendar_today_outlined, 'Date & Time',
                      fmt.format(apt.scheduledAt)),
                  _infoRow(
                    apt.isVideoType
                        ? Icons.videocam_outlined
                        : Icons.local_hospital_outlined,
                    'Type',
                    apt.isVideoType ? '📹 Video Consultation' : '🏥 In-Person Visit',
                  ),
                  _infoRow(
                    Icons.payments_outlined,
                    'Fee',
                    apt.consultFee > 0
                        ? '${apt.currency} ${apt.consultFee.toStringAsFixed(0)}'
                        : 'NHS — Free',
                  ),
                  _infoRow(
                    apt.isPaid
                        ? Icons.check_circle_outline
                        : Icons.payment_outlined,
                    'Payment',
                    apt.isPaid ? '✅ Paid' : '⏳ Pending',
                  ),
                  if (apt.isNew)
                    _infoRow(Icons.fiber_new_outlined, 'Visit Type',
                        '🔵 New Patient'),
                ]),
                const SizedBox(height: 14),

                // ── Clinical Notes ────────────────────────────────────────────
                _sectionCardRaw(
                  'Clinical Notes',
                  Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    TextField(
                      controller: _notesCtrl,
                      maxLines: 4,
                      enabled: !isComplete,
                      decoration: InputDecoration(
                        hintText:
                            'Vitals, history, observations...',
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10)),
                        filled: true,
                        fillColor: isComplete
                            ? Colors.grey.shade50
                            : SellerTheme.surface,
                      ),
                    ),
                    if (!isComplete) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => context
                              .read<DoctorSellerBloc>()
                              .add(UpdateDoctorNotes(
                                  apt.id, _notesCtrl.text.trim())),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: _doctorBlue,
                            side: const BorderSide(color: _doctorBlue),
                            shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(10)),
                          ),
                          child: const Text('Save Notes'),
                        ),
                      ),
                    ],
                  ]),
                ),
                const SizedBox(height: 14),

                // ── Diagnosis & Prescription (completed or in-progress) ───────
                if (!apt.isUpcoming) ...[
                  _sectionCardRaw(
                    'Diagnosis & Prescription',
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      TextField(
                        controller: _diagCtrl,
                        maxLines: 3,
                        enabled: !isComplete,
                        decoration: InputDecoration(
                          hintText:
                              'Clinical assessment / diagnosis...',
                          labelText: 'Diagnosis',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          filled: true,
                          fillColor: isComplete
                              ? Colors.grey.shade50
                              : SellerTheme.surface,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _rxCtrl,
                        maxLines: 4,
                        enabled: !isComplete,
                        decoration: InputDecoration(
                          hintText:
                              'Metformin 500mg BD\nVitamin D3 2000IU OD...',
                          labelText: 'Prescriptions (one per line)',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          filled: true,
                          fillColor: isComplete
                              ? Colors.grey.shade50
                              : SellerTheme.surface,
                        ),
                      ),
                      if (isComplete)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Row(children: [
                            const Icon(Icons.check_circle_outline,
                                size: 14,
                                color: SellerTheme.successGreen),
                            const SizedBox(width: 6),
                            Text(
                              'Consultation completed · ${DateFormat('d MMM y').format(apt.scheduledAt)}',
                              style: const TextStyle(
                                  color: SellerTheme.successGreen,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600),
                            ),
                          ]),
                        ),
                    ]),
                  ),
                  const SizedBox(height: 14),
                ],

                // ── Action Buttons ────────────────────────────────────────────
                if (!isComplete && apt.status != 'no_show')
                  _buildActionSection(context, apt),

                const SizedBox(height: 60),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionSection(BuildContext context, AppointmentModel apt) {
    final bloc = context.read<DoctorSellerBloc>();

    if (apt.status == 'pending') {
      return Row(children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.close, size: 14, color: SellerTheme.errorRed),
            label: const Text('Decline',
                style: TextStyle(color: SellerTheme.errorRed)),
            onPressed: () =>
                bloc.add(CancelDoctorAppointment(apt.id, 'Doctor unavailable')),
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                  color: SellerTheme.errorRed.withValues(alpha: 0.4)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.check, size: 14),
            label: const Text('Accept Appointment',
                style: TextStyle(fontWeight: FontWeight.bold)),
            onPressed: () =>
                bloc.add(AcceptAppointmentRequest(apt.id)),
            style: ElevatedButton.styleFrom(
              backgroundColor: _doctorBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 12),
              elevation: 0,
            ),
          ),
        ),
      ]);
    }

    if (apt.status == 'upcoming') {
      return Column(children: [
        Row(children: [
          if (apt.isVideoType)
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.videocam, size: 14),
                label: const Text('Start Video Call',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () {
                  bloc.add(StartDoctorVideoCall(apt.id));
                  Navigator.pushNamed(context,
                      SellerRouter.doctorVideoCall,
                      arguments: apt.id);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _doctorBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                ),
              ),
            )
          else
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.local_hospital_outlined,
                    size: 14),
                label: const Text('Start Consultation',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () =>
                    bloc.add(StartDoctorConsultation(apt.id)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: SellerTheme.successGreen,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                ),
              ),
            ),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () =>
                  bloc.add(MarkPatientNoShow(apt.id)),
              style: OutlinedButton.styleFrom(
                foregroundColor: SellerTheme.warningAmber,
                side: BorderSide(
                    color: SellerTheme.warningAmber
                        .withValues(alpha: 0.4)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('No Show'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton(
              onPressed: () =>
                  bloc.add(CancelDoctorAppointment(apt.id, 'Cancelled')),
              style: OutlinedButton.styleFrom(
                foregroundColor: SellerTheme.errorRed,
                side: BorderSide(
                    color:
                        SellerTheme.errorRed.withValues(alpha: 0.4)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Cancel'),
            ),
          ),
        ]),
      ]);
    }

    if (apt.status == 'in_progress') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.done_all, size: 14),
          label: const Text('Complete Consultation',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          onPressed: () {
            final prescriptions = _rxCtrl.text
                .split('\n')
                .map((s) => s.trim())
                .where((s) => s.isNotEmpty)
                .toList();
            bloc.add(CompleteDoctorAppointment(
              apt.id,
              diagnosis: _diagCtrl.text.trim(),
              prescriptions: prescriptions,
              notes: _notesCtrl.text.trim(),
            ));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: SellerTheme.successGreen,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            elevation: 0,
          ),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Widget _sectionCard(String title, List<Widget> rows) => Container(
        margin: const EdgeInsets.only(bottom: 2),
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          ...rows.map((r) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4), child: r)),
        ]),
      );

  Widget _sectionCardRaw(String title, Widget child) => Container(
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          child,
        ]),
      );

  Widget _infoRow(IconData icon, String label, String value) => Row(children: [
        Icon(icon, size: 15, color: SellerTheme.textMuted),
        const SizedBox(width: 10),
        Text('$label: ',
            style: const TextStyle(
                color: SellerTheme.textSecondary,
                fontSize: 12)),
        Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                    color: SellerTheme.textPrimary),
                overflow: TextOverflow.ellipsis)),
      ]);
}
