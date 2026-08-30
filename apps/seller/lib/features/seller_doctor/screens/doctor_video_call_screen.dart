import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_event.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Video Call Screen
///
/// Simulates a real-time telemedicine video session:
///   • Pulsing avatar (ringing → in-call)
///   • Elapsed timer
///   • Mute, camera toggle, end call controls
///   • Patient info overlay
///   • Auto-transitions: ringing → in_call after 3s
///   • End call → dispatches EndDoctorVideoCall + Complete dialog
class DoctorVideoCallScreen extends StatefulWidget {
  final String appointmentId;
  const DoctorVideoCallScreen({super.key, required this.appointmentId});

  @override
  State<DoctorVideoCallScreen> createState() => _DoctorVideoCallScreenState();
}

class _DoctorVideoCallScreenState extends State<DoctorVideoCallScreen>
    with SingleTickerProviderStateMixin {
  static const _doctorBlue = Color(0xFF06B6D4);

  bool _muted       = false;
  bool _camOff      = false;
  bool _speakerOn   = true;
  bool _showNotes   = false;
  bool _isConnected = false;
  int  _elapsedSec  = 0;

  Timer? _connectTimer;
  Timer? _elapsedTimer;

  late AnimationController _pulsCtrl;
  late Animation<double>   _pulsAnim;
  late Animation<double>   _pulsAnim2;

  final _notesCtrl  = TextEditingController();

  AppointmentModel? get _apt {
    final state = context.read<DoctorSellerBloc>().state;
    final all   = [...state.upcomingAppointments, ...state.completedAppointments];
    try {
      return all.firstWhere((a) => a.id == widget.appointmentId);
    } catch (_) {
      return null;
    }
  }

  @override
  void initState() {
    super.initState();
    _pulsCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    _pulsAnim  = Tween(begin: 0.6, end: 1.0)
        .animate(CurvedAnimation(parent: _pulsCtrl, curve: Curves.easeInOut));
    _pulsAnim2 = Tween(begin: 80.0, end: 110.0)
        .animate(CurvedAnimation(parent: _pulsCtrl, curve: Curves.easeInOut));

    // Simulate ringing for 3 seconds then connect
    _connectTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      setState(() => _isConnected = true);
      context.read<DoctorSellerBloc>().add(DoctorCallReady(widget.appointmentId));
      _startElapsedTimer();
    });
  }

  void _startElapsedTimer() {
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _elapsedSec++);
    });
  }

  @override
  void dispose() {
    _pulsCtrl.dispose();
    _connectTimer?.cancel();
    _elapsedTimer?.cancel();
    _notesCtrl.dispose();
    super.dispose();
  }

  String get _elapsed {
    final m = (_elapsedSec ~/ 60).toString().padLeft(2, '0');
    final s = (_elapsedSec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SellerBloc, dynamic>(
      builder: (context, ss) =>
          BlocBuilder<DoctorSellerBloc, DoctorSellerState>(
        builder: (context, state) {
          final apt = _apt;
          final doctorName =
              state.doctorProfile?.name ?? ss.country?.name ?? 'Doctor';

          return Scaffold(
            backgroundColor: const Color(0xFF0D1117),
            body: Stack(children: [
              // ── Patient video panel (simulated) ────────────────────────────
              _buildRemoteVideo(apt),

              // ── Self video (PiP) ───────────────────────────────────────────
              Positioned(
                top: 60,
                right: 16,
                child: _buildSelfPip(doctorName),
              ),

              // ── Top overlay bar ─────────────────────────────────────────────
              Positioned(
                top: 0, left: 0, right: 0,
                child: _buildTopBar(context, apt),
              ),

              // ── Status / Timer ──────────────────────────────────────────────
              Positioned(
                top: 120,
                left: 0, right: 0,
                child: _buildStatusBanner(),
              ),

              // ── Notes panel ─────────────────────────────────────────────────
              if (_showNotes)
                Positioned(
                  bottom: 120, left: 16, right: 16,
                  child: _buildNotesPanel(apt),
                ),

              // ── Bottom controls ─────────────────────────────────────────────
              Positioned(
                bottom: 0, left: 0, right: 0,
                child: _buildControls(context, apt, state),
              ),
            ]),
          );
        },
      ),
    );
  }

  // ── Remote video (simulated patient view) ─────────────────────────────────

  Widget _buildRemoteVideo(AppointmentModel? apt) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0D1B2A), Color(0xFF1B263B)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Center(
        child: _isConnected
            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                // Simulated patient avatar (no real video)
                Container(
                  width: 140, height: 140,
                  decoration: BoxDecoration(
                    color: _doctorBlue.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: _doctorBlue.withValues(alpha: 0.4), width: 2),
                  ),
                  child: Center(
                    child: Text(
                      apt != null && apt.patientName.isNotEmpty
                          ? apt.patientName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 56,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  apt?.patientName ?? 'Patient',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold),
                ),
                Text(
                  apt?.chiefComplaint ?? 'Consultation',
                  style: const TextStyle(color: Colors.white60, fontSize: 13),
                ),
              ])
            : AnimatedBuilder(
                animation: _pulsAnim2,
                builder: (_, __) => Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                  Container(
                    width: _pulsAnim2.value,
                    height: _pulsAnim2.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _doctorBlue.withValues(alpha: 0.12),
                      border: Border.all(
                          color: _doctorBlue.withValues(alpha: 0.4), width: 2),
                    ),
                    child: Center(
                      child: Text(
                        apt != null && apt.patientName.isNotEmpty
                            ? apt.patientName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 40,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(apt?.patientName ?? 'Patient',
                      style: const TextStyle(
                          color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  AnimatedBuilder(
                    animation: _pulsAnim,
                    builder: (_, __) => Opacity(
                      opacity: _pulsAnim.value,
                      child: const Text('Ringing...',
                          style: TextStyle(color: Colors.white60, fontSize: 14)),
                    ),
                  ),
                ]),
              ),
      ),
    );
  }

  // ── Self PiP ──────────────────────────────────────────────────────────────

  Widget _buildSelfPip(String doctorName) {
    return Container(
      width: 90, height: 130,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: _camOff ? const Color(0xFF1E2A38) : const Color(0xFF1A3A4A),
        border: Border.all(color: Colors.white24),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 8)],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _camOff
            ? Center(
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                  const Icon(Icons.videocam_off_outlined,
                      color: Colors.white38, size: 22),
                  const SizedBox(height: 4),
                  Text(doctorName.split(' ').last,
                      style: const TextStyle(
                          color: Colors.white54, fontSize: 8)),
                ]))
            : Stack(children: [
                Container(
                  color: const Color(0xFF0A6B8A),
                  child: Center(
                    child: Text(
                      doctorName.isNotEmpty ? doctorName[0] : 'D',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 4, left: 0, right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      color: Colors.black45,
                      child: const Text('You',
                          style: TextStyle(color: Colors.white, fontSize: 8)),
                    ),
                  ),
                ),
              ]),
      ),
    );
  }

  // ── Top bar ───────────────────────────────────────────────────────────────

  Widget _buildTopBar(BuildContext context, AppointmentModel? apt) {
    return Container(
      padding: EdgeInsets.fromLTRB(
          16, MediaQuery.of(context).padding.top + 8, 16, 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Row(children: [
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: const Icon(Icons.arrow_back, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            apt?.patientName ?? 'Patient',
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 15),
          ),
          Text(
            apt?.chiefComplaint ?? 'Video Consultation',
            style: const TextStyle(color: Colors.white60, fontSize: 11),
          ),
        ]),
        const Spacer(),
        if (_isConnected)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: SellerTheme.successGreen.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(children: [
              Container(
                  width: 6, height: 6,
                  decoration: const BoxDecoration(
                      color: Colors.white, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Text(_elapsed,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold)),
            ]),
          )
        else
          const Icon(Icons.signal_cellular_alt, color: Colors.white54, size: 18),
      ]),
    );
  }

  // ── Status banner ─────────────────────────────────────────────────────────

  Widget _buildStatusBanner() {
    if (_isConnected) return const SizedBox.shrink();
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black45,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Text(
          'Connecting...',
          style: TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ),
    );
  }

  // ── Notes panel ───────────────────────────────────────────────────────────

  Widget _buildNotesPanel(AppointmentModel? apt) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B).withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Consultation Notes',
            style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13)),
        const SizedBox(height: 8),
        TextField(
          controller: _notesCtrl,
          maxLines: 3,
          style: const TextStyle(color: Colors.white, fontSize: 12),
          decoration: InputDecoration(
            hintText: 'Vitals, symptoms, observations...',
            hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Colors.white24)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: _doctorBlue.withValues(alpha: 0.6))),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.05),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () {
              if (apt != null) {
                context.read<DoctorSellerBloc>().add(
                    UpdateDoctorNotes(apt.id, _notesCtrl.text.trim()));
              }
              setState(() => _showNotes = false);
            },
            child: const Text('Save & Close',
                style: TextStyle(color: _doctorBlue, fontSize: 12)),
          ),
        ),
      ]),
    );
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  Widget _buildControls(BuildContext context, AppointmentModel? apt,
      DoctorSellerState state) {
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 16, 20, MediaQuery.of(context).padding.bottom + 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.transparent, Colors.black.withValues(alpha: 0.8)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _controlBtn(
            _muted ? Icons.mic_off_outlined : Icons.mic_outlined,
            _muted ? 'Unmute' : 'Mute',
            _muted ? SellerTheme.warningAmber : Colors.white,
            () => setState(() => _muted = !_muted),
          ),
          _controlBtn(
            _camOff ? Icons.videocam_off_outlined : Icons.videocam_outlined,
            _camOff ? 'Cam Off' : 'Camera',
            _camOff ? SellerTheme.warningAmber : Colors.white,
            () => setState(() => _camOff = !_camOff),
          ),
          _controlBtn(
            _speakerOn ? Icons.volume_up_outlined : Icons.volume_off_outlined,
            _speakerOn ? 'Speaker' : 'Earpiece',
            _speakerOn ? _doctorBlue : Colors.white,
            () => setState(() => _speakerOn = !_speakerOn),
          ),
          _controlBtn(
            Icons.note_outlined,
            'Notes',
            _showNotes ? _doctorBlue : Colors.white,
            () => setState(() => _showNotes = !_showNotes),
          ),
          // End Call
          GestureDetector(
            onTap: () => _endCall(context, apt),
            child: Column(children: [
              Container(
                width: 60, height: 60,
                decoration: const BoxDecoration(
                  color: SellerTheme.errorRed,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.call_end, color: Colors.white, size: 26),
              ),
              const SizedBox(height: 5),
              const Text('End Call',
                  style: TextStyle(color: Colors.white, fontSize: 10)),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _controlBtn(
      IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(children: [
        Container(
          width: 50, height: 50,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(height: 4),
        Text(label,
            style: TextStyle(
                color: color.withValues(alpha: 0.85), fontSize: 9)),
      ]),
    );
  }

  void _endCall(BuildContext context, AppointmentModel? apt) {
    _elapsedTimer?.cancel();
    _connectTimer?.cancel();
    context
        .read<DoctorSellerBloc>()
        .add(EndDoctorVideoCall(widget.appointmentId));

    // Completion dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        final diagCtrl = TextEditingController();
        final rxCtrl   = TextEditingController(text: _notesCtrl.text);
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(children: [
            const Text('📹', style: TextStyle(fontSize: 22)),
            const SizedBox(width: 8),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Call Ended',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('Duration: $_elapsed',
                    style: const TextStyle(
                        color: SellerTheme.textMuted, fontSize: 11)),
              ]),
            ),
          ]),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(
                  controller: diagCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Diagnosis',
                    hintText: 'e.g. Hypertension controlled',
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
                    hintText: 'Amlodipine 5mg OD\nAspirin 75mg OD',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: SellerTheme.surface,
                  ),
                ),
              ]),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              child: const Text('Skip'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: SellerTheme.successGreen,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  elevation: 0),
              onPressed: () {
                final prescriptions = rxCtrl.text
                    .split('\n')
                    .map((s) => s.trim())
                    .where((s) => s.isNotEmpty)
                    .toList();
                context.read<DoctorSellerBloc>().add(
                    CompleteDoctorAppointment(
                  widget.appointmentId,
                  diagnosis: diagCtrl.text.trim(),
                  prescriptions: prescriptions,
                  notes: _notesCtrl.text.trim(),
                ));
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              child: const Text('Complete',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }
}
