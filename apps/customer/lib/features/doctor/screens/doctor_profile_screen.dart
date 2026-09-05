import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Doctor Profile Screen — Full doctor details with booking CTA.
class DoctorProfileScreen extends StatelessWidget {
  final Map<String, dynamic> doctorData;
  const DoctorProfileScreen({super.key, required this.doctorData});

  @override
  Widget build(BuildContext context) {
    final name = doctorData['name'] ?? 'Doctor';
    final spec = doctorData['specialty'] ?? doctorData['speciality'] ?? '';
    final qual = doctorData['qualification'] ?? 'MBBS';
    final exp = doctorData['experience'] ?? '10 yrs';
    final fee = doctorData['fee'] ?? 500;
    final rating = doctorData['rating'] ?? 4.8;
    final reviewCount = doctorData['reviewCount'] ?? 100;
    final photo = doctorData['photo'] as String?;
    final modes = (doctorData['modes'] ?? 'In-Person').toString();
    final currency = RegionService.instance.currentCountry.currencySymbol;

    final timeSlots = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '3:30 PM', '5:00 PM'];
    final days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat'];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ── Hero Header ──
          SliverAppBar(
            expandedHeight: 260, pinned: true, elevation: 0,
            backgroundColor: const Color(0xFF6D28D9),
            surfaceTintColor: Colors.transparent,
            leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
            actions: [
              IconButton(icon: const Icon(Icons.share, color: Colors.white, size: 20), onPressed: () {}),
              IconButton(icon: const Icon(Icons.favorite_border, color: Colors.white, size: 20), onPressed: () {}),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: photo != null
                          ? KartseekImage(url: photo, width: 100, height: 100, fit: BoxFit.cover)
                          : Container(width: 100, height: 100, color: Colors.white24, child: Center(child: Text(name[0], style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w900)))),
                      ),
                      const SizedBox(width: 16),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                        Text(spec, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 4),
                        Text(qual, style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.6))),
                        const SizedBox(height: 12),
                        Row(children: [
                          _statChip('⭐ $rating', const Color(0xFFFEF3C7), const Color(0xFF92400E)),
                          const SizedBox(width: 8),
                          _statChip('🕐 $exp', const Color(0xFFEDE9FE), const Color(0xFF6D28D9)),
                        ]),
                      ])),
                    ]),
                  ),
                ),
              ),
            ),
          ),

          // ── Quick Stats ──
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
              child: Row(children: [
                _quickStat('$reviewCount', 'Reviews', Icons.reviews, const Color(0xFF6D28D9)),
                _divider(),
                _quickStat('$exp', 'Experience', Icons.workspace_premium, const Color(0xFF0891B2)),
                _divider(),
                _quickStat('$currency $fee', 'Consult Fee', Icons.payments, const Color(0xFF059669)),
              ]),
            ),
          ),

          // ── About ──
          SliverToBoxAdapter(child: _sectionCard('About', [
            const Text('Highly experienced specialist with expertise in diagnosing and treating complex conditions. Known for patient-centered care and cutting-edge treatment approaches.', style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF475569))),
            const SizedBox(height: 12),
            Row(children: [
              _tagChip('In-Person', Icons.person, modes.contains('In-Person')),
              const SizedBox(width: 8),
              _tagChip('Video Consult', Icons.videocam, modes.contains('Video')),
            ]),
          ])),

          // ── Available Slots ──
          SliverToBoxAdapter(child: _sectionCard('Available Slots', [
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: days.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: i == 0 ? const Color(0xFF6D28D9) : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: i == 0 ? const Color(0xFF6D28D9) : const Color(0xFFE2E8F0)),
                  ),
                  child: Center(child: Text(days[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: i == 0 ? Colors.white : const Color(0xFF475569)))),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(spacing: 8, runSpacing: 8, children: timeSlots.map((t) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFBBF7D0))),
              child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF166534))),
            )).toList()),
          ])),

          // ── Patient Reviews ──
          SliverToBoxAdapter(child: _sectionCard('Patient Reviews', [
            ...[
              {'name': 'Sarah M.', 'rating': 5, 'text': 'Excellent doctor! Very thorough and caring.', 'date': '2 days ago'},
              {'name': 'James O.', 'rating': 4, 'text': 'Good consultation, explained everything clearly.', 'date': '1 week ago'},
            ].map((r) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(r['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  ...List.generate(r['rating'] as int, (_) => const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B))),
                ]),
                const SizedBox(height: 6),
                Text(r['text'] as String, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                const SizedBox(height: 4),
                Text(r['date'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              ]),
            )),
          ])),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),

      // ── Bottom CTA ──
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -2))]),
        child: SafeArea(
          child: Row(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$currency $fee', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              const Text('per consultation', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ]),
            const SizedBox(width: 16),
            Expanded(child: ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, CustomerRouter.doctorBooking, arguments: {'doctorName': name}),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6D28D9), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              child: const Text('Book Appointment', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            )),
          ]),
        ),
      ),
    );
  }

  Widget _statChip(String text, Color bg, Color fg) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
    child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
  );

  Widget _quickStat(String value, String label, IconData icon, Color color) => Expanded(
    child: Column(children: [
      Icon(icon, color: color, size: 20),
      const SizedBox(height: 6),
      Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
      Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
    ]),
  );

  Widget _divider() => Container(width: 1, height: 40, color: const Color(0xFFE2E8F0));

  Widget _tagChip(String text, IconData icon, bool active) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(
      color: active ? const Color(0xFFEDE9FE) : const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: active ? const Color(0xFFC4B5FD) : const Color(0xFFE2E8F0)),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 14, color: active ? const Color(0xFF6D28D9) : const Color(0xFF94A3B8)),
      const SizedBox(width: 4),
      Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: active ? const Color(0xFF6D28D9) : const Color(0xFF94A3B8))),
    ]),
  );

  Widget _sectionCard(String title, List<Widget> children) => Container(
    margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      const SizedBox(height: 12),
      ...children,
    ]),
  );
}
