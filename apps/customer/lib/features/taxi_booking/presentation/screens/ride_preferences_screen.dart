import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Ride Preferences Screen — Customize ride experience.
///
/// Features:
///  - Toggle preferences: quiet ride, AC, music, luggage help
///  - Accessibility options: wheelchair, hearing assistance
///  - Driver communication preferences
///  - Settings persist across sessions (in production: via SharedPreferences)
///  - Support section with help center links
class RidePreferencesScreen extends StatefulWidget {
  final bool isSupport;
  const RidePreferencesScreen({super.key, this.isSupport = false});

  @override
  State<RidePreferencesScreen> createState() => _RidePreferencesScreenState();
}

class _RidePreferencesScreenState extends State<RidePreferencesScreen> with SingleTickerProviderStateMixin {
  // Preferences state
  bool _quietRide = false;
  bool _acOn = true;
  bool _musicAllowed = true;
  bool _luggageHelp = false;
  bool _wheelchairAccess = false;
  bool _hearingAssist = false;
  bool _prefersChat = false;
  String _tempPreference = 'Normal';
  String _seatPreference = 'No preference';
  late AnimationController _entryCtrl;

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bg => _isDark ? const Color(0xFF0F0F23) : Colors.grey.shade50;
  Color get _card => _isDark ? const Color(0xFF1A1A2E) : Colors.white;
  Color get _accent => const Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _entryCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 500))..forward();
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: Text(
          widget.isSupport ? 'Support' : 'Ride Preferences',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        elevation: 0,
      ),
      body: FadeTransition(
        opacity: _entryCtrl,
        child: widget.isSupport ? _buildSupportContent() : _buildPreferencesContent(),
      ),
    );
  }

  Widget _buildPreferencesContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Comfort Preferences ─────────────────────────
        _sectionHeader('Comfort', Icons.spa_rounded),
        const SizedBox(height: 8),
        _toggleCard(
          icon: Icons.volume_off_rounded,
          title: 'Quiet Ride',
          subtitle: 'Let your driver know you prefer silence',
          value: _quietRide,
          onChanged: (v) => setState(() => _quietRide = v),
          color: Colors.purple,
        ),
        _toggleCard(
          icon: Icons.ac_unit_rounded,
          title: 'Air Conditioning',
          subtitle: 'Request AC during your ride',
          value: _acOn,
          onChanged: (v) => setState(() => _acOn = v),
          color: _accent,
        ),
        _toggleCard(
          icon: Icons.music_note_rounded,
          title: 'Music Allowed',
          subtitle: 'Driver may play music during the ride',
          value: _musicAllowed,
          onChanged: (v) => setState(() => _musicAllowed = v),
          color: Colors.pink,
        ),
        _toggleCard(
          icon: Icons.luggage_rounded,
          title: 'Luggage Assistance',
          subtitle: 'Driver will help with your luggage',
          value: _luggageHelp,
          onChanged: (v) => setState(() => _luggageHelp = v),
          color: Colors.teal,
        ),
        const SizedBox(height: 16),
        // ── Temperature ─────────────────────────────────
        _sectionHeader('Temperature', Icons.thermostat_rounded),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _card,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Preferred temperature', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: _isDark ? Colors.white : Colors.black87)),
              const SizedBox(height: 12),
              Row(
                children: ['Cool', 'Normal', 'Warm'].map((t) {
                  final isSelected = _tempPreference == t;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _tempPreference = t);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? _accent.withValues(alpha: 0.1) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: isSelected ? _accent : Colors.grey.shade300, width: 1.5),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              t == 'Cool' ? Icons.ac_unit : t == 'Warm' ? Icons.wb_sunny_rounded : Icons.thermostat_rounded,
                              color: isSelected ? _accent : Colors.grey,
                              size: 22,
                            ),
                            const SizedBox(height: 4),
                            Text(t, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500, color: isSelected ? _accent : Colors.grey)),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // ── Seating ─────────────────────────────────────
        _sectionHeader('Seating', Icons.event_seat_rounded),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _card,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Preferred seat', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: _isDark ? Colors.white : Colors.black87)),
              const SizedBox(height: 12),
              ...['No preference', 'Behind driver', 'Behind passenger', 'Front seat'].map((seat) {
                final isSelected = _seatPreference == seat;
                return GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _seatPreference = seat);
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? _accent.withValues(alpha: 0.08) : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isSelected ? _accent : Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 20, height: 20,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? _accent : Colors.transparent,
                            border: Border.all(color: isSelected ? _accent : Colors.grey.shade300, width: 2),
                          ),
                          child: isSelected ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                        ),
                        const SizedBox(width: 12),
                        Text(seat, style: TextStyle(fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500, fontSize: 14)),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // ── Accessibility ───────────────────────────────
        _sectionHeader('Accessibility', Icons.accessible_rounded),
        const SizedBox(height: 8),
        _toggleCard(
          icon: Icons.accessible_rounded,
          title: 'Wheelchair Accessible',
          subtitle: 'Request a wheelchair-accessible vehicle',
          value: _wheelchairAccess,
          onChanged: (v) => setState(() => _wheelchairAccess = v),
          color: Colors.orange,
        ),
        _toggleCard(
          icon: Icons.hearing_rounded,
          title: 'Hearing Assistance',
          subtitle: 'Driver will use visual cues for communication',
          value: _hearingAssist,
          onChanged: (v) => setState(() => _hearingAssist = v),
          color: Colors.indigo,
        ),
        const SizedBox(height: 16),
        // ── Communication ───────────────────────────────
        _sectionHeader('Communication', Icons.chat_rounded),
        const SizedBox(height: 8),
        _toggleCard(
          icon: Icons.chat_bubble_outline_rounded,
          title: 'Prefer In-App Chat',
          subtitle: 'Communicate via chat instead of calls',
          value: _prefersChat,
          onChanged: (v) => setState(() => _prefersChat = v),
          color: const Color(0xFF10B981),
        ),
        const SizedBox(height: 24),
        // ── Save Button ─────────────────────────────────
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: () {
              HapticFeedback.mediumImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Preferences saved! They\'ll apply to future rides.')),
              );
              Navigator.of(context).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _accent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: const Text('Save Preferences', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildSupportContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Quick Actions ────────────────────────────────
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [_accent.withValues(alpha: 0.1), _accent.withValues(alpha: 0.03)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              Icon(Icons.support_agent_rounded, size: 48, color: _accent),
              const SizedBox(height: 12),
              Text('How can we help?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: _isDark ? Colors.white : Colors.black87)),
              const SizedBox(height: 6),
              Text('Get help with your rides, payments, or account', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _supportCard(Icons.help_outline_rounded, 'Help Center', 'Browse FAQs and guides', Colors.blue),
        _supportCard(Icons.chat_rounded, 'Chat with Support', 'Talk to our team live', const Color(0xFF10B981)),
        _supportCard(Icons.report_problem_rounded, 'Report an Issue', 'Report a safety or service issue', Colors.orange),
        _supportCard(Icons.feedback_rounded, 'Send Feedback', 'Help us improve your experience', Colors.purple),
        _supportCard(Icons.receipt_long_rounded, 'Receipt Issues', 'Problems with receipts or invoices', Colors.teal),
        _supportCard(Icons.shield_rounded, 'Safety Resources', 'Tips and emergency information', Colors.red),
      ],
    );
  }

  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: _accent),
        const SizedBox(width: 8),
        Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _isDark ? Colors.white : Colors.black87)),
      ],
    );
  }

  Widget _toggleCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        trailing: Switch.adaptive(
          value: value,
          onChanged: (v) {
            HapticFeedback.selectionClick();
            onChanged(v);
          },
          activeTrackColor: color,
        ),
      ),
    );
  }

  Widget _supportCard(IconData icon, String title, String subtitle, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        trailing: Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
        onTap: () {
          HapticFeedback.lightImpact();
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Opening $title...')));
        },
      ),
    );
  }
}
