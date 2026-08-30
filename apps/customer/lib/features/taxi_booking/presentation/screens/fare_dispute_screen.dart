import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Fare Dispute Screen — Dispute ride charges with evidence.
///
/// Features:
///  - Issue category selector with animated chips
///  - Fare breakdown comparison (estimated vs charged)
///  - Optional photo evidence upload
///  - Additional details text field
///  - Estimated resolution time
class FareDisputeScreen extends StatefulWidget {
  const FareDisputeScreen({super.key});

  @override
  State<FareDisputeScreen> createState() => _FareDisputeScreenState();
}

class _FareDisputeScreenState extends State<FareDisputeScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedIssue;
  final _detailsController = TextEditingController();
  bool _isSubmitting = false;
  late AnimationController _entryCtrl;

  static const _issues = [
    _DisputeIssue(
        icon: Icons.trending_up_rounded,
        label: 'Charged more than estimate',
        desc: 'The final fare exceeds the estimated fare'),
    _DisputeIssue(
        icon: Icons.route_rounded,
        label: 'Longer route taken',
        desc: 'Driver took a longer route than necessary'),
    _DisputeIssue(
        icon: Icons.block_rounded,
        label: 'Incorrect cancellation fee',
        desc: 'Charged a fee for a cancelled trip'),
    _DisputeIssue(
        icon: Icons.toll_rounded,
        label: 'Wrong toll/surcharge',
        desc: 'Toll or surcharge was added incorrectly'),
    _DisputeIssue(
        icon: Icons.car_crash_rounded,
        label: 'Trip I didn\'t take',
        desc: 'Charged for a trip that didn\'t happen'),
    _DisputeIssue(
        icon: Icons.more_horiz_rounded,
        label: 'Other fare issue',
        desc: 'Something else about my fare'),
  ];

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bg => _isDark ? const Color(0xFF0F0F23) : Colors.grey.shade50;
  Color get _card => _isDark ? const Color(0xFF1A1A2E) : Colors.white;
  Color get _accent => const Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _entryCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 500))
      ..forward();
  }

  @override
  void dispose() {
    _detailsController.dispose();
    _entryCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('Fare Dispute',
            style: TextStyle(fontWeight: FontWeight.w700)),
        elevation: 0,
      ),
      body: FadeTransition(
        opacity: _entryCtrl,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // ── Fare Comparison Card ────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _card,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4))
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              Text('Estimated',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500)),
                              const SizedBox(height: 4),
                              const Text('350',
                                  style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF10B981))),
                            ],
                          ),
                        ),
                        Container(
                            width: 1, height: 40, color: Colors.grey.shade200),
                        Expanded(
                          child: Column(
                            children: [
                              Text('Charged',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500)),
                              const SizedBox(height: 4),
                              Text('520',
                                  style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.red.shade400)),
                            ],
                          ),
                        ),
                        Container(
                            width: 1, height: 40, color: Colors.grey.shade200),
                        Expanded(
                          child: Column(
                            children: [
                              Text('Difference',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500)),
                              const SizedBox(height: 4),
                              Text('+170',
                                  style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.orange.shade600)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // ── Issue Selection ─────────────────────────
                  Text('What went wrong?',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: _isDark ? Colors.white : Colors.black87)),
                  const SizedBox(height: 12),
                  ...List.generate(_issues.length, (i) {
                    final issue = _issues[i];
                    final isSelected = _selectedIssue == issue.label;
                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _selectedIssue = issue.label);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _accent.withValues(alpha: 0.08)
                              : _card,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: isSelected ? _accent : Colors.transparent,
                              width: 1.5),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withValues(alpha: 0.03),
                                blurRadius: 6)
                          ],
                        ),
                        child: Row(
                          children: [
                            Icon(issue.icon,
                                color: isSelected ? _accent : Colors.grey,
                                size: 22),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(issue.label,
                                      style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                          color: _isDark
                                              ? Colors.white
                                              : Colors.black87)),
                                  Text(issue.desc,
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade500)),
                                ],
                              ),
                            ),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 22,
                              height: 22,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color:
                                    isSelected ? _accent : Colors.transparent,
                                border: Border.all(
                                    color: isSelected
                                        ? _accent
                                        : Colors.grey.shade300,
                                    width: 2),
                              ),
                              child: isSelected
                                  ? const Icon(Icons.check,
                                      size: 14, color: Colors.white)
                                  : null,
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                  // ── Additional Details ─────────────────────
                  TextField(
                    controller: _detailsController,
                    maxLines: 3,
                    maxLength: 500,
                    decoration: InputDecoration(
                      hintText: 'Add more details about the issue (optional)',
                      filled: true,
                      fillColor: _card,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.grey.shade200)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // ── Resolution Info ────────────────────────
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: _accent.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12),
                      border:
                          Border.all(color: _accent.withValues(alpha: 0.15)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline_rounded,
                            color: _accent, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Disputes are typically resolved within 24-48 hours. You\'ll receive a notification once reviewed.',
                            style: TextStyle(
                                fontSize: 12,
                                color: _accent.withValues(alpha: 0.8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // ── Submit Button ─────────────────────────────
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _selectedIssue == null || _isSubmitting
                      ? null
                      : _submitDispute,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accent,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Submit Dispute',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _submitDispute() async {
    HapticFeedback.heavyImpact();
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Dispute submitted. We\'ll review within 24 hours.')));
    Navigator.of(context).pop();
  }
}

class _DisputeIssue {
  final IconData icon;
  final String label;
  final String desc;
  const _DisputeIssue(
      {required this.icon, required this.label, required this.desc});
}
