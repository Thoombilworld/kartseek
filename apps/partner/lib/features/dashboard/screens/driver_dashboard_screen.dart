import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/widgets/online_status_switch.dart';
import 'package:kartseek_partner/features/shared/widgets/earnings_summary_card.dart';
import 'package:kartseek_partner/features/shared/widgets/active_job_card.dart';
import 'package:kartseek_partner/features/shared/widgets/partner_drawer_menu.dart';
import 'package:kartseek_partner/features/shared/widgets/role_switcher_widget.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_event.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/routing/partner_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Taxi Driver Dashboard — Main hub for taxi drivers.
///
/// Displays role-specific data: ride history, earnings from rides, active ride
/// card, and recent trips. Includes the [RoleSwitcherWidget] for dual-role
/// partners to seamlessly switch to Delivery Boy mode.
class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key});
  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final profile = state.profile;
        final isOnline = state.isOnline;
        final earnings = state.earnings;
        final rideHistory = state.rideHistory;
        final currency = RegionService.instance.currentCountry.currencySymbol;

        return Scaffold(
          key: _scaffoldKey,
          backgroundColor: PartnerTheme.surface,
          drawer: PartnerDrawerMenu(
            partnerName: profile.name,
            partnerRole: 'Taxi Driver',
            rating: profile.rating,
            isOnline: isOnline,
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ──────────────────────────────────────────────
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => _scaffoldKey.currentState?.openDrawer(),
                        child: Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: PartnerTheme.border)),
                          child: const Icon(Icons.menu, size: 22, color: PartnerTheme.textPrimary),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Hi, ${profile.name.split(' ').first} 👋', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: PartnerTheme.textPrimary)),
                            Row(
                              children: [
                                Container(
                                  width: 8, height: 8,
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(
                                    color: isOnline ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                Text(
                                  '${profile.vendorName != null ? '${profile.vendorName} ' : ''}Taxi Driver${isOnline ? ' • Online' : ' • Offline'}',
                                  style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted),
                                ),
                              ],
                            ),
                            // Vendor badge if vendor-managed
                            if (profile.vendorName != null) ...[
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: PartnerTheme.taxiColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: PartnerTheme.taxiColor.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.business, size: 12, color: PartnerTheme.taxiColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      profile.vendorName!,
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: PartnerTheme.taxiColor),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerNotifications),
                        child: Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: PartnerTheme.border)),
                          child: Stack(
                            children: [
                              const Center(child: Icon(Icons.notifications_outlined, size: 22, color: PartnerTheme.textPrimary)),
                              Positioned(top: 8, right: 8, child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: PartnerTheme.offlineRed, shape: BoxShape.circle))),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // ── Role Switcher (only for dual-role) ──────────────────
                  const RoleSwitcherWidget(),

                  // ── Online Switch ───────────────────────────────────────
                  Center(
                    child: OnlineStatusSwitch(
                      isOnline: isOnline,
                      kycApproved: profile.kycApproved,
                      onToggle: () => context.read<PartnerBloc>().add(const ToggleOnlineStatus()),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Earnings Card ───────────────────────────────────────
                  EarningsSummaryCard(
                    todayEarnings: earnings.todayEarnings,
                    completedJobs: earnings.completedTrips,
                    onlineHours: earnings.onlineHours,
                    rating: profile.rating,
                  ),
                  const SizedBox(height: 20),

                  // ── KYC Status Banner ───────────────────────────────────
                  if (profile.kycStatus != KycStatus.approved)
                    _kycBanner(context, profile.kycStatus),

                  // ── Active Ride Card (only when a real ride is active) ──
                  if (state.activeRide != null) ...[
                    ActiveJobCard(
                      jobId: state.activeRide!.id,
                      jobType: 'ride',
                      customerName: state.activeRide!.customerName,
                      status: 'going_to_pickup',
                      pickupAddress: state.activeRide!.pickupAddress,
                      dropAddress: state.activeRide!.dropAddress,
                      amount: state.activeRide!.formattedFare,
                      onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerActiveTrip),
                    ),
                  ],
                  const SizedBox(height: 20),

                  // ── Waiting indicator when online ────────────────────────
                  if (isOnline && state.activeRide == null)
                    _waitingForRidesCard(),

                  // ── Quick Actions ───────────────────────────────────────
                  const Text('Quick Actions', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _quickAction(context, Icons.history, 'History', PartnerRouter.partnerTripHistory),
                      const SizedBox(width: 10),
                      _quickAction(context, Icons.account_balance_wallet, 'Earnings', PartnerRouter.partnerEarnings),
                      const SizedBox(width: 10),
                      _quickAction(context, Icons.wallet, 'Wallet', PartnerRouter.partnerWallet),
                      const SizedBox(width: 10),
                      _quickAction(context, Icons.receipt_long, 'Ledger', PartnerRouter.partnerLedger),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Second row: Documents + Vendor
                  Row(
                    children: [
                      _quickAction(context, Icons.description, 'Documents', PartnerRouter.driverDocuments),
                      const SizedBox(width: 10),
                      if (profile.vendorName != null) ...[
                        _quickAction(context, Icons.business, 'My Vendor', PartnerRouter.driverVendorInfo),
                        const SizedBox(width: 10),
                      ],
                      const Spacer(),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Today's Stats ───────────────────────────────────────
                  const Text("Today's Summary", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _statCard('Completed', '${earnings.completedTrips}', Icons.check_circle, PartnerTheme.onlineGreen),
                      const SizedBox(width: 10),
                      _statCard('Cash', '$currency ${earnings.cashCollected.toStringAsFixed(0)}', Icons.payments, PartnerTheme.warningAmber),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _statCard('Pending', '$currency ${earnings.pendingPayout.toStringAsFixed(0)}', Icons.schedule, PartnerTheme.infoBlue),
                      const SizedBox(width: 10),
                      _statCard('Bonus', '$currency ${earnings.bonus.toStringAsFixed(0)}', Icons.card_giftcard, PartnerTheme.deliveryColor),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Recent Trips (from ride history) ───────────────────
                  Row(
                    children: [
                      const Text('Recent Trips', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerTripHistory),
                        child: const Text('View All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.primary)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Show real ride history data
                  ...rideHistory.take(3).map((ride) => _recentTrip(
                    ride.customerName,
                    '${ride.pickupAddress.split(',').first} → ${ride.dropAddress.split(',').first}',
                    ride.formattedFare,
                    ride.rating?.toStringAsFixed(1) ?? '—',
                    ride.paymentMethod,
                  )),
                  if (rideHistory.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: PartnerTheme.cardDecoration(),
                      child: const Center(
                        child: Text('No ride history yet', style: TextStyle(color: PartnerTheme.textMuted)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          // ── Bottom Nav ──────────────────────────────────────────────────
          bottomNavigationBar: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -2))],
            ),
            child: BottomNavigationBar(
              currentIndex: 0,
              type: BottomNavigationBarType.fixed,
              selectedItemColor: PartnerTheme.primary,
              unselectedItemColor: PartnerTheme.textMuted,
              selectedFontSize: 12, unselectedFontSize: 11,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
                BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet), label: 'Earnings'),
                BottomNavigationBarItem(icon: Icon(Icons.wallet), label: 'Wallet'),
                BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
              ],
              onTap: (i) {
                switch (i) {
                  case 1: Navigator.pushNamed(context, PartnerRouter.partnerTripHistory); break;
                  case 2: Navigator.pushNamed(context, PartnerRouter.partnerEarnings); break;
                  case 3: Navigator.pushNamed(context, PartnerRouter.partnerWallet); break;
                  case 4: Navigator.pushNamed(context, PartnerRouter.partnerProfile); break;
                }
              },
            ),
          ),
        );
      },
    );
  }

  Widget _waitingForRidesCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PartnerTheme.taxiColor.withValues(alpha: 0.08), PartnerTheme.taxiColor.withValues(alpha: 0.02)],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: PartnerTheme.taxiColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 22, height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation(PartnerTheme.taxiColor.withValues(alpha: 0.6)),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Waiting for ride requests…', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PartnerTheme.textPrimary)),
                SizedBox(height: 2),
                Text('You\'ll receive a sound alert when a new ride comes in', style: TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kycBanner(BuildContext context, KycStatus status) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: PartnerTheme.warningAmber, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text('KYC: ${status.displayName}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.warningAmber))),
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerKycStatus),
            child: const Text('Update', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PartnerTheme.primary)),
          ),
        ],
      ),
    );
  }

  Widget _quickAction(BuildContext context, IconData icon, String label, String route) {
    return Expanded(
      child: GestureDetector(
        onTap: () => Navigator.pushNamed(context, route),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: PartnerTheme.cardDecoration(),
          child: Column(
            children: [
              Icon(icon, size: 24, color: PartnerTheme.primary),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: PartnerTheme.cardDecoration(),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
                  Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recentTrip(String name, String route, String fare, String rating, String payment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: PartnerTheme.cardDecoration(),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: PartnerTheme.taxiColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.directions_car, size: 22, color: PartnerTheme.taxiColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(route, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(fare, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              Row(children: [const Icon(Icons.star, size: 12, color: Colors.amber), const SizedBox(width: 2), Text(rating, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted))]),
            ],
          ),
        ],
      ),
    );
  }
}
