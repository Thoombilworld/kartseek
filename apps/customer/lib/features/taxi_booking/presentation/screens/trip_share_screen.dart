import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Trip Share Screen — Share live trip location with contacts.
///
/// Features:
///  - Share via SMS, WhatsApp, copy link
///  - Emergency contacts quick-share
///  - Live sharing toggle with timer
///  - Trip info card (driver, vehicle, ETA)
///  - QR code placeholder for in-person sharing
class TripShareScreen extends StatefulWidget {
  const TripShareScreen({super.key});

  @override
  State<TripShareScreen> createState() => _TripShareScreenState();
}

class _TripShareScreenState extends State<TripShareScreen>
    with SingleTickerProviderStateMixin {
  bool _isSharing = false;
  late AnimationController _pulseCtrl;

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bg => _isDark ? const Color(0xFF0F0F23) : Colors.grey.shade50;
  Color get _card => _isDark ? const Color(0xFF1A1A2E) : Colors.white;
  Color get _accent => const Color(0xFF3B82F6);

  final List<_EmergencyContact> _contacts = [
    const _EmergencyContact(name: 'Mom', initials: 'M', color: Colors.pink),
    const _EmergencyContact(name: 'Dad', initials: 'D', color: Colors.blue),
    const _EmergencyContact(
        name: 'Partner', initials: 'P', color: Colors.purple),
  ];

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('Share Trip',
            style: TextStyle(fontWeight: FontWeight.w700)),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Live Sharing Toggle ────────────────────────
          AnimatedBuilder(
            animation: _pulseCtrl,
            builder: (ctx, child) {
              return Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _isSharing
                        ? [
                            const Color(0xFF10B981).withValues(alpha: 0.15),
                            const Color(0xFF10B981).withValues(alpha: 0.05)
                          ]
                        : [
                            _accent.withValues(alpha: 0.1),
                            _accent.withValues(alpha: 0.03)
                          ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: _isSharing
                      ? Border.all(
                          color: const Color(0xFF10B981)
                              .withValues(alpha: 0.3 + _pulseCtrl.value * 0.2),
                          width: 2)
                      : null,
                ),
                child: Column(
                  children: [
                    Icon(
                      _isSharing
                          ? Icons.share_location_rounded
                          : Icons.location_off_rounded,
                      size: 56,
                      color: _isSharing ? const Color(0xFF10B981) : _accent,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _isSharing
                          ? 'Live Sharing Active'
                          : 'Share Your Live Trip',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _isDark ? Colors.white : Colors.black87),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _isSharing
                          ? 'Your contacts can track your ride in real-time'
                          : 'Let friends and family follow your trip for safety',
                      textAlign: TextAlign.center,
                      style:
                          TextStyle(color: Colors.grey.shade500, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          setState(() => _isSharing = !_isSharing);
                        },
                        icon: Icon(_isSharing
                            ? Icons.stop_rounded
                            : Icons.play_arrow_rounded),
                        label: Text(
                          _isSharing ? 'Stop Sharing' : 'Start Live Sharing',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isSharing
                              ? Colors.red.shade400
                              : const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          // ── Emergency Contacts ─────────────────────────
          Text('Emergency Contacts',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: _isDark ? Colors.white : Colors.black87)),
          const SizedBox(height: 4),
          Text('Quick share with your trusted contacts',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
          const SizedBox(height: 12),
          Row(
            children: [
              ..._contacts.map((c) => Expanded(
                    child: GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text('Trip shared with ${c.name}')));
                      },
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: _card,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8)
                          ],
                        ),
                        child: Column(
                          children: [
                            CircleAvatar(
                              backgroundColor: c.color.withValues(alpha: 0.15),
                              radius: 24,
                              child: Text(c.initials,
                                  style: TextStyle(
                                      color: c.color,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 18)),
                            ),
                            const SizedBox(height: 8),
                            Text(c.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 4),
                            Icon(Icons.send_rounded, size: 16, color: _accent),
                          ],
                        ),
                      ),
                    ),
                  )),
              const SizedBox(width: 4),
              Container(
                width: 56,
                padding: const EdgeInsets.symmetric(vertical: 24),
                decoration: BoxDecoration(
                  color: _card,
                  borderRadius: BorderRadius.circular(14),
                  border:
                      Border.all(color: Colors.grey.withValues(alpha: 0.15)),
                ),
                child: Column(
                  children: [
                    Icon(Icons.person_add_rounded, color: _accent, size: 24),
                    const SizedBox(height: 6),
                    Text('Add',
                        style: TextStyle(
                            fontSize: 11,
                            color: _accent,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // ── Share Options ──────────────────────────────
          Text('Share Via',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: _isDark ? Colors.white : Colors.black87)),
          const SizedBox(height: 12),
          _shareOption(Icons.message_rounded, 'SMS',
              'Send a text with tracking link', Colors.green),
          _shareOption(Icons.chat_rounded, 'WhatsApp',
              'Share via WhatsApp message', const Color(0xFF25D366)),
          _shareOption(Icons.link_rounded, 'Copy Link',
              'Copy trip tracking URL', _accent),
          _shareOption(Icons.qr_code_rounded, 'QR Code',
              'Show QR for in-person sharing', Colors.purple),
          const SizedBox(height: 16),
          // ── Trip Info ──────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Trip Info',
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: Colors.grey.shade500)),
                const SizedBox(height: 12),
                _infoRow(Icons.person_rounded, 'Driver', 'John K.'),
                _infoRow(Icons.directions_car_rounded, 'Vehicle',
                    'White Toyota Corolla • KBX 123Y'),
                _infoRow(Icons.access_time_rounded, 'ETA', '~15 minutes'),
                _infoRow(
                    Icons.route_rounded, 'Destination', 'Westlands, Nairobi'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _shareOption(
      IconData icon, String title, String subtitle, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        trailing:
            Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
        onTap: () {
          HapticFeedback.lightImpact();
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('$title sharing — would open $title')));
        },
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade400),
          const SizedBox(width: 10),
          Text('$label: ',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }
}

class _EmergencyContact {
  final String name;
  final String initials;
  final Color color;
  const _EmergencyContact(
      {required this.name, required this.initials, required this.color});
}
