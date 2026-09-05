import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_bloc.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_event.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_state.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';

/// Doctor Booking — Practo-style doctor profile with slot selection and booking.
class DoctorBookingScreen extends StatefulWidget {
  final String doctorName;
  const DoctorBookingScreen({super.key, this.doctorName = 'Dr. Sarah Kamau'});

  @override
  State<DoctorBookingScreen> createState() => _DoctorBookingScreenState();
}

class _DoctorBookingScreenState extends State<DoctorBookingScreen> {
  int _selectedDate = 1;
  int _selectedSlot = -1;

  final _dates = ['Today\nMay 28', 'Tomorrow\nMay 29', 'Thu\nMay 30', 'Fri\nMay 31', 'Sat\nJun 1'];
  final _morningSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'];
  final _afternoonSlots = ['2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM'];
  final _eveningSlots = ['5:00 PM', '5:30 PM', '6:00 PM'];
  
  List<String> get _allSlots => [..._morningSlots, ..._afternoonSlots, ..._eveningSlots];

  @override
  Widget build(BuildContext context) {
    return BlocListener<DoctorBloc, DoctorState>(
      listener: (context, state) {
        if (state.status == DoctorStatus.booked) {
          _showConfirmation(context);
        } else if (state.status == DoctorStatus.error) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.errorMessage ?? 'Failed to book appointment')));
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FB),
        appBar: AppBar(backgroundColor: Colors.white, title: const Text('Book Appointment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
        body: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Doctor card
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Row(children: [
                KartseekImage(
                  url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop',
                  width: 72,
                  height: 72,
                  fit: BoxFit.cover,
                  borderRadius: BorderRadius.circular(16),
                ),
                const SizedBox(width: 16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(widget.doctorName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Cardiologist • MBBS, MD', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                  const SizedBox(height: 6),
                  Row(children: [
                    Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(4)), child: Row(children: [Icon(Icons.star, size: 12, color: Colors.green.shade700), const SizedBox(width: 2), Text('4.9', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.green.shade700))])),
                    const SizedBox(width: 10),
                    Text('15 yrs exp.', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    const SizedBox(width: 10),
                    Text('2,341 patients', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ]),
                ])),
              ]),
            ),
            // Consultation fee
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppTheme.doctorColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                const Icon(Icons.currency_rupee, size: 20, color: AppTheme.doctorColor),
                const SizedBox(width: 10),
                const Text('Consultation Fee', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const Spacer(),
                Text('${RegionService.instance.currentCountry.currencySymbol} 800', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.doctorColor)),
              ]),
            ),
            // Date selector
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text('Select Date', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            ),
            SizedBox(
              height: 80,
              child: ListView.builder(
                scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: _dates.length,
                itemBuilder: (_, i) {
                  final sel = i == _selectedDate;
                  return GestureDetector(
                    onTap: () => setState(() { _selectedDate = i; _selectedSlot = -1; }),
                    child: Container(
                      width: 80, margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: sel ? AppTheme.doctorColor : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: sel ? AppTheme.doctorColor : const Color(0xFFE5E7EB)),
                      ),
                      child: Center(child: Text(_dates[i], textAlign: TextAlign.center, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: sel ? Colors.white : AppTheme.textPrimary, height: 1.4))),
                    ),
                  );
                },
              ),
            ),
            // Time slots
            _slotSection('🌅 Morning', _morningSlots, 0),
            _slotSection('☀️ Afternoon', _afternoonSlots, _morningSlots.length),
            _slotSection('🌇 Evening', _eveningSlots, _morningSlots.length + _afternoonSlots.length),
            const SizedBox(height: 100),
          ]),
        ),
        bottomNavigationBar: BlocBuilder<DoctorBloc, DoctorState>(
          builder: (context, state) {
            final isBooking = state.status == DoctorStatus.booking;
            return Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, -4))]),
              child: SizedBox(
                height: 56, width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_selectedSlot >= 0 && !isBooking) ? () {
                    context.read<DoctorBloc>().add(BookAppointment(
                      doctorId: 'd1',
                      date: _dates[_selectedDate].replaceAll('\n', ' '),
                      timeSlot: _allSlots[_selectedSlot],
                      consultationType: 'Walk-in',
                    ));
                  } : null,
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.doctorColor, disabledBackgroundColor: Colors.grey.shade300, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                  child: isBooking 
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(_selectedSlot >= 0 ? 'Book Appointment • ${RegionService.instance.currentCountry.currencySymbol} 800' : 'Select a time slot', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            );
          }
        ),
      ),
    );
  }

  Widget _slotSection(String title, List<String> slots, int offset) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Wrap(spacing: 10, runSpacing: 10, children: List.generate(slots.length, (i) {
          final idx = offset + i;
          final sel = idx == _selectedSlot;
          return GestureDetector(
            onTap: () => setState(() => _selectedSlot = idx),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: sel ? AppTheme.doctorColor : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: sel ? AppTheme.doctorColor : const Color(0xFFE5E7EB)),
              ),
              child: Text(slots[i], style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: sel ? Colors.white : AppTheme.textPrimary)),
            ),
          );
        })),
      ]),
    );
  }

  void _showConfirmation(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 56, height: 56, decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle), child: Icon(Icons.check_circle, size: 36, color: Colors.green.shade600)),
          const SizedBox(height: 16),
          const Text('Appointment Booked! ✅', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('${widget.doctorName}\n${_dates[_selectedDate].replaceAll('\n', ' ')}', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey.shade500, height: 1.5)),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, height: 52, child: ElevatedButton(
            onPressed: () { 
              Navigator.pop(context); // close bottom sheet
              Navigator.pop(context); // return to home screen
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.doctorColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Done', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
          )),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }
}
