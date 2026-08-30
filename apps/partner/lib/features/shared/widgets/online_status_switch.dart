import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Online/Offline toggle switch for partner dashboard
class OnlineStatusSwitch extends StatelessWidget {
  final bool isOnline;
  final bool kycApproved;
  final VoidCallback onToggle;

  const OnlineStatusSwitch({
    super.key,
    required this.isOnline,
    required this.kycApproved,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (!kycApproved) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Complete KYC verification to go online'),
              backgroundColor: PartnerTheme.offlineRed,
            ),
          );
          return;
        }
        onToggle();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          gradient: isOnline ? const LinearGradient(
            colors: [Color(0xFF16A34A), Color(0xFF22C55E)],
          ) : const LinearGradient(
            colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
          ),
          borderRadius: BorderRadius.circular(50),
          boxShadow: [
            BoxShadow(
              color: (isOnline ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed).withValues(alpha: 0.4),
              blurRadius: 16, offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 12, height: 12,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Colors.white.withValues(alpha: 0.5), blurRadius: 6)],
              ),
            ),
            const SizedBox(width: 10),
            Text(
              isOnline ? 'ONLINE' : 'OFFLINE',
              style: const TextStyle(
                color: Colors.white, fontSize: 16,
                fontWeight: FontWeight.w800, letterSpacing: 1.5,
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              isOnline ? Icons.toggle_on : Icons.toggle_off,
              color: Colors.white, size: 28,
            ),
          ],
        ),
      ),
    );
  }
}
