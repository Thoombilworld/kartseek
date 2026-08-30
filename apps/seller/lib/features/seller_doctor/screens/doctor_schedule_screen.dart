import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_event.dart';

import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class DoctorScheduleScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const DoctorScheduleScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<DoctorScheduleScreen> createState() => _DoctorScheduleScreenState();
}

class _DoctorScheduleScreenState extends State<DoctorScheduleScreen> {
  static const _doctorBlue = Color(0xFF06B6D4);

  // Days relative to today
  late List<DateTime> _week;
  int _selectedDay = 0;

  // Working hours toggle (country-aware defaults applied in initState)
  bool _mondayOn = true, _tuesdayOn = true, _wednesdayOn = true,
       _thursdayOn = true, _fridayOn = true, _saturdayOn = false, _sundayOn = false;

  // Slot time blocks
  final List<_TimeSlot> _slots = [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _week = List.generate(7, (i) => now.add(Duration(days: i)));
    context.read<DoctorSellerBloc>().add(const LoadDoctorSchedule());
    _initSlots();

    // Country-specific working day defaults
    final cc = context.read<SellerBloc>().state.countryCode;
    if (['QA', 'AE', 'SA', 'BH', 'KW', 'OM'].contains(cc)) {
      // Gulf: Sun–Thu working, Fri–Sat off
      _saturdayOn = false;
      _sundayOn   = true;
      _fridayOn   = false;
    }
  }

  void _initSlots() {
    _slots.clear();
    final times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                   '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
                   '16:00', '16:30', '17:00', '17:30'];
    for (var t in times) {
      _slots.add(_TimeSlot(time: t, isBlocked: t == '10:00' || t == '14:30'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final ss  = context.read<SellerBloc>().state;
    final cc  = ss.countryCode;
    final isGulf = ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'].contains(cc);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _doctorBlue,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Schedule & Availability · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          TextButton(
            onPressed: _saveSchedule,
            child: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Working days
        _sectionCard('Working Days', _buildWorkingDays(isGulf)),
        const SizedBox(height: 14),
        // Date strip
        _buildDateStrip(),
        const SizedBox(height: 14),
        // Time slots
        _sectionCard('Time Slots — ${_dayName(_week[_selectedDay])}', _buildSlotGrid()),
        const SizedBox(height: 14),
        // Consultation type
        _sectionCard('Consultation Mode', _buildConsultationType(ss)),
        const SizedBox(height: 14),
        // Break times
        _sectionCard('Break / Lunch', _buildBreakSettings()),
        const SizedBox(height: 40),
      ]),
    );
  }

  // ── Working days ────────────────────────────────────────────────────────────

  Widget _buildWorkingDays(bool isGulf) {
    final days = isGulf
        ? [('Sun', true, () => setState(() => _sundayOn = !_sundayOn), _sundayOn),
           ('Mon', true, () => setState(() => _mondayOn = !_mondayOn), _mondayOn),
           ('Tue', true, () => setState(() => _tuesdayOn = !_tuesdayOn), _tuesdayOn),
           ('Wed', true, () => setState(() => _wednesdayOn = !_wednesdayOn), _wednesdayOn),
           ('Thu', true, () => setState(() => _thursdayOn = !_thursdayOn), _thursdayOn),
           ('Fri', false, () => setState(() => _fridayOn = !_fridayOn), _fridayOn),
           ('Sat', false, () => setState(() => _saturdayOn = !_saturdayOn), _saturdayOn),]
        : [('Mon', true, () => setState(() => _mondayOn = !_mondayOn), _mondayOn),
           ('Tue', true, () => setState(() => _tuesdayOn = !_tuesdayOn), _tuesdayOn),
           ('Wed', true, () => setState(() => _wednesdayOn = !_wednesdayOn), _wednesdayOn),
           ('Thu', true, () => setState(() => _thursdayOn = !_thursdayOn), _thursdayOn),
           ('Fri', true, () => setState(() => _fridayOn = !_fridayOn), _fridayOn),
           ('Sat', false, () => setState(() => _saturdayOn = !_saturdayOn), _saturdayOn),
           ('Sun', false, () => setState(() => _sundayOn = !_sundayOn), _sundayOn),];

    return Row(
      children: days.map((d) {
        final active = d.$4;
        return Expanded(child: GestureDetector(
          onTap: d.$3,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: active ? _doctorBlue : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: active ? _doctorBlue : SellerTheme.border),
            ),
            child: Column(children: [
              Text(d.$1, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold,
                  color: active ? Colors.white : SellerTheme.textMuted)),
              const SizedBox(height: 4),
              Icon(active ? Icons.check_circle : Icons.cancel_outlined,
                  size: 14, color: active ? Colors.white : SellerTheme.textMuted),
            ]),
          ),
        ));
      }).toList(),
    );
  }

  // ── Date strip ──────────────────────────────────────────────────────────────

  Widget _buildDateStrip() => SizedBox(
    height: 72,
    child: ListView.builder(
      scrollDirection: Axis.horizontal,
      itemCount: _week.length,
      itemBuilder: (ctx, i) {
        final d      = _week[i];
        final active = _selectedDay == i;
        final isToday = i == 0;
        return GestureDetector(
          onTap: () => setState(() => _selectedDay = i),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.only(right: 8),
            width: 56,
            decoration: BoxDecoration(
              color: active ? _doctorBlue : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: active ? _doctorBlue : SellerTheme.border),
              boxShadow: active ? [BoxShadow(color: _doctorBlue.withValues(alpha: 0.25), blurRadius: 8)] : [],
            ),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_dayAbbr(d), style: TextStyle(fontSize: 10,
                  color: active ? Colors.white70 : SellerTheme.textMuted)),
              Text('${d.day}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold,
                  color: active ? Colors.white : SellerTheme.textPrimary)),
              if (isToday) Container(
                width: 5, height: 5,
                decoration: BoxDecoration(
                  color: active ? Colors.white : _doctorBlue,
                  shape: BoxShape.circle,
                ),
              ),
            ]),
          ),
        );
      },
    ),
  );

  // ── Slot grid ───────────────────────────────────────────────────────────────

  Widget _buildSlotGrid() => GridView.builder(
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 4, childAspectRatio: 2.0, crossAxisSpacing: 8, mainAxisSpacing: 8,
    ),
    itemCount: _slots.length,
    itemBuilder: (ctx, i) {
      final s = _slots[i];
      return GestureDetector(
        onTap: () => setState(() => _slots[i] = s.copyWith(isBlocked: !s.isBlocked)),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: s.isBlocked ? Colors.grey.shade200 : _doctorBlue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: s.isBlocked ? SellerTheme.border : _doctorBlue.withValues(alpha: 0.4),
            ),
          ),
          child: Center(child: Text(s.time, style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600,
            color: s.isBlocked ? SellerTheme.textMuted : _doctorBlue,
            decoration: s.isBlocked ? TextDecoration.lineThrough : null,
          ))),
        ),
      );
    },
  );

  // ── Consultation type ───────────────────────────────────────────────────────

  bool _videoEnabled = true;
  bool _inPersonEnabled = true;
  double _consultFee = 150.0;

  Widget _buildConsultationType(dynamic ss) {
    final cur = ss.country.currencySymbol as String;
    return Column(children: [
      _switchRow('🎥  Video Consultations', _videoEnabled, (v) => setState(() => _videoEnabled = v)),
      const Divider(height: 16),
      _switchRow('🏥  In-Person Visits', _inPersonEnabled, (v) => setState(() => _inPersonEnabled = v)),
      const Divider(height: 16),
      Row(children: [
        const Expanded(child: Text('💰  Consultation Fee', style: TextStyle(fontSize: 13))),
        GestureDetector(
          onTap: () => _feeDialog(cur),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _doctorBlue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _doctorBlue.withValues(alpha: 0.3)),
            ),
            child: Text('$cur ${_consultFee.toStringAsFixed(0)} / session',
                style: const TextStyle(fontWeight: FontWeight.bold, color: _doctorBlue, fontSize: 12)),
          ),
        ),
      ]),
    ]);
  }

  void _feeDialog(String cur) {
    final ctrl = TextEditingController(text: _consultFee.toStringAsFixed(0));
    showDialog(context: context, builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('Set Consultation Fee'),
      content: TextField(
        controller: ctrl, keyboardType: TextInputType.number, autofocus: true,
        decoration: InputDecoration(labelText: 'Fee ($cur)', border: const OutlineInputBorder()),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: _doctorBlue, foregroundColor: Colors.white),
          onPressed: () {
            setState(() => _consultFee = double.tryParse(ctrl.text) ?? _consultFee);
            Navigator.pop(ctx);
          },
          child: const Text('Save'),
        ),
      ],
    ));
  }

  // ── Break settings ──────────────────────────────────────────────────────────

  String _breakStart = '13:00';
  String _breakEnd   = '14:00';

  Widget _buildBreakSettings() => Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Start', style: TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
      _timeChip(_breakStart, () async {
        final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 13, minute: 0));
        if (t != null) setState(() => _breakStart = t.format(context));
      }),
    ])),
    const SizedBox(width: 16),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('End', style: TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
      _timeChip(_breakEnd, () async {
        final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 14, minute: 0));
        if (t != null) setState(() => _breakEnd = t.format(context));
      }),
    ])),
  ]);

  Widget _timeChip(String t, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: _doctorBlue.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _doctorBlue.withValues(alpha: 0.3)),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.access_time, size: 14, color: _doctorBlue),
        const SizedBox(width: 6),
        Text(t, style: const TextStyle(fontWeight: FontWeight.bold, color: _doctorBlue)),
      ]),
    ),
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────

  Widget _sectionCard(String title, Widget child) => Container(
    padding: const EdgeInsets.all(16),
    decoration: SellerTheme.elevatedCard(),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      const SizedBox(height: 14),
      child,
    ]),
  );

  Widget _switchRow(String label, bool val, ValueChanged<bool> cb) => Row(children: [
    Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
    Switch(value: val, onChanged: cb, activeTrackColor: _doctorBlue),
  ]);

  String _dayAbbr(DateTime d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday - 1];
  String _dayName(DateTime d) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d.weekday - 1];

  void _saveSchedule() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Schedule saved ✅'),
      backgroundColor: SellerTheme.successGreen,
      behavior: SnackBarBehavior.floating,
    ));
  }
}

// ─── TimeSlot model ───────────────────────────────────────────────────────────

class _TimeSlot {
  final String time;
  final bool isBlocked;
  const _TimeSlot({required this.time, this.isBlocked = false});
  _TimeSlot copyWith({bool? isBlocked}) => _TimeSlot(time: time, isBlocked: isBlocked ?? this.isBlocked);
}
