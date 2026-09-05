import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/utils/responsive.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_shared_mobile/core/widgets/camera_capture_screen.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_bloc.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_event.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_state.dart';

/// KARTSEEK Health — Premium Doctor Module
/// Matches web version structure: Specialties → Filtered Results → Hospitals → Clinics → Doctors → Trust
class DoctorHomeScreen extends StatefulWidget {
  const DoctorHomeScreen({super.key});

  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  String? _selectedSpeciality;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DoctorBloc>().add(const LoadDoctorHome());
    });
  }

  void _onSpecialityTap(String specName) {
    setState(() {
      _selectedSpeciality = _selectedSpeciality == specName ? null : specName;
    });
  }

  void _clearFilter() {
    setState(() => _selectedSpeciality = null);
  }

  // ── Filtering helpers ──────────────────────────────────────────────────
  List<Map<String, dynamic>> _filterHospitals(List<Map<String, dynamic>> hospitals) {
    if (_selectedSpeciality == null) return hospitals;
    return hospitals.where((h) {
      final type = (h['type'] ?? '').toString().toLowerCase();
      return type.contains(_selectedSpeciality!.toLowerCase()) || type.contains('multi') || type.contains('super');
    }).toList();
  }

  List<Map<String, dynamic>> _filterClinics(List<Map<String, dynamic>> clinics) {
    if (_selectedSpeciality == null) return clinics;
    final q = _selectedSpeciality!.toLowerCase();
    return clinics.where((c) {
      final specs = (c['specialties'] ?? '').toString().toLowerCase();
      return specs.contains(q);
    }).toList();
  }

  List<Map<String, dynamic>> _filterDoctors(List<Map<String, dynamic>> doctors) {
    if (_selectedSpeciality == null) return doctors;
    final q = _selectedSpeciality!.toLowerCase();
    return doctors.where((d) {
      final spec = (d['specialty'] ?? '').toString().toLowerCase();
      final qual = (d['qualification'] ?? '').toString().toLowerCase();
      return spec.contains(q) || qual.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent));

    return BlocBuilder<DoctorBloc, DoctorState>(
      builder: (context, state) {
        if (state.status == DoctorStatus.initial || state.status == DoctorStatus.loading) {
          return const Scaffold(
            backgroundColor: Color(0xFFF8F9FB),
            body: Center(child: CircularProgressIndicator(color: Color(0xFF6D28D9))),
          );
        }

        final filteredHospitals = _filterHospitals(state.hospitals);
        final filteredClinics = _filterClinics(state.clinics);
        final filteredDoctors = _filterDoctors(state.independentDoctors);
        final totalResults = filteredHospitals.length + filteredClinics.length + filteredDoctors.length;

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FB),
          body: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ── App Bar ──
              SliverAppBar(
                pinned: true,
                floating: true,
                elevation: 0,
                backgroundColor: const Color(0xFF6D28D9),
                surfaceTintColor: Colors.transparent,
                toolbarHeight: 64,
                automaticallyImplyLeading: false,
                titleSpacing: 0,
                title: _buildHeader(context),
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(64),
                  child: _buildSearchBar(context),
                ),
              ),

              // ── Hero Stats Banner ──
              SliverToBoxAdapter(child: _buildHeroBanner()),

              // ── Quick Action Cards ──
              SliverToBoxAdapter(child: _buildQuickActions()),

              // ── Top Specialties ──
              SliverToBoxAdapter(child: _buildSpecialities(state.specialities)),

              // ── Filter Results Banner ──
              if (_selectedSpeciality != null)
                SliverToBoxAdapter(child: _buildFilterBanner(totalResults)),

              // ── No Results State ──
              if (_selectedSpeciality != null && totalResults == 0)
                SliverToBoxAdapter(child: _buildNoResults()),

              // ── Available Hospitals ──
              if (filteredHospitals.isNotEmpty)
                SliverToBoxAdapter(child: _buildHospitalsSection(context, filteredHospitals)),

              // ── Nearby Clinics ──
              if (filteredClinics.isNotEmpty)
                SliverToBoxAdapter(child: _buildClinicsSection(context, filteredClinics)),

              // ── Upcoming Appointment ──
              if (state.appointments.isNotEmpty)
                SliverToBoxAdapter(child: _buildUpcomingAppointment(state.appointments.first)),

              // ── Independent Doctors ──
              if (filteredDoctors.isNotEmpty)
                SliverToBoxAdapter(child: _buildIndependentDoctors(context, filteredDoctors)),

              // ── Health Packages ──
              SliverToBoxAdapter(child: _buildHealthPackages(state.healthPackages)),

              // ── Trust Banner ──
              SliverToBoxAdapter(child: _buildTrustBanner()),

              const SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          ),
        );
      },
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Header ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          const Text('KARTSEEK ', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
          const Text('Health', style: TextStyle(fontWeight: FontWeight.w500, color: Colors.white70, fontSize: 18)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
            child: const Row(
              children: [
                Icon(Icons.history, color: Colors.white, size: 14),
                SizedBox(width: 4),
                Text('My Records', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Search Bar ──
  Widget _buildSearchBar(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.search, arguments: 'doctor'),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]),
        ),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.search_rounded, color: Color(0xFF6D28D9), size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Search doctors, hospitals, specialities...', style: TextStyle(color: Colors.grey.shade500, fontSize: 14, fontWeight: FontWeight.w500)),
              ),
              GestureDetector(
                onTap: () => VoiceSearchSheet.show(
                  context: context,
                  accentColor: AppTheme.doctorColor,
                  hintText: 'Try "cardiologist" or "Dr. Sarah"',
                  onResult: (text) {
                    Navigator.pushNamed(context, AppRouter.search, arguments: <String, String>{'module': 'doctor', 'initialQuery': text});
                  },
                ),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.mic_none_rounded, color: Color(0xFF6D28D9), size: 18),
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () => Navigator.push<String>(context, MaterialPageRoute(
                  builder: (_) => const CameraCaptureScreen(
                    title: 'Upload Symptoms',
                    accentColor: AppTheme.doctorColor,
                    filePrefix: 'doctor_symptom',
                    overlayHint: 'Take a photo of symptoms or prescription for consultation',
                  ),
                )),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.camera_alt_outlined, color: Color(0xFF6D28D9), size: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Hero Stats Banner ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildHeroBanner() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF0D9488)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('✨', style: TextStyle(fontSize: 12)),
                SizedBox(width: 4),
                Text('TRUSTED HEALTHCARE', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text('Your Health,', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 26)),
          Text('Our Priority', style: TextStyle(color: Colors.tealAccent.shade100, fontWeight: FontWeight.w900, fontSize: 26)),
          const SizedBox(height: 6),
          Text(
            'Find the best doctors, hospitals & clinics near you.',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _heroBannerStat('5,000+', 'Verified\nDoctors'),
              _heroBannerStat('500+', 'Hospitals\n& Clinics'),
              _heroBannerStat('2M+', 'Happy\nPatients'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _heroBannerStat(String value, String label) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
          const SizedBox(height: 2),
          Text(label, textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 10, height: 1.3)),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Quick Actions Grid ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      child: GridView.count(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        childAspectRatio: 1.75,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        children: [
          _actionCard('📱', 'Video Consult', 'Talk in 15 mins', const Color(0xFFEDE9FE), const Color(0xFF6D28D9)),
          _actionCard('🏥', 'Hospital Visit', 'Walk-in appointment', const Color(0xFFE0F2FE), const Color(0xFF0284C7)),
          _actionCard('🚨', 'Emergency', 'Instant connect', const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
          _actionCard('🛡️', 'Second Opinion', 'Expert verification', const Color(0xFFF3E8FF), const Color(0xFF7C3AED)),
        ],
      ),
    );
  }

  Widget _actionCard(String emoji, String title, String sub, Color bg, Color textColor) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: textColor.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 6),
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: textColor)),
          Text(sub, style: TextStyle(fontSize: 10, color: textColor.withValues(alpha: 0.65))),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Top Specialties (Filterable Grid) ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildSpecialities(List<Map<String, dynamic>> specialities) {
    // Map to assign distinct colors per speciality
    final specColors = <Color>[
      const Color(0xFF2563EB), const Color(0xFF0891B2), const Color(0xFFDB2777),
      const Color(0xFFE11D48), const Color(0xFF0EA5E9), const Color(0xFFD97706),
      const Color(0xFFDC2626), const Color(0xFF7C3AED), const Color(0xFF9333EA),
      const Color(0xFF0D9488), const Color(0xFF4F46E5), const Color(0xFF059669),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Top Specialties', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  SizedBox(height: 2),
                  Text('Find the right specialist for your needs', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
              if (_selectedSpeciality != null)
                GestureDetector(
                  onTap: _clearFilter,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.close, size: 14, color: Color(0xFF2563EB)),
                        SizedBox(width: 4),
                        Text('Clear', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: Responsive.categoryGridColumns,
              childAspectRatio: 0.78,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: specialities.length,
            itemBuilder: (_, i) {
              final spec = specialities[i];
              final name = spec['name'] ?? '';
              final isSelected = _selectedSpeciality == name;
              final color = specColors[i % specColors.length];

              return GestureDetector(
                onTap: () => _onSpecialityTap(name),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        color.withValues(alpha: isSelected ? 0.12 : 0.05),
                        color.withValues(alpha: isSelected ? 0.18 : 0.1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? color.withValues(alpha: 0.5) : Colors.white.withValues(alpha: 0.8),
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(color: color.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 3))]
                        : [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2))],
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Center(
                                child: Text(spec['emoji'] ?? '🩺', style: const TextStyle(fontSize: 22)),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              name,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                                color: isSelected ? color : const Color(0xFF334155),
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (spec['count'] != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                '${spec['count']} doctors',
                                style: TextStyle(fontSize: 8, color: Colors.grey.shade400, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (isSelected)
                        Positioned(
                          top: 4, right: 4,
                          child: Container(
                            width: 18, height: 18,
                            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                            child: const Icon(Icons.check, color: Colors.white, size: 12),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Filter Results Banner ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildFilterBanner(int totalResults) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFEFF6FF), Color(0xFFF0FDFA)]),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFBFDBFE).withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: const Color(0xFFDBEAFE), borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.filter_list_rounded, color: Color(0xFF2563EB), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RichText(
                  text: TextSpan(
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                    children: [
                      const TextSpan(text: 'Showing results for '),
                      TextSpan(text: _selectedSpeciality!, style: const TextStyle(color: Color(0xFF2563EB))),
                    ],
                  ),
                ),
                Text('$totalResults results found', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
          ),
          GestureDetector(
            onTap: _clearFilter,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.close, size: 12, color: Color(0xFF64748B)),
                  SizedBox(width: 2),
                  Text('Clear', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoResults() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const Text('🔍', style: TextStyle(fontSize: 44)),
          const SizedBox(height: 12),
          Text('No results for $_selectedSpeciality', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A))),
          const SizedBox(height: 4),
          const Text('Try selecting a different specialty', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: _clearFilter,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text('Browse All', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHospitalsSection(BuildContext context, List<Map<String, dynamic>> hospitals) {
    final sectionTitle = _selectedSpeciality != null ? '$_selectedSpeciality Hospitals' : 'Available Hospitals';
    // Hospital image URLs
    final hospitalImages = [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80',
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&q=80',
      'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&q=80',
      'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&q=80',
      'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&q=80',
      'https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?w=400&q=80',
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.apartment_rounded, color: Color(0xFF2563EB), size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(sectionTitle, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    const Text('Top-rated hospitals with verified specialists', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // 2-column grid layout
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.72,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: hospitals.length,
            itemBuilder: (_, i) => _compactHospitalCard(context, hospitals[i], hospitalImages[i % hospitalImages.length]),
          ),
        ],
      ),
    );
  }

  Widget _compactHospitalCard(BuildContext context, Map<String, dynamic> h, String imageUrl) {
    final name = h['name'] ?? 'Hospital';
    final type = h['type'] ?? 'General';
    final dist = h['distance'] ?? '2.0 km';
    final rating = h['rating'] ?? 4.5;
    final doctorCount = h['doctorCount'] ?? 10;
    final isOpen = (h['isOpen'] as bool?) ?? true;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.doctorBooking, arguments: {
        'doctorName': name,
        'bloc': context.read<DoctorBloc>(),
      }),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hospital image with overlays
            SizedBox(
              height: 100,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  KartseekImage(url: imageUrl, fit: BoxFit.cover),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.45)],
                      ),
                    ),
                  ),
                  // Status badge
                  Positioned(
                    top: 6, left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isOpen ? const Color(0xFF10B981).withValues(alpha: 0.9) : const Color(0xFFEF4444).withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(width: 4, height: 4, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                          const SizedBox(width: 3),
                          Text(isOpen ? 'Open' : 'Closed', style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
                  // Rating
                  Positioned(
                    top: 6, right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.95), borderRadius: BorderRadius.circular(6)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 10),
                          const SizedBox(width: 1),
                          Text('$rating', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                  ),
                  // Name overlay
                  Positioned(
                    bottom: 6, left: 6, right: 6,
                    child: Text(
                      name,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12, shadows: [Shadow(color: Colors.black54, blurRadius: 4)]),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type + distance
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 10, color: Colors.grey.shade400),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(type, style: TextStyle(fontSize: 9, color: Colors.grey.shade500), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Distance + doctors
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFF0FDFA), borderRadius: BorderRadius.circular(4)),
                        child: Text(dist, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Color(0xFF0D9488))),
                      ),
                      const Spacer(),
                      const Icon(Icons.people_rounded, size: 10, color: Color(0xFF2563EB)),
                      const SizedBox(width: 2),
                      Text('$doctorCount', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // View button
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 7),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.apartment_rounded, color: Colors.white, size: 12),
                        SizedBox(width: 4),
                        Text('View Hospital', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 10)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Nearby Clinics (Photo-Rich Cards) ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildClinicsSection(BuildContext context, List<Map<String, dynamic>> clinics) {
    final sectionTitle = _selectedSpeciality != null ? '$_selectedSpeciality Clinics' : 'Nearby Clinics';
    // Clinic image URLs
    final clinicImages = [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80',
      'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=400&q=80',
      'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=400&q=80',
      'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=400&q=80',
      'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&q=80',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80',
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80',
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80',
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_hospital_rounded, color: Color(0xFF0D9488), size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(sectionTitle, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    const Text('Specialized clinics with same-day appointments', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 280,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: clinics.length,
              itemBuilder: (_, i) => _photoClinicCard(context, clinics[i], clinicImages[i % clinicImages.length]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _photoClinicCard(BuildContext context, Map<String, dynamic> clinic, String imageUrl) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.doctorBooking, arguments: {
        'doctorName': clinic['name'],
        'bloc': context.read<DoctorBloc>(),
      }),
      child: Container(
        width: 220,
        margin: const EdgeInsets.only(right: 12, bottom: 4, top: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Clinic image with overlays
            SizedBox(
              height: 120,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  KartseekImage(url: imageUrl, fit: BoxFit.cover),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.4)],
                      ),
                    ),
                  ),
                  // Specialty tags
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        (clinic['specialties'] ?? '').toString().split(',').first.trim(),
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF0D9488)),
                      ),
                    ),
                  ),
                  // Rating
                  Positioned(
                    top: 8, right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 12),
                          const SizedBox(width: 2),
                          Text('${clinic['rating']}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                  ),
                  // Name
                  Positioned(
                    bottom: 8, left: 8, right: 8,
                    child: Text(
                      clinic['name'] ?? '',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13, shadows: [Shadow(color: Colors.black45, blurRadius: 4)]),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Location + distance
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 12, color: Colors.grey.shade400),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text('${clinic['location']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                      Text('${clinic['distance']}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0D9488))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Doctors + slots
                  Row(
                    children: [
                      const Icon(Icons.people_rounded, size: 12, color: Color(0xFF2563EB)),
                      const SizedBox(width: 3),
                      Text('${clinic['doctorCount']}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
                      Text(' Doctors', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                      const Spacer(),
                      const Icon(Icons.calendar_today_rounded, size: 11, color: Color(0xFF10B981)),
                      const SizedBox(width: 3),
                      Text('${clinic['todaySlots']} slots', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Next slot badge
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.access_time_rounded, size: 12, color: Color(0xFF10B981)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text('Next: ${clinic['nextSlot']}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF059669)), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Independent Doctors (Compact 2-Column Grid) ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildIndependentDoctors(BuildContext context, List<Map<String, dynamic>> doctors) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final sectionTitle = _selectedSpeciality != null ? '$_selectedSpeciality Doctors' : 'Independent Doctors';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.medical_services_rounded, color: Color(0xFF4F46E5), size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(sectionTitle, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    const Text('Book verified doctors for personal consultations', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // 2-column grid layout
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.58,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: doctors.length,
            itemBuilder: (_, i) => _compactDoctorCard(context, doctors[i], currency),
          ),
        ],
      ),
    );
  }

  Widget _compactDoctorCard(BuildContext context, Map<String, dynamic> doc, String currency) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.doctorBooking, arguments: {
        'doctorName': doc['name'],
        'bloc': context.read<DoctorBloc>(),
      }),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Doctor photo with overlays
            SizedBox(
              height: 100,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  KartseekImage(url: doc['photo'] ?? '', fit: BoxFit.cover),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.35)],
                      ),
                    ),
                  ),
                  // Verified badge
                  Positioned(
                    top: 6, left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified_rounded, color: Colors.white, size: 10),
                          SizedBox(width: 2),
                          Text('Verified', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
                  // Rating
                  Positioned(
                    top: 6, right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.95), borderRadius: BorderRadius.circular(6)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 10),
                          const SizedBox(width: 1),
                          Text('${doc['rating']}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800)),
                        ],
                      ),
                    ),
                  ),
                  // Name overlay
                  Positioned(
                    bottom: 6, left: 6, right: 6,
                    child: Text(
                      doc['name'] ?? '',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11, shadows: [Shadow(color: Colors.black54, blurRadius: 4)]),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Specialty chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(doc['specialty'] ?? '', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(height: 4),
                  // Experience
                  Row(
                    children: [
                      Icon(Icons.workspace_premium_rounded, size: 10, color: Colors.grey.shade400),
                      const SizedBox(width: 2),
                      Text(doc['experience'] ?? '', style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Fee
                  Text('$currency ${doc['fee']}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0F172A))),
                  const SizedBox(height: 2),
                  // Next slot
                  if (doc['nextSlot'] != null)
                    Text(doc['nextSlot']!, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                  const SizedBox(height: 6),
                  // Consult modes
                  Row(
                    children: [
                      if ((doc['modes'] ?? '').toString().contains('Video'))
                        Container(
                          margin: const EdgeInsets.only(right: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: const Text('📱 Video', style: TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                        ),
                      if ((doc['modes'] ?? '').toString().contains('In-Person'))
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: const Text('🏥 Visit', style: TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Book button
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 7),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF4338CA)]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.calendar_today_rounded, color: Colors.white, size: 11),
                        SizedBox(width: 4),
                        Text('Book Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 10)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Upcoming Appointment ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildUpcomingAppointment(Map<String, dynamic> appointment) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [AppTheme.doctorColor.withValues(alpha: 0.1), AppTheme.doctorColor.withValues(alpha: 0.05)]),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.doctorColor.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: AppTheme.doctorColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.calendar_today_rounded, color: AppTheme.doctorColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Upcoming Appointment', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text('${appointment['doctorName']} • ${appointment['date']}, ${appointment['timeSlot']}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: AppTheme.doctorColor, borderRadius: BorderRadius.circular(8)),
              child: const Text('Join', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Health Packages ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildHealthPackages(List<Map<String, dynamic>> packages) {
    if (packages.isEmpty) return const SizedBox.shrink();
    final currency = RegionService.instance.currentCountry.currencySymbol;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🔬 Health Packages', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          ...packages.map((p) => _packageCard(
            p['name'] ?? '',
            '${p['tests']} tests',
            '$currency ${p['price']}',
            '$currency ${p['mrp']}',
            '${p['discount']}%',
          )),
        ],
      ),
    );
  }

  Widget _packageCard(String name, String tests, String price, String mrp, String off) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          const Icon(Icons.science_outlined, color: AppTheme.doctorColor, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                Text(tests, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                children: [
                  Text(price, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.doctorColor)),
                  const SizedBox(width: 4),
                  Text(mrp, style: TextStyle(fontSize: 10, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(3)),
                child: Text('$off off', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── Trust Banner ──
  // ════════════════════════════════════════════════════════════════════════

  Widget _buildTrustBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6)),
          ],
        ),
        child: Column(
          children: [
            const Text(
              'Why Patients Trust\nKARTSEEK Health',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, height: 1.3),
            ),
            const SizedBox(height: 6),
            Text(
              'We verify every doctor, hospital, and clinic on our platform.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                _trustStat('100%', 'Verified\nDoctors', Icons.verified_rounded),
                _trustStat('4.8★', 'Avg\nRating', Icons.star_rounded),
                _trustStat('<15m', 'Avg\nWait', Icons.timer_rounded),
                _trustStat('10K+', 'Daily\nConsults', Icons.people_rounded),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _trustStat(String value, String label, IconData icon) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFF5EEAD4), size: 18),
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white)),
          const SizedBox(height: 2),
          Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 9, color: Colors.white.withValues(alpha: 0.5), height: 1.3)),
        ],
      ),
    );
  }
}
