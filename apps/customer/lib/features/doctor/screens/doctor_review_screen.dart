import 'package:flutter/material.dart';

/// Doctor Review Screen — Rate and review doctor after consultation.
class DoctorReviewScreen extends StatefulWidget {
  final Map<String, dynamic> appointmentData;
  const DoctorReviewScreen({super.key, required this.appointmentData});

  @override
  State<DoctorReviewScreen> createState() => _DoctorReviewScreenState();
}

class _DoctorReviewScreenState extends State<DoctorReviewScreen> {
  int _rating = 0;
  final _reviewController = TextEditingController();
  final _selectedTags = <String>{};
  bool _submitted = false;

  static const _tags = ['Very knowledgeable', 'Good listener', 'Friendly', 'Thorough examination', 'Clear explanation', 'On time', 'Professional', 'Recommended'];

  @override
  void dispose() { _reviewController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final doctorName = widget.appointmentData['doctorName'] ?? 'Doctor';

    if (_submitted) return _buildSuccessState(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.close, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('Rate Your Visit', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          // ── Doctor Info ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(children: [
              Container(
                width: 60, height: 60,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                child: Center(child: Text(doctorName.split(' ').last[0], style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900))),
              ),
              const SizedBox(height: 10),
              Text(doctorName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
              Text(widget.appointmentData['speciality'] ?? widget.appointmentData['specialty'] ?? '', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.7))),
            ]),
          ),

          const SizedBox(height: 24),

          // ── Star Rating ──
          const Text('How was your experience?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) {
            final emoji = ['😞', '😐', '🙂', '😊', '🤩'];
            return GestureDetector(
              onTap: () => setState(() => _rating = i + 1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 6),
                width: _rating == i + 1 ? 52 : 44,
                height: _rating == i + 1 ? 52 : 44,
                decoration: BoxDecoration(
                  color: _rating >= i + 1 ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: _rating >= i + 1 ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0), width: _rating == i + 1 ? 2 : 1),
                  boxShadow: _rating == i + 1 ? [BoxShadow(color: const Color(0xFFF59E0B).withValues(alpha: 0.2), blurRadius: 8)] : null,
                ),
                child: Center(child: Text(_rating >= i + 1 ? emoji[i] : '⭐', style: TextStyle(fontSize: _rating == i + 1 ? 24 : 20))),
              ),
            );
          })),
          if (_rating > 0) Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][_rating - 1], style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B))),
          ),

          const SizedBox(height: 24),

          // ── Quick Tags ──
          const Align(alignment: Alignment.centerLeft, child: Text('What went well?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)))),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: _tags.map((t) {
            final selected = _selectedTags.contains(t);
            return GestureDetector(
              onTap: () => setState(() => selected ? _selectedTags.remove(t) : _selectedTags.add(t)),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? const Color(0xFF6D28D9).withValues(alpha: 0.1) : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: selected ? const Color(0xFF6D28D9) : const Color(0xFFE2E8F0)),
                ),
                child: Text(t, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected ? const Color(0xFF6D28D9) : const Color(0xFF64748B))),
              ),
            );
          }).toList()),

          const SizedBox(height: 20),

          // ── Text Review ──
          const Align(alignment: Alignment.centerLeft, child: Text('Write a review (optional)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)))),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: TextField(
              controller: _reviewController,
              maxLines: 4, maxLength: 500,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Share your experience to help others...', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                border: InputBorder.none, contentPadding: const EdgeInsets.all(14), counterStyle: TextStyle(fontSize: 10, color: Colors.grey.shade400),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ── Submit ──
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _rating > 0 ? () => setState(() => _submitted = true) : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6D28D9), foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFFE2E8F0), disabledForegroundColor: const Color(0xFF94A3B8),
                padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
          ),

          const SizedBox(height: 30),
        ]),
      ),
    );
  }

  Widget _buildSuccessState(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: Center(child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 80, height: 80,
            decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
            child: const Icon(Icons.check, color: Colors.white, size: 40),
          ),
          const SizedBox(height: 24),
          const Text('Thank You!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 8),
          Text('Your review for ${widget.appointmentData['doctorName']} has been submitted.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => Icon(Icons.star, size: 28, color: i < _rating ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0)))),
          const SizedBox(height: 30),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6D28D9), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          )),
        ]),
      )),
    );
  }
}
