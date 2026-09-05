import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_event.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_state.dart';
import 'package:kartseek_customer/features/doctor/services/doctor_api_service.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// BLoC for the Doctor / Health module.
///
/// Manages speciality browsing, hospital discovery, doctor search,
/// appointment booking, and health package listing.
/// Uses [DoctorApiService] for real API calls with graceful mock fallback.
class DoctorBloc extends Bloc<DoctorEvent, DoctorState> {
  final DoctorApiService _api = DoctorApiService();

  DoctorBloc() : super(const DoctorState()) {
    on<LoadDoctorHome>(_onLoadHome);
    on<SearchDoctors>(_onSearch);
    on<FilterBySpeciality>(_onFilterSpeciality);
    on<LoadDoctorDetail>(_onLoadDetail);
    on<BookAppointment>(_onBookAppointment);
    on<CancelAppointment>(_onCancelAppointment);
    on<LoadAppointments>(_onLoadAppointments);
    on<LoadHealthPackages>(_onLoadHealthPackages);
  }

  Future<void> _onLoadHome(LoadDoctorHome event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.loading));

    try {
      final region = RegionService.instance;
      final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
      final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;

      final results = await Future.wait([
        _api.getSpecialties(),
        _api.getHospitals(),
        _api.getClinics(),
        _api.getDoctors(lat: lat, lng: lng),
        _api.getMyAppointments(),
      ]);

      final specialities = results[0].isNotEmpty ? results[0] : _mockSpecialities;
      final hospitals = results[1].isNotEmpty ? results[1] : _mockHospitals;
      final clinics = results[2].isNotEmpty ? results[2] : _mockClinics;
      final doctors = results[3].isNotEmpty ? results[3] : _mockIndependentDoctors;
      final appointments = results[4].isNotEmpty ? results[4] : _mockAppointments;

      emit(state.copyWith(
        status: DoctorStatus.loaded,
        specialities: specialities.cast<Map<String, dynamic>>(),
        hospitals: hospitals.cast<Map<String, dynamic>>(),
        clinics: clinics.cast<Map<String, dynamic>>(),
        independentDoctors: doctors.cast<Map<String, dynamic>>(),
        appointments: appointments.cast<Map<String, dynamic>>(),
        healthPackages: _mockHealthPackages,
      ));
    } catch (e) {
      debugPrint('[DoctorBloc] ⚠️ API failed, using mock data: $e');
      emit(state.copyWith(
        status: DoctorStatus.loaded,
        specialities: _mockSpecialities,
        hospitals: _mockHospitals,
        clinics: _mockClinics,
        independentDoctors: _mockIndependentDoctors,
        appointments: _mockAppointments,
        healthPackages: _mockHealthPackages,
      ));
    }
  }

  Future<void> _onSearch(SearchDoctors event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.searching, searchQuery: event.query));

    try {
      final apiResults = await _api.searchDoctors(event.query);
      if (apiResults.isNotEmpty) {
        emit(state.copyWith(status: DoctorStatus.loaded, doctors: apiResults.cast<Map<String, dynamic>>()));
        return;
      }
    } catch (e) {
      debugPrint('[DoctorBloc] Search API failed, using local filter: $e');
    }

    // Fallback: local mock filter
    final results = _mockDoctors.where((d) {
      final name = (d['name'] as String).toLowerCase();
      final spec = (d['speciality'] as String).toLowerCase();
      final q = event.query.toLowerCase();
      return name.contains(q) || spec.contains(q);
    }).toList();

    emit(state.copyWith(status: DoctorStatus.loaded, doctors: results));
  }

  Future<void> _onFilterSpeciality(FilterBySpeciality event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.loading, selectedSpeciality: event.speciality));
    await Future.delayed(const Duration(milliseconds: 300));

    final filtered = _mockDoctors
        .where((d) => (d['speciality'] as String).toLowerCase() == event.speciality.toLowerCase())
        .toList();

    emit(state.copyWith(status: DoctorStatus.loaded, doctors: filtered));
  }

  Future<void> _onLoadDetail(LoadDoctorDetail event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.loading));

    try {
      final apiDoctor = await _api.getDoctorById(event.doctorId);
      if (apiDoctor.isNotEmpty) {
        emit(state.copyWith(status: DoctorStatus.loaded, selectedDoctor: apiDoctor));
        return;
      }
    } catch (e) {
      debugPrint('[DoctorBloc] Detail API failed: $e');
    }

    // Fallback
    final doctor = _mockDoctors.firstWhere(
      (d) => d['id'] == event.doctorId,
      orElse: () => _mockDoctors.first,
    );
    emit(state.copyWith(status: DoctorStatus.loaded, selectedDoctor: doctor));
  }

  Future<void> _onBookAppointment(BookAppointment event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.booking));

    try {
      final result = await _api.bookAppointment(event.doctorId, {
        'date': event.date,
        'timeSlot': event.timeSlot,
        'consultationType': event.consultationType,
      });
      if (result.isNotEmpty) {
        emit(state.copyWith(
          status: DoctorStatus.booked,
          appointments: [...state.appointments, result],
        ));
        debugPrint('[DoctorBloc] ✅ Appointment booked via API: ${result['id']}');
        return;
      }
    } catch (e) {
      debugPrint('[DoctorBloc] Book API failed: $e');
    }

    // Fallback
    final newAppointment = {
      'id': 'APT-${DateTime.now().millisecondsSinceEpoch}',
      'doctorId': event.doctorId,
      'doctorName': 'Dr. Sarah Kamau',
      'date': event.date,
      'timeSlot': event.timeSlot,
      'type': event.consultationType,
      'status': 'confirmed',
    };
    emit(state.copyWith(
      status: DoctorStatus.booked,
      appointments: [...state.appointments, newAppointment],
    ));
    debugPrint('[DoctorBloc] ✅ Appointment booked (mock): ${newAppointment['id']}');
  }

  Future<void> _onCancelAppointment(CancelAppointment event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.loading));

    try {
      await _api.cancelAppointment(event.appointmentId);
    } catch (e) {
      debugPrint('[DoctorBloc] Cancel API failed (proceeding locally): $e');
    }

    final updated = state.appointments
        .where((a) => a['id'] != event.appointmentId)
        .toList();

    emit(state.copyWith(status: DoctorStatus.loaded, appointments: updated));
    debugPrint('[DoctorBloc] 🗑️ Appointment cancelled: ${event.appointmentId}');
  }

  Future<void> _onLoadAppointments(LoadAppointments event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.loading));

    try {
      final apiAppointments = await _api.getMyAppointments();
      if (apiAppointments.isNotEmpty) {
        emit(state.copyWith(status: DoctorStatus.loaded, appointments: apiAppointments.cast<Map<String, dynamic>>()));
        return;
      }
    } catch (e) {
      debugPrint('[DoctorBloc] LoadAppointments API failed: $e');
    }

    emit(state.copyWith(status: DoctorStatus.loaded, appointments: _mockAppointments));
  }

  Future<void> _onLoadHealthPackages(LoadHealthPackages event, Emitter<DoctorState> emit) async {
    emit(state.copyWith(status: DoctorStatus.loading));
    await Future.delayed(const Duration(milliseconds: 300));
    emit(state.copyWith(status: DoctorStatus.loaded, healthPackages: _mockHealthPackages));
  }

  // ── Mock Data ─────────────────────────────────────────────────────────────

  static const List<Map<String, dynamic>> _mockSpecialities = [
    {'id': 's1', 'name': 'Cardiology', 'emoji': '🫀', 'count': 24},
    {'id': 's2', 'name': 'Dental', 'emoji': '🦷', 'count': 18},
    {'id': 's3', 'name': 'Ophthalmology', 'emoji': '👁️', 'count': 12},
    {'id': 's4', 'name': 'Neurology', 'emoji': '🧠', 'count': 9},
    {'id': 's5', 'name': 'Orthopedics', 'emoji': '🦴', 'count': 15},
    {'id': 's6', 'name': 'Pediatrics', 'emoji': '👶', 'count': 21},
    {'id': 's7', 'name': 'General', 'emoji': '🩺', 'count': 42},
    {'id': 's8', 'name': 'Dermatology', 'emoji': '💆', 'count': 11},
  ];

  static const List<Map<String, dynamic>> _mockHospitals = [
    {'id': 'h1', 'name': 'City General Hospital', 'distance': '2.1 km', 'rating': 4.9, 'type': 'Multi-Speciality', 'doctorCount': 12},
    {'id': 'h2', 'name': 'Aga Khan Hospital', 'distance': '3.5 km', 'rating': 4.8, 'type': 'Super Speciality', 'doctorCount': 28},
    {'id': 'h3', 'name': 'MP Shah Hospital', 'distance': '1.8 km', 'rating': 4.7, 'type': 'General Hospital', 'doctorCount': 8},
  ];

  static const List<Map<String, dynamic>> _mockDoctors = [
    {'id': 'd1', 'name': 'Dr. Sarah Kamau', 'speciality': 'Cardiology', 'fee': 800, 'rating': 4.9, 'hospital': 'City General Hospital'},
    {'id': 'd2', 'name': 'Dr. James Odhiambo', 'speciality': 'Orthopedics', 'fee': 1200, 'rating': 4.8, 'hospital': 'City General Hospital'},
    {'id': 'd3', 'name': 'Dr. Priya Sharma', 'speciality': 'Dermatology', 'fee': 600, 'rating': 4.7, 'hospital': 'City General Hospital'},
    {'id': 'd4', 'name': 'Dr. Amina Hassan', 'speciality': 'Neurology', 'fee': 1500, 'rating': 4.9, 'hospital': 'Aga Khan Hospital'},
    {'id': 'd5', 'name': 'Dr. Raj Patel', 'speciality': 'Pediatrics', 'fee': 700, 'rating': 4.6, 'hospital': 'Aga Khan Hospital'},
    {'id': 'd6', 'name': 'Dr. Grace Wanjiku', 'speciality': 'General', 'fee': 500, 'rating': 4.5, 'hospital': 'MP Shah Hospital'},
    {'id': 'd7', 'name': 'Dr. Kofi Asante', 'speciality': 'Dental', 'fee': 800, 'rating': 4.7, 'hospital': 'MP Shah Hospital'},
  ];

  static const List<Map<String, dynamic>> _mockAppointments = [
    {'id': 'APT-001', 'doctorName': 'Dr. Sarah Kamau', 'speciality': 'Cardiology', 'date': 'Today', 'timeSlot': '3:00 PM', 'status': 'confirmed'},
  ];

  static const List<Map<String, dynamic>> _mockHealthPackages = [
    {'id': 'hp1', 'name': 'Full Body Checkup', 'tests': 68, 'price': 1499, 'mrp': 3500, 'discount': 57},
    {'id': 'hp2', 'name': 'Heart Health', 'tests': 24, 'price': 999, 'mrp': 2000, 'discount': 50},
    {'id': 'hp3', 'name': 'Diabetes Screening', 'tests': 12, 'price': 599, 'mrp': 1200, 'discount': 50},
  ];

  static const List<Map<String, dynamic>> _mockClinics = [
    {'id': 'cln-001', 'name': 'SmileCare Dental Clinic', 'specialties': 'Dentistry, Orthodontics', 'location': 'Koramangala', 'distance': '1.2 km', 'doctorCount': 4, 'todaySlots': 8, 'rating': 4.8, 'reviewCount': 340, 'nextSlot': 'Today 3:30 PM'},
    {'id': 'cln-002', 'name': 'SkinFirst Dermatology', 'specialties': 'Dermatology, Cosmetology', 'location': 'Andheri West', 'distance': '2.5 km', 'doctorCount': 3, 'todaySlots': 5, 'rating': 4.9, 'reviewCount': 520, 'nextSlot': 'Today 4:00 PM'},
    {'id': 'cln-003', 'name': 'NeuroCare Wellness', 'specialties': 'Neurology, Psychiatry', 'location': 'HSR Layout', 'distance': '3.0 km', 'doctorCount': 2, 'todaySlots': 3, 'rating': 4.7, 'reviewCount': 180, 'nextSlot': 'Tomorrow 10 AM'},
    {'id': 'cln-004', 'name': 'Little Stars Pediatrics', 'specialties': 'Pediatrics, Vaccination', 'location': 'Indiranagar', 'distance': '1.8 km', 'doctorCount': 3, 'todaySlots': 6, 'rating': 4.9, 'reviewCount': 410, 'nextSlot': 'Today 2:00 PM'},
    {'id': 'cln-005', 'name': 'HeartBeat Cardiology', 'specialties': 'Cardiology, Medicine', 'location': 'Bandra West', 'distance': '2.1 km', 'doctorCount': 3, 'todaySlots': 4, 'rating': 4.8, 'reviewCount': 290, 'nextSlot': 'Today 5:00 PM'},
    {'id': 'cln-006', 'name': 'FemCare Women Health', 'specialties': 'Gynecology, Fertility', 'location': 'JP Nagar', 'distance': '2.8 km', 'doctorCount': 4, 'todaySlots': 7, 'rating': 4.9, 'reviewCount': 460, 'nextSlot': 'Today 3:00 PM'},
    {'id': 'cln-007', 'name': 'BoneStrong Orthopedic', 'specialties': 'Orthopedics, Physio', 'location': 'Whitefield', 'distance': '4.0 km', 'doctorCount': 2, 'todaySlots': 5, 'rating': 4.6, 'reviewCount': 210, 'nextSlot': 'Tomorrow 9 AM'},
    {'id': 'cln-008', 'name': 'MindWell Psychiatry', 'specialties': 'Psychiatry, Psychology', 'location': 'Koramangala', 'distance': '1.5 km', 'doctorCount': 3, 'todaySlots': 4, 'rating': 4.8, 'reviewCount': 320, 'nextSlot': 'Today 6:00 PM'},
  ];

  static const List<Map<String, dynamic>> _mockIndependentDoctors = [
    {'id': 'doc-i01', 'name': 'Dr. Anjali Mehta', 'photo': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', 'qualification': 'MBBS, MD (Medicine)', 'specialty': 'General Physician', 'experience': '15 yrs', 'fee': 500, 'rating': 4.9, 'reviewCount': 428, 'nextSlot': 'Today 4:30 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i02', 'name': 'Dr. Rahul Sharma', 'photo': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', 'qualification': 'MBBS, MD, DM (Cardiology)', 'specialty': 'Cardiologist', 'experience': '18 yrs', 'fee': 1200, 'rating': 4.9, 'reviewCount': 612, 'nextSlot': 'Today 5:00 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i03', 'name': 'Dr. Priya Desai', 'photo': 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', 'qualification': 'BDS, MDS (Orthodontics)', 'specialty': 'Dentist', 'experience': '10 yrs', 'fee': 600, 'rating': 4.8, 'reviewCount': 356, 'nextSlot': 'Tomorrow 10 AM', 'modes': 'In-Person'},
    {'id': 'doc-i04', 'name': 'Dr. Arjun Nair', 'photo': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', 'qualification': 'MBBS, MS (Ortho)', 'specialty': 'Orthopedic', 'experience': '12 yrs', 'fee': 900, 'rating': 4.7, 'reviewCount': 280, 'nextSlot': 'Today 6:00 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i05', 'name': 'Dr. Meera Reddy', 'photo': 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', 'qualification': 'MBBS, MD (Dermatology)', 'specialty': 'Dermatologist', 'experience': '8 yrs', 'fee': 700, 'rating': 4.8, 'reviewCount': 394, 'nextSlot': 'Today 3:00 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i06', 'name': 'Dr. Suresh Iyer', 'photo': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', 'qualification': 'MBBS, DM (Neurology)', 'specialty': 'Neurologist', 'experience': '20 yrs', 'fee': 1500, 'rating': 4.9, 'reviewCount': 518, 'nextSlot': 'Tomorrow 11 AM', 'modes': 'In-Person'},
    {'id': 'doc-i07', 'name': 'Dr. Kavita Gupta', 'photo': 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80', 'qualification': 'MBBS, MD (Gynecology)', 'specialty': 'Gynecologist', 'experience': '14 yrs', 'fee': 800, 'rating': 4.8, 'reviewCount': 490, 'nextSlot': 'Today 2:00 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i08', 'name': 'Dr. Vikram Patel', 'photo': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80', 'qualification': 'MBBS, MD (Pediatrics)', 'specialty': 'Pediatrician', 'experience': '11 yrs', 'fee': 650, 'rating': 4.7, 'reviewCount': 310, 'nextSlot': 'Today 4:00 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i09', 'name': 'Dr. Fatima Khan', 'photo': 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&q=80', 'qualification': 'MBBS, DM (Gastro)', 'specialty': 'Gastroenterologist', 'experience': '16 yrs', 'fee': 1100, 'rating': 4.9, 'reviewCount': 370, 'nextSlot': 'Tomorrow 9:30 AM', 'modes': 'In-Person'},
    {'id': 'doc-i10', 'name': 'Dr. Sanjay Rao', 'photo': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', 'qualification': 'MBBS, MS (ENT)', 'specialty': 'ENT Specialist', 'experience': '13 yrs', 'fee': 750, 'rating': 4.6, 'reviewCount': 245, 'nextSlot': 'Today 5:30 PM', 'modes': 'In-Person, Video'},
    {'id': 'doc-i11', 'name': 'Dr. Lakshmi Venkat', 'photo': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', 'qualification': 'MBBS, MD (Psychiatry)', 'specialty': 'Psychiatrist', 'experience': '9 yrs', 'fee': 1000, 'rating': 4.8, 'reviewCount': 310, 'nextSlot': 'Tomorrow 2 PM', 'modes': 'Video'},
    {'id': 'doc-i12', 'name': 'Dr. Arun Kumar', 'photo': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', 'qualification': 'MBBS, DM (Endocrinology)', 'specialty': 'Diabetes Specialist', 'experience': '17 yrs', 'fee': 1200, 'rating': 4.9, 'reviewCount': 420, 'nextSlot': 'Today 3:30 PM', 'modes': 'In-Person, Video'},
  ];
}
