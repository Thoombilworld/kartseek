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
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Delivery Boy Dashboard — Main hub for delivery partners.
///
/// Displays role-specific data: delivery history, earnings from deliveries,
/// active delivery card, and recent deliveries. Includes the [RoleSwitcherWidget]
/// for dual-role partners to seamlessly switch to Taxi Driver mode.
class DeliveryDashboardScreen extends StatefulWidget {
  const DeliveryDashboardScreen({super.key});
  @override
  State<DeliveryDashboardScreen> createState() => _DeliveryDashboardScreenState();
}

class _DeliveryDashboardScreenState extends State<DeliveryDashboardScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final profile = state.profile;
        final isOnline = state.isOnline;
        final earnings = state.earnings;
        final deliveryHistory = state.deliveryHistory;
        final currency = RegionService.instance.currentCountry.currencySymbol;

        return Scaffold(
          key: _scaffoldKey,
          backgroundColor: PartnerTheme.surface,
          drawer: PartnerDrawerMenu(
            partnerName: profile.name,
            partnerRole: 'Delivery Boy',
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
                  Row(children: [
                    GestureDetector(
                      onTap: () => _scaffoldKey.currentState?.openDrawer(),
                      child: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: PartnerTheme.border)),
                        child: const Icon(Icons.menu, size: 22),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Hi, ${profile.name.split(' ').first} 📦', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
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
                              'Delivery Boy${isOnline ? ' • Online' : ' • Offline'}',
                              style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted),
                            ),
                          ],
                        ),
                      ],
                    )),
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerNotifications),
                      child: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: PartnerTheme.border)),
                        child: Stack(children: [
                          const Center(child: Icon(Icons.notifications_outlined, size: 22)),
                          Positioned(top: 8, right: 8, child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: PartnerTheme.offlineRed, shape: BoxShape.circle))),
                        ]),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 16),

                  // ── Role Switcher (only for dual-role) ──────────────────
                  const RoleSwitcherWidget(),

                  // ── Online Switch ───────────────────────────────────────
                  Center(child: OnlineStatusSwitch(
                    isOnline: isOnline,
                    kycApproved: profile.kycApproved,
                    onToggle: () => context.read<PartnerBloc>().add(const ToggleOnlineStatus()),
                  )),
                  const SizedBox(height: 20),

                  // ── Earnings Card ───────────────────────────────────────
                  EarningsSummaryCard(
                    todayEarnings: earnings.todayEarnings,
                    completedJobs: earnings.completedDeliveries,
                    onlineHours: earnings.onlineHours,
                    rating: profile.rating,
                  ),
                  const SizedBox(height: 20),

                  // ── KYC Banner ──────────────────────────────────────────
                  if (profile.kycStatus != KycStatus.approved)
                    _kycBanner(context, profile.kycStatus),

                  // ── Active Delivery Card (only when a real delivery is active) ──
                  if (state.activeDelivery != null) ...[
                    ActiveJobCard(
                      jobId: state.activeDelivery!.id,
                      jobType: 'delivery',
                      customerName: state.activeDelivery!.customerName,
                      status: 'out_for_delivery',
                      pickupAddress: state.activeDelivery!.pickupAddress,
                      dropAddress: state.activeDelivery!.dropAddress,
                      amount: '$currency ${state.activeDelivery!.orderAmount.toStringAsFixed(0)}${state.activeDelivery!.isCod ? ' (COD)' : ''}',
                      onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerActiveDelivery),
                    ),
                  ],
                  const SizedBox(height: 20),

                  // ── Waiting indicator when online ────────────────────────
                  if (isOnline && state.activeDelivery == null)
                    _waitingForDeliveriesCard(),

                  // ── Quick Actions ───────────────────────────────────────
                  const Text('Quick Actions', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(children: [
                    _quickAction(context, Icons.history, 'History', PartnerRouter.partnerDeliveryHistory),
                    const SizedBox(width: 10),
                    _quickAction(context, Icons.account_balance_wallet, 'Earnings', PartnerRouter.partnerEarnings),
                    const SizedBox(width: 10),
                    _quickAction(context, Icons.wallet, 'Wallet', PartnerRouter.partnerWallet),
                    const SizedBox(width: 10),
                    _quickAction(context, Icons.receipt_long, 'Ledger', PartnerRouter.partnerLedger),
                  ]),
                  const SizedBox(height: 8),
                  Row(children: [
                    _quickAction(context, Icons.undo, 'Return\nPickup', PartnerRouter.partnerReturnPickup, color: PartnerTheme.warningAmber),
                    const SizedBox(width: 10),
                    _quickAction(context, Icons.description, 'Documents', PartnerRouter.partnerDocuments),
                    const SizedBox(width: 10),
                    _quickAction(context, Icons.headset_mic, 'Support', PartnerRouter.partnerSupport),
                    const SizedBox(width: 10),
                    _quickAction(context, Icons.star, 'Rating', PartnerRouter.partnerRating),
                  ]),
                  const SizedBox(height: 20),

                  // ── Stats ───────────────────────────────────────────────
                  const Text("Today's Summary", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(children: [
                    _statCard('Deliveries', '${earnings.completedDeliveries}', Icons.check_circle, PartnerTheme.onlineGreen),
                    const SizedBox(width: 10),
                    _statCard('COD', '$currency ${earnings.cashCollected.toStringAsFixed(0)}', Icons.payments, PartnerTheme.warningAmber),
                  ]),
                  const SizedBox(height: 10),
                  Row(children: [
                    _statCard('Pending', '$currency ${earnings.pendingPayout.toStringAsFixed(0)}', Icons.schedule, PartnerTheme.infoBlue),
                    const SizedBox(width: 10),
                    _statCard('Incentive', '$currency ${earnings.incentives.toStringAsFixed(0)}', Icons.card_giftcard, PartnerTheme.deliveryColor),
                  ]),
                  const SizedBox(height: 20),

                  // ── Recent Deliveries (from delivery history) ────────────
                  Row(children: [
                    const Text('Recent Deliveries', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerDeliveryHistory),
                      child: const Text('View All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.primary)),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  // Show real delivery history data
                  ...deliveryHistory.take(3).map((delivery) => _recentDelivery(
                    delivery.customerName,
                    '${delivery.sellerName} → ${delivery.dropAddress.split(',').first}',
                    '$currency ${delivery.deliveryFee.toStringAsFixed(0)}',
                    delivery.rating?.toStringAsFixed(1) ?? '—',
                    delivery.orderType ?? 'Package',
                  )),
                  if (deliveryHistory.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: PartnerTheme.cardDecoration(),
                      child: const Center(
                        child: Text('No delivery history yet', style: TextStyle(color: PartnerTheme.textMuted)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          // ── Bottom Nav ──────────────────────────────────────────────────
          bottomNavigationBar: DecoratedBox(
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -2))]),
            child: BottomNavigationBar(
              currentIndex: 0, type: BottomNavigationBarType.fixed,
              selectedItemColor: PartnerTheme.deliveryColor, unselectedItemColor: PartnerTheme.textMuted,
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
                  case 1: Navigator.pushNamed(context, PartnerRouter.partnerDeliveryHistory); break;
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

  Widget _waitingForDeliveriesCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [PartnerTheme.deliveryColor.withValues(alpha: 0.08), PartnerTheme.deliveryColor.withValues(alpha: 0.02)],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: PartnerTheme.deliveryColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 22, height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation(PartnerTheme.deliveryColor.withValues(alpha: 0.6)),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Waiting for delivery tasks…', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PartnerTheme.textPrimary)),
                SizedBox(height: 2),
                Text('You\'ll receive a sound alert when a seller has a delivery ready', style: TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kycBanner(BuildContext context, KycStatus status) => Container(
    margin: const EdgeInsets.only(bottom: 16), padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFED7AA))),
    child: Row(children: [
      const Icon(Icons.warning_amber_rounded, color: PartnerTheme.warningAmber, size: 20), const SizedBox(width: 10),
      Expanded(child: Text('KYC: ${status.displayName}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.warningAmber))),
      GestureDetector(onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerKycStatus), child: const Text('Update', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PartnerTheme.primary))),
    ]),
  );

  Widget _quickAction(BuildContext context, IconData icon, String label, String route, {Color? color}) => Expanded(
    child: GestureDetector(onTap: () => Navigator.pushNamed(context, route),
      child: Container(padding: const EdgeInsets.symmetric(vertical: 14), decoration: PartnerTheme.cardDecoration(),
        child: Column(children: [Icon(icon, size: 24, color: color ?? PartnerTheme.deliveryColor), const SizedBox(height: 6), Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary), textAlign: TextAlign.center)]))),
  );

  Widget _statCard(String label, String value, IconData icon, Color color) => Expanded(
    child: Container(padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
      child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 20, color: color)),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)), Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700))])),
      ])),
  );

  Widget _recentDelivery(String name, String route, String fee, String rating, String type) => Container(
    margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
    child: Row(children: [
      Container(width: 44, height: 44, decoration: BoxDecoration(color: PartnerTheme.deliveryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.local_shipping, size: 22, color: PartnerTheme.deliveryColor)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), const SizedBox(height: 2), Text('$route • $type', style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted))])),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text(fee, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)), Row(children: [const Icon(Icons.star, size: 12, color: Colors.amber), const SizedBox(width: 2), Text(rating, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted))])]),
    ]),
  );
}
