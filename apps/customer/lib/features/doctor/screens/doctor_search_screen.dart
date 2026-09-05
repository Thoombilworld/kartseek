import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_bloc.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_event.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_state.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';

/// Doctor Search Screen — Filter by specialty, sort, and search doctors.
class DoctorSearchScreen extends StatefulWidget {
  final String? initialSpecialty;
  const DoctorSearchScreen({super.key, this.initialSpecialty});

  @override
  State<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends State<DoctorSearchScreen> {
  final _searchController = TextEditingController();
  String _selectedSpecialty = 'All';
  String _sortBy = 'rating';
  bool _videoOnly = false;

  static const _specialties = ['All', 'General', 'Cardiology', 'Dental', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'ENT'];
  static const _specEmoji = {'All': '🩺', 'General': '🩺', 'Cardiology': '🫀', 'Dental': '🦷', 'Dermatology': '💆', 'Neurology': '🧠', 'Orthopedics': '🦴', 'Pediatrics': '👶', 'Gynecology': '🤰', 'ENT': '👂'};

  @override
  void initState() {
    super.initState();
    if (widget.initialSpecialty != null) _selectedSpecialty = widget.initialSpecialty!;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DoctorBloc>().add(const LoadDoctorHome());
    });
  }

  @override
  void dispose() { _searchController.dispose(); super.dispose(); }

  List<Map<String, dynamic>> _filterAndSort(List<Map<String, dynamic>> doctors) {
    var filtered = doctors.where((d) {
      final q = _searchController.text.toLowerCase();
      final name = (d['name'] ?? '').toString().toLowerCase();
      final spec = (d['specialty'] ?? d['speciality'] ?? '').toString().toLowerCase();
      final hospital = (d['hospital'] ?? '').toString().toLowerCase();

      if (q.isNotEmpty && !name.contains(q) && !spec.contains(q) && !hospital.contains(q)) return false;
      if (_selectedSpecialty != 'All' && !spec.contains(_selectedSpecialty.toLowerCase())) return false;
      if (_videoOnly && !(d['modes'] ?? '').toString().toLowerCase().contains('video')) return false;
      return true;
    }).toList();

    switch (_sortBy) {
      case 'fee-low': filtered.sort((a, b) => ((a['fee'] as num?) ?? 0).compareTo((b['fee'] as num?) ?? 0));
      case 'fee-high': filtered.sort((a, b) => ((b['fee'] as num?) ?? 0).compareTo((a['fee'] as num?) ?? 0));
      case 'experience': filtered.sort((a, b) => (b['experience'] ?? '').toString().compareTo((a['experience'] ?? '').toString()));
      default: filtered.sort((a, b) => ((b['rating'] as num?) ?? 0).compareTo((a['rating'] as num?) ?? 0));
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: BlocBuilder<DoctorBloc, DoctorState>(
        builder: (context, state) {
          final allDoctors = [...state.independentDoctors];
          final filtered = _filterAndSort(allDoctors);

          return CustomScrollView(
            slivers: [
              // ── App Bar ──
              SliverAppBar(
                pinned: true, floating: true, elevation: 0,
                backgroundColor: const Color(0xFF6D28D9),
                surfaceTintColor: Colors.transparent,
                leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
                title: const Text('Find a Doctor', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(64),
                  child: Container(
                    decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)])),
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)]),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Row(children: [
                        const Icon(Icons.search, color: Color(0xFF6D28D9), size: 22),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(
                          controller: _searchController,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(border: InputBorder.none, hintText: 'Search by name, specialty...', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14)),
                          style: const TextStyle(fontSize: 14),
                        )),
                        if (_searchController.text.isNotEmpty) GestureDetector(
                          onTap: () { _searchController.clear(); setState(() {}); },
                          child: const Icon(Icons.close, color: Colors.grey, size: 18),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => VoiceSearchSheet.show(
                            context: context,
                            accentColor: const Color(0xFF6D28D9),
                            hintText: 'Try "cardiologist" or "dental"',
                            onResult: (text) {
                              _searchController.text = text;
                              setState(() {});
                            },
                          ),
                          child: const Icon(Icons.mic_none_rounded, color: Color(0xFF6D28D9), size: 20),
                        ),
                      ]),
                    ),
                  ),
                ),
              ),

              // ── Specialty Chips ──
              SliverToBoxAdapter(
                child: Container(
                  height: 50, margin: const EdgeInsets.only(top: 12),
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _specialties.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final s = _specialties[i];
                      final active = _selectedSpecialty == s;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedSpecialty = s),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: active ? const Color(0xFF6D28D9) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: active ? const Color(0xFF6D28D9) : const Color(0xFFE2E8F0)),
                            boxShadow: active ? [BoxShadow(color: const Color(0xFF6D28D9).withValues(alpha: 0.2), blurRadius: 6)] : null,
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(_specEmoji[s] ?? '🩺', style: const TextStyle(fontSize: 14)),
                            const SizedBox(width: 6),
                            Text(s, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF475569))),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
              ),

              // ── Sort & Filter Bar ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: Row(children: [
                    Text('${filtered.length} doctors', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => setState(() => _videoOnly = !_videoOnly),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _videoOnly ? const Color(0xFF6D28D9).withValues(alpha: 0.1) : Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: _videoOnly ? const Color(0xFF6D28D9) : const Color(0xFFE2E8F0)),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.videocam, size: 14, color: _videoOnly ? const Color(0xFF6D28D9) : const Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text('Video', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _videoOnly ? const Color(0xFF6D28D9) : const Color(0xFF64748B))),
                        ]),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _sortBy, isDense: true,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                          items: const [
                            DropdownMenuItem(value: 'rating', child: Text('Top Rated')),
                            DropdownMenuItem(value: 'fee-low', child: Text('Fee: Low→High')),
                            DropdownMenuItem(value: 'fee-high', child: Text('Fee: High→Low')),
                            DropdownMenuItem(value: 'experience', child: Text('Experience')),
                          ],
                          onChanged: (v) => setState(() => _sortBy = v!),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),

              // ── Doctor Cards ──
              if (state.status == DoctorStatus.loading)
                const SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: Color(0xFF6D28D9))))
              else if (filtered.isEmpty)
                SliverFillRemaining(child: _buildEmptyState())
              else
                SliverList(delegate: SliverChildBuilderDelegate(
                  (_, i) => _buildDoctorCard(context, filtered[i]),
                  childCount: filtered.length,
                )),

              const SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDoctorCard(BuildContext context, Map<String, dynamic> doc) {
    final name = doc['name'] ?? 'Doctor';
    final spec = doc['specialty'] ?? doc['speciality'] ?? '';
    final exp = doc['experience'] ?? '';
    final fee = doc['fee'] ?? 0;
    final rating = doc['rating'] ?? 0.0;
    final reviewCount = doc['reviewCount'] ?? 0;
    final nextSlot = doc['nextSlot'] ?? 'Available';
    final photo = doc['photo'] as String?;
    final modes = doc['modes'] ?? 'In-Person';

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, CustomerRouter.doctorProfile, arguments: doc),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 6, 16, 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 2))],
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Avatar
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: photo != null
              ? KartseekImage(url: photo, width: 64, height: 64, fit: BoxFit.cover)
              : Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]), borderRadius: BorderRadius.circular(14)),
                  child: Center(child: Text(name.split(' ').last[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 24))),
                ),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 2),
            Text(spec, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6D28D9))),
            if (exp.toString().isNotEmpty) ...[
              const SizedBox(height: 2),
              Text('$exp experience', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ],
            const SizedBox(height: 8),
            // Rating + fee row
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 2),
                  Text('$rating', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF92400E))),
                  Text(' ($reviewCount)', style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
                ]),
              ),
              const SizedBox(width: 8),
              if (modes.toString().contains('Video'))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(6)),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.videocam, size: 12, color: Color(0xFF6D28D9)),
                    SizedBox(width: 2),
                    Text('Video', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF6D28D9))),
                  ]),
                ),
              const Spacer(),
              Text('${RegionService.instance.currentCountry.currencySymbol} $fee', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            ]),
            const SizedBox(height: 6),
            // Next slot
            Row(children: [
              const Icon(Icons.access_time, size: 12, color: Color(0xFF10B981)),
              const SizedBox(width: 4),
              Text(nextSlot, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF10B981))),
            ]),
          ])),
        ]),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Text('🔍', style: TextStyle(fontSize: 48)),
      const SizedBox(height: 12),
      const Text('No doctors found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      const SizedBox(height: 4),
      const Text('Try a different search or filter', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
      const SizedBox(height: 16),
      GestureDetector(
        onTap: () => setState(() { _selectedSpecialty = 'All'; _searchController.clear(); _videoOnly = false; }),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          decoration: BoxDecoration(color: const Color(0xFF6D28D9), borderRadius: BorderRadius.circular(10)),
          child: const Text('Clear Filters', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
        ),
      ),
    ]));
  }
}
