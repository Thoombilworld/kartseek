import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Lost Item Screen — Report and recover items left in vehicle.
///
/// Features:
///  - Item category quick-select grid
///  - Description text field with character limit
///  - Driver contact option
///  - Photo upload placeholder
///  - Resolution timeline
class LostItemScreen extends StatefulWidget {
  const LostItemScreen({super.key});

  @override
  State<LostItemScreen> createState() => _LostItemScreenState();
}

class _LostItemScreenState extends State<LostItemScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedCategory;
  final _descController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isSubmitting = false;
  late AnimationController _entryCtrl;

  static const _categories = [
    _ItemCategory(icon: Icons.phone_iphone_rounded, label: 'Phone'),
    _ItemCategory(icon: Icons.account_balance_wallet_rounded, label: 'Wallet'),
    _ItemCategory(icon: Icons.backpack_rounded, label: 'Bag'),
    _ItemCategory(icon: Icons.key_rounded, label: 'Keys'),
    _ItemCategory(icon: Icons.headphones_rounded, label: 'Earbuds'),
    _ItemCategory(icon: Icons.laptop_mac_rounded, label: 'Laptop'),
    _ItemCategory(icon: Icons.shopping_bag_rounded, label: 'Shopping'),
    _ItemCategory(icon: Icons.more_horiz_rounded, label: 'Other'),
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
    _descController.dispose();
    _phoneController.dispose();
    _entryCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('Lost Something?',
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
                  // ── Header ──────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          _accent.withValues(alpha: 0.1),
                          _accent.withValues(alpha: 0.03)
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.find_in_page_rounded,
                            size: 48, color: _accent),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('We\'ll help you find it',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: _isDark
                                          ? Colors.white
                                          : Colors.black87)),
                              const SizedBox(height: 4),
                              Text(
                                  'Report your lost item and we\'ll contact your driver to help retrieve it.',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey.shade500)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // ── Item Category Grid ──────────────────────
                  Text('What did you lose?',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _isDark ? Colors.white : Colors.black87)),
                  const SizedBox(height: 12),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.85,
                    ),
                    itemCount: _categories.length,
                    itemBuilder: (ctx, i) {
                      final cat = _categories[i];
                      final isSelected = _selectedCategory == cat.label;
                      return GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() => _selectedCategory = cat.label);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? _accent.withValues(alpha: 0.1)
                                : _card,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color:
                                    isSelected ? _accent : Colors.transparent,
                                width: 1.5),
                            boxShadow: [
                              BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 6)
                            ],
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(cat.icon,
                                  color: isSelected ? _accent : Colors.grey,
                                  size: 26),
                              const SizedBox(height: 6),
                              Text(cat.label,
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: isSelected
                                          ? FontWeight.w600
                                          : FontWeight.w500,
                                      color: isSelected
                                          ? _accent
                                          : Colors.grey.shade600)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  // ── Description ─────────────────────────────
                  Text('Describe the item',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _isDark ? Colors.white : Colors.black87)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descController,
                    maxLines: 3,
                    maxLength: 300,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText:
                          'e.g. Black leather wallet with 2 cards, left on back seat',
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
                  const SizedBox(height: 16),
                  // ── Contact Number ─────────────────────────
                  Text('Contact number',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _isDark ? Colors.white : Colors.black87)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      hintText: 'Phone number for the driver to call',
                      prefixIcon: Icon(Icons.phone_rounded,
                          color: Colors.grey.shade400),
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
                  const SizedBox(height: 20),
                  // ── Timeline ───────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color:
                              const Color(0xFF10B981).withValues(alpha: 0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('What happens next?',
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                                color: Color(0xFF10B981))),
                        const SizedBox(height: 8),
                        _timelineStep(
                            '1', 'Your driver will be notified immediately'),
                        _timelineStep('2',
                            'Driver checks the vehicle and responds within 1 hour'),
                        _timelineStep('3',
                            'If found, we\'ll arrange a pickup point for retrieval'),
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
                child: ElevatedButton.icon(
                  onPressed: _selectedCategory == null ||
                          _descController.text.isEmpty ||
                          _isSubmitting
                      ? null
                      : _submitReport,
                  icon: _isSubmitting
                      ? const SizedBox.shrink()
                      : const Icon(Icons.send_rounded),
                  label: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Submit Report',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accent,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _timelineStep(String num, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(6)),
            child: Text(num,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF10B981))),
          ),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600))),
        ],
      ),
    );
  }

  void _submitReport() async {
    HapticFeedback.heavyImpact();
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Report submitted. Your driver will be notified.')));
    Navigator.of(context).pop();
  }
}

class _ItemCategory {
  final IconData icon;
  final String label;
  const _ItemCategory({required this.icon, required this.label});
}
