import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_event.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_state.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';

class DoctorSellerBloc extends Bloc<DoctorSellerEvent, DoctorSellerState> {
  final SellerApiService _api;

  DoctorSellerBloc({SellerApiService? api})
      : _api = api ?? SellerApiService.instance,
        super(const DoctorSellerState()) {
    on<LoadDoctorDashboard>(_onLoadDashboard);
    on<LoadDoctorAppointments>(_onLoadAppointments);
    on<SelectAppointmentTab>(_onSelectTab);
    on<AcceptAppointmentRequest>(_onAccept);
    on<StartDoctorConsultation>(_onStartConsult);
    on<StartDoctorVideoCall>(_onStartVideoCall);
    on<EndDoctorVideoCall>(_onEndVideoCall);
    on<CompleteDoctorAppointment>(_onComplete);
    on<CancelDoctorAppointment>(_onCancel);
    on<MarkPatientNoShow>(_onNoShow);
    on<UpdateDoctorNotes>(_onUpdateNotes);
    on<RescheduleDoctorAppointment>(_onReschedule);
    on<LoadDoctorSchedule>(_onLoadSchedule);
    on<ToggleTimeSlotAvailability>(_onToggleSlot);
    on<UpdateConsultationFee>(_onUpdateFee);
    on<UpdateDoctorAvailability>(_onToggleAvailable);
    on<BlockTimeSlot>(_onBlockSlot);
    // Backward compat
    on<StartAppointment>(_onStartLegacy);
    on<CompleteAppointment>(_onCompleteLegacy);
    on<InitiateVideoCall>(_onInitiateCall);
    on<DoctorCallReady>(_onCallReady);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  Future<void> _onLoadDashboard(
      LoadDoctorDashboard event, Emitter<DoctorSellerState> emit) async {
    emit(state.copyWith(status: DoctorBlocStatus.loading));
    try {
      final data = await _api.getDashboard();
      emit(state.copyWith(status: DoctorBlocStatus.loaded, dashboardData: data));
    } catch (_) {
      final d = _mockDashboard(event.countryCode);
      emit(state.copyWith(
        status: DoctorBlocStatus.loaded,
        dashboardData: d,
        doctorProfile: _mockProfile(event.countryCode),
        consultFee: (d['consult_fee'] as num).toDouble(),
      ));
    }
    add(LoadDoctorAppointments(countryCode: event.countryCode));
    add(LoadDoctorSchedule(countryCode: event.countryCode));
  }

  // ── Appointments ───────────────────────────────────────────────────────────

  Future<void> _onLoadAppointments(
      LoadDoctorAppointments event, Emitter<DoctorSellerState> emit) async {
    emit(state.copyWith(status: DoctorBlocStatus.loading));
    final upcoming   = _mockUpcoming(event.countryCode);
    final completed  = _mockCompleted(event.countryCode);
    emit(state.copyWith(
      status: DoctorBlocStatus.loaded,
      upcomingAppointments: upcoming,
      completedAppointments: completed,
    ));
  }

  void _onSelectTab(SelectAppointmentTab event, Emitter<DoctorSellerState> emit) =>
      emit(state.copyWith(selectedTab: event.tab));

  void _onAccept(AcceptAppointmentRequest event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.map((a) =>
        a.id == event.appointmentId ? a.copyWith(status: 'upcoming') : a).toList();
    emit(state.copyWith(
      upcomingAppointments: updated,
      actionMessage: '✅ Appointment request accepted — patient notified',
      actionSuccess: true,
    ));
  }

  void _onStartConsult(StartDoctorConsultation event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.map((a) =>
        a.id == event.appointmentId ? a.copyWith(status: 'in_progress') : a).toList();
    emit(state.copyWith(
      upcomingAppointments: updated,
      actionMessage: '🏥 Consultation started',
      actionSuccess: true,
    ));
  }

  void _onStartVideoCall(StartDoctorVideoCall event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.map((a) =>
        a.id == event.appointmentId ? a.copyWith(status: 'in_progress') : a).toList();
    emit(state.copyWith(
      upcomingAppointments: updated,
      activeCallAppointmentId: event.appointmentId,
      callStatus: CallStatus.ringing,
      actionMessage: '📹 Starting video call...',
      actionSuccess: true,
    ));
  }

  void _onEndVideoCall(EndDoctorVideoCall event, Emitter<DoctorSellerState> emit) =>
      emit(state.copyWith(callStatus: CallStatus.ended, activeCallAppointmentId: null));

  void _onComplete(CompleteDoctorAppointment event, Emitter<DoctorSellerState> emit) {
    final apt = state.upcomingAppointments.firstWhere(
      (a) => a.id == event.appointmentId,
      orElse: () => AppointmentModel.mock(status: 'in_progress'),
    );
    final upcoming = state.upcomingAppointments.where((a) => a.id != event.appointmentId).toList();
    final done = [
      apt.copyWith(
        status: 'completed',
        notes: event.notes,
        diagnosis: event.diagnosis,
        prescriptions: event.prescriptions,
      ),
      ...state.completedAppointments,
    ];
    emit(state.copyWith(
      upcomingAppointments: upcoming,
      completedAppointments: done,
      callStatus: CallStatus.idle,
      activeCallAppointmentId: null,
      actionMessage: '✅ Appointment completed — follow-up booked if needed',
      actionSuccess: true,
    ));
    _api.updateOrderStatus(event.appointmentId, 'COMPLETED');
  }

  void _onCancel(CancelDoctorAppointment event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.where((a) => a.id != event.appointmentId).toList();
    emit(state.copyWith(
      upcomingAppointments: updated,
      actionMessage: '❌ Appointment cancelled — patient notified',
      actionSuccess: false,
    ));
  }

  void _onNoShow(MarkPatientNoShow event, Emitter<DoctorSellerState> emit) {
    final apt = state.upcomingAppointments.firstWhere(
      (a) => a.id == event.appointmentId,
      orElse: () => AppointmentModel.mock(),
    );
    final upcoming = state.upcomingAppointments.where((a) => a.id != event.appointmentId).toList();
    final done = [apt.copyWith(status: 'no_show'), ...state.completedAppointments];
    emit(state.copyWith(
      upcomingAppointments: upcoming,
      completedAppointments: done,
      actionMessage: '😔 Marked as no-show',
      actionSuccess: false,
    ));
  }

  void _onUpdateNotes(UpdateDoctorNotes event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.map((a) =>
        a.id == event.appointmentId ? a.copyWith(notes: event.notes) : a).toList();
    emit(state.copyWith(
      upcomingAppointments: updated,
      actionMessage: '📝 Notes saved',
      actionSuccess: true,
    ));
  }

  void _onReschedule(RescheduleDoctorAppointment event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.map((a) =>
        a.id == event.appointmentId ? a.copyWith(scheduledAt: event.newTime, status: 'upcoming') : a).toList();
    emit(state.copyWith(
      upcomingAppointments: updated,
      actionMessage: '📅 Appointment rescheduled — patient notified',
      actionSuccess: true,
    ));
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  Future<void> _onLoadSchedule(
      LoadDoctorSchedule event, Emitter<DoctorSellerState> emit) async {
    final now   = DateTime.now();
    final slots = <String, List<Map<String, dynamic>>>{};
    for (int d = 0; d < 7; d++) {
      final date = now.add(Duration(days: d));
      final key  = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      // Gulf countries use 08:00–16:00 (shorter due to prayer times)
      final isGulf = ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'].contains(event.countryCode);
      final times = isGulf
          ? ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
             '13:00','13:30','14:00','14:30','15:00','15:30','16:00']
          : ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
             '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];
      slots[key] = times.asMap().entries.map((e) => {
        'id':        'slot_${key}_${e.key}',
        'time':      e.value,
        'available': e.key % 3 != 0,
        'booked':    e.key % 5 == 0,
      }).toList();
    }
    emit(state.copyWith(weeklySlots: slots));
  }

  void _onToggleSlot(ToggleTimeSlotAvailability event, Emitter<DoctorSellerState> emit) {
    final updated = Map<String, List<Map<String, dynamic>>>.from(state.weeklySlots);
    if (updated.containsKey(event.date)) {
      updated[event.date] = updated[event.date]!.map((s) =>
          s['id'] == event.slotId ? {...s, 'available': event.isAvailable} : s).toList();
    }
    emit(state.copyWith(weeklySlots: updated));
  }

  void _onBlockSlot(BlockTimeSlot event, Emitter<DoctorSellerState> emit) {
    final updated = Map<String, List<Map<String, dynamic>>>.from(state.weeklySlots);
    if (updated.containsKey(event.date)) {
      updated[event.date] = updated[event.date]!.map((s) =>
          s['id'] == event.slotId ? {...s, 'available': false, 'blocked': true} : s).toList();
    }
    emit(state.copyWith(
      weeklySlots: updated,
      actionMessage: 'Time slot blocked',
      actionSuccess: true,
    ));
  }

  void _onUpdateFee(UpdateConsultationFee event, Emitter<DoctorSellerState> emit) =>
      emit(state.copyWith(
        consultFee: event.fee,
        actionMessage: 'Consultation fee updated ✅',
        actionSuccess: true,
      ));

  void _onToggleAvailable(UpdateDoctorAvailability event, Emitter<DoctorSellerState> emit) =>
      emit(state.copyWith(
        isAvailable: event.isAvailable,
        actionMessage: event.isAvailable
            ? '🟢 You are now available for appointments'
            : '🔴 You are now offline',
        actionSuccess: event.isAvailable,
      ));

  // ── Backward compat ────────────────────────────────────────────────────────

  void _onStartLegacy(StartAppointment event, Emitter<DoctorSellerState> emit) {
    final updated = state.upcomingAppointments.map((a) =>
        a.id == event.appointmentId ? a.copyWith(status: 'in_progress') : a).toList();
    emit(state.copyWith(upcomingAppointments: updated, actionMessage: 'Appointment started'));
  }

  void _onCompleteLegacy(CompleteAppointment event, Emitter<DoctorSellerState> emit) {
    final apt = state.upcomingAppointments.firstWhere(
      (a) => a.id == event.appointmentId, orElse: () => AppointmentModel.mock());
    final upcoming = state.upcomingAppointments.where((a) => a.id != event.appointmentId).toList();
    final done = [apt.copyWith(status: 'completed', notes: event.notes), ...state.completedAppointments];
    emit(state.copyWith(upcomingAppointments: upcoming, completedAppointments: done, actionMessage: 'Appointment completed'));
  }

  void _onInitiateCall(InitiateVideoCall event, Emitter<DoctorSellerState> emit) =>
      emit(state.copyWith(activeCallAppointmentId: event.appointmentId, callStatus: CallStatus.ringing));

  void _onCallReady(DoctorCallReady event, Emitter<DoctorSellerState> emit) =>
      emit(state.copyWith(callStatus: CallStatus.inCall));

  // ── Country Mock Data ──────────────────────────────────────────────────────

  static const _countryData = <String, Map<String, dynamic>>{
    'QA': {
      'doctor':      'Dr. Khalid Al Thani',
      'specialty':   'General Practice & Internal Medicine',
      'qual':        'MBBS, MRCP (UK)',
      'hospital':    'Hamad Medical Corporation, Doha',
      'patients':    248, 'today': 12, 'rating': 4.9,
      'consult_fee': 250, 'currency': 'QAR',
      'weekly':      [8800.0, 9200.0, 10500.0, 11200.0, 12800.0, 14400.0, 11200.0],
      'names':       ['Mohammed Al Kuwari', 'Fatima Hassan', 'Ahmed Jaber', 'Sara Al Marri', 'Yousef Al Rashid', 'Noura Al Attiyah'],
      'phones':      ['+974 5512 3456', '+974 5543 7891', '+974 5567 2345', '+974 5589 1234', '+974 5512 9876', '+974 5534 5678'],
      'complaints':  ['Hypertension follow-up', 'Diabetes management', 'Chest pain evaluation', 'Routine check-up', 'Migraine & headache', 'Thyroid review'],
    },
    'IN': {
      'doctor':      'Dr. Priya Sharma',
      'specialty':   'General Medicine & Family Practice',
      'qual':        'MBBS, MD (Internal Medicine)',
      'hospital':    'Lilavati Hospital, Mumbai',
      'patients':    1842, 'today': 28, 'rating': 4.8,
      'consult_fee': 800, 'currency': 'INR',
      'weekly':      [18400.0, 20800.0, 22400.0, 24800.0, 26400.0, 28800.0, 24800.0],
      'names':       ['Rahul Mehta', 'Sneha Patel', 'Arjun Kumar', 'Priya Gupta', 'Amit Sharma', 'Kavita Reddy'],
      'phones':      ['+91 98201 34567', '+91 97692 45678', '+91 96543 12345', '+91 95432 67890', '+91 94321 56789', '+91 93210 45678'],
      'complaints':  ['Diabetes follow-up', 'Fever & cough', 'BP monitoring', 'Vitamin D deficiency', 'Thyroid disorder', 'Back pain'],
    },
    'AE': {
      'doctor':      'Dr. Omar Al Rashid',
      'specialty':   'Internal Medicine & Cardiology',
      'qual':        'MBBS, FRCP (Edinburgh)',
      'hospital':    'Cleveland Clinic Abu Dhabi',
      'patients':    534, 'today': 15, 'rating': 4.9,
      'consult_fee': 400, 'currency': 'AED',
      'weekly':      [14800.0, 16200.0, 17600.0, 19200.0, 21600.0, 24000.0, 19200.0],
      'names':       ['Hassan Al Maktoum', 'Laila Al Falasi', 'Yousef Bin Ali', 'Mariam Hassan', 'Saif Al Ketbi', 'Reem Juma'],
      'phones':      ['+971 50 123 4567', '+971 55 987 6543', '+971 56 234 5678', '+971 52 345 6789', '+971 58 456 7890', '+971 54 567 8901'],
      'complaints':  ['Annual health check', 'Cardiac risk assessment', 'Diabetes control', 'Hypertension', 'Sleep apnea', 'Obesity management'],
    },
    'SA': {
      'doctor':      'Dr. Abdullah Al Ghamdi',
      'specialty':   'Family Medicine & Diabetes',
      'qual':        'MBBS, ABFM, Arab Board',
      'hospital':    'King Faisal Specialist Hospital, Riyadh',
      'patients':    712, 'today': 18, 'rating': 4.7,
      'consult_fee': 350, 'currency': 'SAR',
      'weekly':      [12600.0, 13800.0, 15400.0, 17200.0, 19600.0, 22400.0, 17200.0],
      'names':       ['Fahad Al Otaibi', 'Nora Al Qahtani', 'Sultan Al Harbi', 'Reem Al Zahrani', 'Waleed Al Shehri', 'Hessa Al Dosari'],
      'phones':      ['+966 50 123 4567', '+966 55 987 6543', '+966 53 456 7890', '+966 59 876 5432', '+966 56 654 3210', '+966 58 765 4321'],
      'complaints':  ['Diabetes follow-up', 'Post-Ramadan check', 'Hypertension review', 'Weight management', 'Vitamin deficiency', 'Cholesterol control'],
    },
    'KE': {
      'doctor':      'Dr. Grace Waweru',
      'specialty':   'General Practice & Tropical Medicine',
      'qual':        'MBChB, MMed (Internal Medicine)',
      'hospital':    'Aga Khan University Hospital, Nairobi',
      'patients':    2341, 'today': 32, 'rating': 4.8,
      'consult_fee': 3500, 'currency': 'KES',
      'weekly':      [88400.0, 96800.0, 108000.0, 120400.0, 132000.0, 148800.0, 120400.0],
      'names':       ['James Kamau', 'Mary Atieno', 'Peter Mwangi', 'Sarah Wanjiku', 'David Ochieng', 'Grace Achieng'],
      'phones':      ['+254 722 123 456', '+254 733 987 654', '+254 711 234 567', '+254 700 345 678', '+254 724 456 789', '+254 735 567 890'],
      'complaints':  ['Malaria screening', 'Typhoid treatment', 'Diabetes management', 'Hypertension', 'Routine check-up', 'HIV follow-up'],
    },
    'BH': {
      'doctor':      'Dr. Fatima Al Dosari',
      'specialty':   'Internal Medicine & Endocrinology',
      'qual':        'MBBS, Arab Board (Internal Medicine)',
      'hospital':    'Salmaniya Medical Complex, Manama',
      'patients':    389, 'today': 11, 'rating': 4.8,
      'consult_fee': 25, 'currency': 'BHD',
      'weekly':      [820.0, 900.0, 1000.0, 1120.0, 1280.0, 1440.0, 1120.0],
      'names':       ['Hamad Al Khalifa', 'Yusuf Al Mannai', 'Reem Al Zayani', 'Ahmed Al Buali', 'Sara Al Dosari', 'Khalid Al Muhanna'],
      'phones':      ['+973 3612 3456', '+973 3754 7890', '+973 3867 1234', '+973 3921 5678', '+973 3643 9012', '+973 3765 0123'],
      'complaints':  ['Thyroid disorder', 'Diabetes type 2', 'Annual check', 'Metabolic syndrome', 'PCOS management', 'Obesity'],
    },
    'KW': {
      'doctor':      'Dr. Jaber Al Mutairi',
      'specialty':   'Cardiology & Internal Medicine',
      'qual':        'MBBS, FACC (USA)',
      'hospital':    'Al Amiri Hospital, Kuwait City',
      'patients':    567, 'today': 14, 'rating': 4.7,
      'consult_fee': 30, 'currency': 'KWD',
      'weekly':      [1200.0, 1320.0, 1480.0, 1640.0, 1880.0, 2160.0, 1640.0],
      'names':       ['Abdullah Al Ahmad', 'Mariam Al Rashidi', 'Faisal Al Osaimi', 'Reem Al Azmi', 'Waleed Al Sabah', 'Hessa Al Hamdan'],
      'phones':      ['+965 9912 3456', '+965 9856 7890', '+965 9734 5678', '+965 9801 2345', '+965 9923 4567', '+965 9845 6789'],
      'complaints':  ['Chest pain check', 'ECG review', 'Hypertension', 'Lipid management', 'Post-catheter follow-up', 'Arrhythmia'],
    },
    'OM': {
      'doctor':      'Dr. Said Al Balushi',
      'specialty':   'Family Medicine & Geriatrics',
      'qual':        'MBChB, MRCGP (UK)',
      'hospital':    'Royal Hospital, Muscat',
      'patients':    423, 'today': 10, 'rating': 4.7,
      'consult_fee': 20, 'currency': 'OMR',
      'weekly':      [640.0, 700.0, 800.0, 900.0, 1040.0, 1200.0, 900.0],
      'names':       ['Yousef Al Amri', 'Fatma Al Rawahi', 'Hamad Al Jahwari', 'Marwa Al Hasni', 'Ali Al Mahrouqi', 'Hana Al Kindi'],
      'phones':      ['+968 9512 3456', '+968 9634 7890', '+968 9756 2345', '+968 9812 3456', '+968 9534 6789', '+968 9678 9012'],
      'complaints':  ['Elderly care review', 'Diabetes management', 'Joint pain', 'Memory assessment', 'Falls prevention', 'BP control'],
    },
    'GB': {
      'doctor':      'Dr. Emma Clarke',
      'specialty':   'General Practice (NHS)',
      'qual':        'MBChB, MRCGP, DRCOG',
      'hospital':    'Royal London Hospital GP Practice',
      'patients':    3241, 'today': 22, 'rating': 4.5,
      'consult_fee': 0, 'currency': 'GBP',
      'weekly':      [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      'names':       ['James Smith', 'Emma Thompson', 'Oliver Davies', 'Charlotte Wilson', 'Noah Johnson', 'Sophia Brown'],
      'phones':      ['+44 7700 123456', '+44 7911 987654', '+44 7823 456789', '+44 7712 345678', '+44 7634 567890', '+44 7556 678901'],
      'complaints':  ['Annual review', 'Mental health check', 'Asthma review', 'Hypertension', 'Diabetes follow-up', 'Blood test results'],
    },
    'US': {
      'doctor':      'Dr. Michael Chen',
      'specialty':   'Family Medicine & Preventive Care',
      'qual':        'MD, FAAFP (Board Certified)',
      'hospital':    'NewYork-Presbyterian Medical Group',
      'patients':    1876, 'today': 20, 'rating': 4.6,
      'consult_fee': 180, 'currency': 'USD',
      'weekly':      [14400.0, 16200.0, 18000.0, 21600.0, 25200.0, 30000.0, 21600.0],
      'names':       ['Michael Johnson', 'Jennifer Martinez', 'David Kim', 'Ashley Thompson', 'Chris Anderson', 'Sarah Williams'],
      'phones':      ['+1 (917) 555-0123', '+1 (718) 555-0456', '+1 (212) 555-0789', '+1 (646) 555-0234', '+1 (347) 555-0567', '+1 (929) 555-0890'],
      'complaints':  ['Annual physical', 'Diabetes management', 'Hypertension follow-up', 'Mental health', 'Weight management', 'Cholesterol review'],
    },
  };

  Map<String, dynamic> _mockDashboard(String cc) {
    final d = _countryData[cc] ?? _countryData['QA']!;
    return {
      'today':       d['today'],
      'patients':    d['patients'],
      'rating':      d['rating'],
      'consult_fee': d['consult_fee'],
      'currency':    d['currency'],
      'weekly':      d['weekly'],
    };
  }

  DoctorProfile _mockProfile(String cc) {
    final d = _countryData[cc] ?? _countryData['QA']!;
    return DoctorProfile(
      name:         d['doctor']   as String,
      specialty:    d['specialty'] as String,
      qualifications: d['qual']   as String,
      hospital:     d['hospital'] as String,
      rating:       (d['rating'] as num).toDouble(),
      totalPatients: d['patients'] as int,
      consultFee:   (d['consult_fee'] as num).toDouble(),
      currency:     d['currency'] as String,
    );
  }

  List<AppointmentModel> _mockUpcoming(String cc) {
    final d = _countryData[cc] ?? _countryData['QA']!;
    final names      = d['names']      as List;
    final phones     = d['phones']     as List;
    final complaints = d['complaints'] as List;
    final fee        = (d['consult_fee'] as num).toDouble();
    final currency   = d['currency']   as String;
    final now        = DateTime.now();
    final ages       = ['28F', '45M', '62F', '34M', '51F', '38M'];
    final types      = ['video', 'in_person', 'video', 'in_person', 'video', 'in_person'];
    final statuses   = ['in_progress', 'upcoming', 'upcoming', 'pending', 'upcoming', 'upcoming'];

    return List.generate(6, (i) => AppointmentModel(
      id:            'APT-${(i + 1).toString().padLeft(3, '0')}',
      patientName:   names[i]      as String,
      patientPhone:  phones[i]     as String,
      patientAge:    ages[i],
      patientGender: ages[i].endsWith('F') ? 'Female' : 'Male',
      chiefComplaint: complaints[i] as String,
      scheduledAt:   now.add(Duration(minutes: 30 * (i - 1))),
      status:        statuses[i],
      type:          types[i],
      isPaid:        i % 2 == 0,
      consultFee:    fee,
      currency:      currency,
      isNew:         i % 3 == 0,
    ));
  }

  List<AppointmentModel> _mockCompleted(String cc) {
    final d = _countryData[cc] ?? _countryData['QA']!;
    final names      = d['names']      as List;
    final phones     = d['phones']     as List;
    final complaints = d['complaints'] as List;
    final fee        = (d['consult_fee'] as num).toDouble();
    final currency   = d['currency']   as String;
    final now        = DateTime.now();
    final diagnoses  = [
      'Controlled hypertension — continue Amlodipine 5mg',
      'Type 2 DM — HbA1c 7.2%, adjust Metformin dose',
      'Upper respiratory tract infection — Amoxicillin 500mg 5 days',
    ];

    return List.generate(3, (i) => AppointmentModel(
      id:            'APT-C${(i + 1).toString().padLeft(2, '0')}',
      patientName:   names[i]       as String,
      patientPhone:  phones[i]      as String,
      chiefComplaint: complaints[i] as String,
      scheduledAt:   now.subtract(Duration(hours: 2 + i)),
      status:        'completed',
      type:          i == 1 ? 'in_person' : 'video',
      isPaid:        true,
      consultFee:    fee,
      currency:      currency,
      diagnosis:     diagnoses[i],
      prescriptions: i == 0
          ? ['Amlodipine 5mg OD', 'Aspirin 75mg OD']
          : i == 1
              ? ['Metformin 1000mg BD', 'Vitamin D3 2000IU OD']
              : ['Amoxicillin 500mg TDS × 5 days', 'Paracetamol 500mg PRN'],
      notes: 'Patient responds well. Follow-up in ${4 + i * 2} weeks.',
    ));
  }
}
