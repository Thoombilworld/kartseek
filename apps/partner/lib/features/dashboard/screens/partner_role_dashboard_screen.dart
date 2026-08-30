import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_event.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/features/dashboard/screens/driver_dashboard_screen.dart';
import 'package:kartseek_partner/features/dashboard/screens/delivery_dashboard_screen.dart';
import 'package:kartseek_partner/features/shared/widgets/incoming_request_overlay.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Role-based Dashboard Router — Shows correct dashboard based on partner role.
///
/// For dual-role partners (PartnerRole.both), the role selection screen is shown
/// on first login. Once a role is selected, the appropriate dashboard is rendered
/// with a floating action button to switch roles.
///
/// Listens for incoming ride/delivery requests via BLoC state changes and
/// triggers the [IncomingRequestOverlay] pop-up with sound alerts.
class PartnerRoleDashboardScreen extends StatefulWidget {
  const PartnerRoleDashboardScreen({super.key});

  @override
  State<PartnerRoleDashboardScreen> createState() => _PartnerRoleDashboardScreenState();
}

class _PartnerRoleDashboardScreenState extends State<PartnerRoleDashboardScreen> {
  bool _isShowingOverlay = false;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<PartnerBloc, PartnerState>(
      listenWhen: (prev, curr) =>
          prev.pendingRideRequest != curr.pendingRideRequest ||
          prev.pendingDeliveryTask != curr.pendingDeliveryTask,
      listener: (context, state) {
        // Show incoming ride request overlay
        if (state.pendingRideRequest != null && !_isShowingOverlay) {
          _showRideOverlay(context, state);
        }
        // Show incoming delivery request overlay
        if (state.pendingDeliveryTask != null && !_isShowingOverlay) {
          _showDeliveryOverlay(context, state);
        }
      },
      builder: (context, state) {
        final profile = state.profile;
        final activeRole = state.activeRole;

        // Single role — immediately show the right dashboard
        if (profile.role == PartnerRole.deliveryBoy) {
          return const DeliveryDashboardScreen();
        } else if (profile.role == PartnerRole.taxiDriver) {
          return const DriverDashboardScreen();
        }

        // For multi-role partners, require explicit selection upon login
        if (activeRole == null || activeRole == PartnerRole.both) {
          return _buildRoleSelectionScreen(context);
        }

        // Role selected — show appropriate dashboard with a role-switch FAB
        return Scaffold(
          body: activeRole == PartnerRole.taxiDriver
              ? const DriverDashboardScreen()
              : const DeliveryDashboardScreen(),
          floatingActionButton: _buildRoleSwitchFab(context, activeRole),
        );
      },
    );
  }

  /// Shows the incoming ride request overlay with sound + haptic alert.
  Future<void> _showRideOverlay(BuildContext context, PartnerState state) async {
    _isShowingOverlay = true;
    final ride = state.pendingRideRequest!;
    final bloc = context.read<PartnerBloc>();
    final navigator = Navigator.of(context);

    final accepted = await IncomingRequestOverlay.show(
      context,
      type: 'ride',
      customerName: ride.customerName,
      pickup: ride.pickupAddress,
      drop: ride.dropAddress,
      amount: ride.formattedFare,
      distance: ride.formattedDistance,
      paymentMethod: ride.paymentMethod,
    );

    if (mounted) {
      if (accepted) {
        bloc.add(AcceptRide(ride));
        navigator.pushNamed(PartnerRouter.partnerActiveTrip);
      } else {
        bloc.add(const DismissIncomingRequest());
      }
    }

    _isShowingOverlay = false;
  }

  /// Shows the incoming delivery task overlay with sound + haptic alert.
  Future<void> _showDeliveryOverlay(BuildContext context, PartnerState state) async {
    _isShowingOverlay = true;
    final delivery = state.pendingDeliveryTask!;
    final bloc = context.read<PartnerBloc>();
    final navigator = Navigator.of(context);

    final accepted = await IncomingRequestOverlay.show(
      context,
      type: 'delivery',
      customerName: delivery.customerName,
      pickup: delivery.pickupAddress,
      drop: delivery.dropAddress,
      amount: '${RegionService.instance.currentCountry.currencySymbol} ${delivery.deliveryFee.toStringAsFixed(0)}',
      distance: '${delivery.distance.toStringAsFixed(1)} km',
      storeName: delivery.sellerName,
      orderType: delivery.orderType,
      paymentMethod: delivery.isCod ? 'COD' : 'Prepaid',
    );

    if (mounted) {
      if (accepted) {
        bloc.add(AcceptDelivery(delivery));
        navigator.pushNamed(PartnerRouter.partnerActiveDelivery);
      } else {
        bloc.add(const DismissIncomingRequest());
      }
    }

    _isShowingOverlay = false;
  }

  Widget _buildRoleSelectionScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              const Text(
                'Select Your Duty',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: PartnerTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Choose the type of requests you want to receive for this session. '
                'Your incoming requests will be strictly limited to this role.',
                style: TextStyle(
                  fontSize: 14,
                  color: PartnerTheme.textMuted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 40),
              Expanded(
                child: GestureDetector(
                  onTap: () => context.read<PartnerBloc>().add(const SetActiveRole(PartnerRole.taxiDriver)),
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: PartnerTheme.taxiColor.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: PartnerTheme.taxiColor.withValues(alpha: 0.3), width: 2),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.local_taxi, size: 70, color: PartnerTheme.taxiColor),
                        SizedBox(height: 16),
                        Text('Taxi Driver', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: PartnerTheme.taxiColor)),
                        SizedBox(height: 8),
                        Text('Receive passenger ride requests', style: TextStyle(fontSize: 13, color: PartnerTheme.textSecondary)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: GestureDetector(
                  onTap: () => context.read<PartnerBloc>().add(const SetActiveRole(PartnerRole.deliveryBoy)),
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: PartnerTheme.deliveryColor.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: PartnerTheme.deliveryColor.withValues(alpha: 0.3), width: 2),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.local_shipping, size: 70, color: PartnerTheme.deliveryColor),
                        SizedBox(height: 16),
                        Text('Delivery Partner', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: PartnerTheme.deliveryColor)),
                        SizedBox(height: 8),
                        Text('Receive marketplace & food orders', style: TextStyle(fontSize: 13, color: PartnerTheme.textSecondary)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleSwitchFab(BuildContext context, PartnerRole activeRole) {
    final isTaxi = activeRole == PartnerRole.taxiDriver;
    return FloatingActionButton.extended(
      onPressed: () => context.read<PartnerBloc>().add(const SwitchRole()),
      backgroundColor: isTaxi ? PartnerTheme.deliveryColor : PartnerTheme.taxiColor,
      icon: Icon(
        isTaxi ? Icons.local_shipping : Icons.directions_car,
        color: Colors.white,
      ),
      label: Text(
        isTaxi ? 'Switch to Delivery' : 'Switch to Taxi',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      ),
    );
  }
}
