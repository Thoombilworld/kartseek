import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_event.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Partner app hamburger menu drawer.
///
/// Dynamically adapts menu items based on the active role (Taxi / Delivery).
/// The History item routes to the appropriate history screen for the current role.
class PartnerDrawerMenu extends StatelessWidget {
  final String partnerName;
  final String partnerRole;
  final double rating;
  final bool isOnline;

  const PartnerDrawerMenu({
    super.key,
    required this.partnerName,
    required this.partnerRole,
    required this.rating,
    required this.isOnline,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final isTaxi = state.isTaxiMode;
        final isDualRole = state.profile.role == PartnerRole.both;
        final historyRoute = isTaxi
            ? PartnerRouter.partnerTripHistory
            : PartnerRouter.partnerDeliveryHistory;

        return Drawer(
          backgroundColor: Colors.white,
          child: SafeArea(
            child: Column(
              children: [
                // Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(gradient: PartnerTheme.primaryGradient),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: Colors.white.withValues(alpha: 0.2),
                            child: const Icon(Icons.person, color: Colors.white, size: 32),
                          ),
                          const Spacer(),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isOnline ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  isOnline ? 'Online' : 'Offline',
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                              ),
                              if (isDualRole) ...[
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: (isTaxi ? PartnerTheme.taxiColor : PartnerTheme.deliveryColor).withValues(alpha: 0.3),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isTaxi ? Icons.local_taxi : Icons.local_shipping,
                                        size: 12,
                                        color: Colors.white,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isTaxi ? 'Taxi' : 'Delivery',
                                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(partnerName, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text(partnerRole, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(rating.toStringAsFixed(1), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                        ],
                      ),
                    ],
                  ),
                ),
                // Menu Items
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    children: [
                      _menuItem(context, Icons.home_rounded, 'Home', PartnerRouter.partnerDashboard),
                      _menuItem(context, Icons.person_outline, 'Profile', PartnerRouter.partnerProfile),
                      _menuItem(
                        context,
                        Icons.history,
                        isTaxi ? 'Trip History' : 'Delivery History',
                        historyRoute,
                      ),
                      _menuItem(context, Icons.account_balance_wallet, 'Earnings', PartnerRouter.partnerEarnings),
                      _menuItem(context, Icons.receipt_long, 'Ledger', PartnerRouter.partnerLedger),
                      _menuItem(context, Icons.wallet, 'Wallet', PartnerRouter.partnerWallet),
                      _menuItem(context, Icons.description_outlined, 'Documents', PartnerRouter.partnerDocuments),
                      _menuItem(context, Icons.headset_mic_outlined, 'Support', PartnerRouter.partnerSupport),
                      _menuItem(context, Icons.settings_outlined, 'Settings', PartnerRouter.partnerSettings),
                      if (isDualRole) ...[
                        const Divider(height: 16),
                        ListTile(
                          leading: Icon(
                            isTaxi ? Icons.local_shipping : Icons.local_taxi,
                            color: isTaxi ? PartnerTheme.deliveryColor : PartnerTheme.taxiColor,
                            size: 22,
                          ),
                          title: Text(
                            isTaxi ? 'Switch to Delivery' : 'Switch to Taxi',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: isTaxi ? PartnerTheme.deliveryColor : PartnerTheme.taxiColor,
                            ),
                          ),
                          onTap: () {
                            Navigator.pop(context);
                            context.read<PartnerBloc>().add(const SwitchRole());
                          },
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
                        ),
                      ],
                      const Divider(height: 32),
                      _menuItem(context, Icons.logout, 'Logout', null, isLogout: true),
                    ],
                  ),
                ),
                // Footer
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('KARTSEEK Partner v1.1.0', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _menuItem(BuildContext context, IconData icon, String label, String? route, {bool isLogout = false}) {
    return ListTile(
      leading: Icon(icon, color: isLogout ? PartnerTheme.offlineRed : PartnerTheme.textSecondary, size: 22),
      title: Text(label, style: TextStyle(
        fontSize: 15, fontWeight: FontWeight.w600,
        color: isLogout ? PartnerTheme.offlineRed : PartnerTheme.textPrimary,
      )),
      onTap: () {
        Navigator.pop(context);
        if (isLogout) {
          Navigator.pushNamedAndRemoveUntil(context, PartnerRouter.partnerLogin, (r) => false);
        } else if (route != null) {
          Navigator.pushNamed(context, route);
        }
      },
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
    );
  }
}
