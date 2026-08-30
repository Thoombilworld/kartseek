import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_event.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// KARTSEEK Partner App — Inline Role Switcher Widget
///
/// Displays an animated toggle allowing partners with dual roles (Taxi + Delivery)
/// to seamlessly switch between modes. When switched, the BLoC updates the active
/// role and the dashboard re-renders with role-relevant data.
class RoleSwitcherWidget extends StatelessWidget {
  const RoleSwitcherWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      buildWhen: (prev, curr) => prev.activeRole != curr.activeRole || prev.profile.role != curr.profile.role,
      builder: (context, state) {
        // Only show for dual-role partners
        if (state.profile.role != PartnerRole.both) {
          return const SizedBox.shrink();
        }

        final isTaxi = state.activeRole == PartnerRole.taxiDriver;

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: PartnerTheme.border),
          ),
          child: Row(
            children: [
              // Taxi toggle
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (!isTaxi) {
                      context.read<PartnerBloc>().add(const SetActiveRole(PartnerRole.taxiDriver));
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: isTaxi ? PartnerTheme.taxiColor : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: isTaxi
                          ? [BoxShadow(color: PartnerTheme.taxiColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.local_taxi,
                          size: 18,
                          color: isTaxi ? Colors.white : PartnerTheme.textMuted,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Taxi Driver',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isTaxi ? Colors.white : PartnerTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              // Delivery toggle
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (isTaxi) {
                      context.read<PartnerBloc>().add(const SetActiveRole(PartnerRole.deliveryBoy));
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: !isTaxi ? PartnerTheme.deliveryColor : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: !isTaxi
                          ? [BoxShadow(color: PartnerTheme.deliveryColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.local_shipping,
                          size: 18,
                          color: !isTaxi ? Colors.white : PartnerTheme.textMuted,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Delivery Boy',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: !isTaxi ? Colors.white : PartnerTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
