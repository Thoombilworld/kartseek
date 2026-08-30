import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_event.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Partner Profile Screen — Displays partner details from PartnerBloc state.
///
/// Reads [PartnerProfile] from BLoC rather than hardcoded values.
/// Dispatches [LoadPartnerProfile] on init if not already loaded.
class PartnerProfileScreen extends StatelessWidget {
  const PartnerProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Ensure profile is loaded
    final bloc = context.read<PartnerBloc>();
    if (bloc.state.profile.id == 'partner_001' && bloc.state.profile.name == 'Partner') {
      bloc.add(const LoadPartnerProfile());
    }

    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final profile = state.profile;
        final isTaxi = state.isTaxiMode;
        final totalJobs = isTaxi ? profile.totalTrips : profile.totalDeliveries;
        final jobLabel = isTaxi ? 'trips' : 'deliveries';

        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(
            backgroundColor: Colors.white, elevation: 0,
            title: const Text('Profile'),
            leading: const BackButton(color: PartnerTheme.textPrimary),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit_outlined, size: 20),
                onPressed: () => Navigator.pushNamed(context, PartnerRouter.partnerEditProfile),
              ),
            ],
          ),
          body: state.isLoading
              ? const Center(child: CircularProgressIndicator(color: PartnerTheme.primary))
              : SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // Avatar & Info
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: PartnerTheme.cardDecoration(),
                        child: Column(children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundColor: PartnerTheme.primaryLight,
                            backgroundImage: profile.profilePhoto != null
                                ? NetworkImage(profile.profilePhoto!)
                                : null,
                            child: profile.profilePhoto == null
                                ? Text(
                                    profile.name.isNotEmpty ? profile.name[0].toUpperCase() : 'P',
                                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: PartnerTheme.primary),
                                  )
                                : null,
                          ),
                          const SizedBox(height: 12),
                          Text(profile.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 4),
                          Text(profile.role.displayName, style: const TextStyle(fontSize: 14, color: PartnerTheme.textMuted)),
                          const SizedBox(height: 8),
                          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            const Icon(Icons.star, size: 18, color: Colors.amber),
                            const SizedBox(width: 4),
                            Text(profile.rating.toStringAsFixed(1), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            const SizedBox(width: 16),
                            Container(width: 1, height: 16, color: PartnerTheme.border),
                            const SizedBox(width: 16),
                            Text('${NumberFormat('#,###').format(totalJobs)} $jobLabel', style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted)),
                          ]),
                          const SizedBox(height: 12),
                          _kycBadge(profile.kycStatus),
                        ]),
                      ),
                      const SizedBox(height: 16),
                      // Details
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: PartnerTheme.cardDecoration(),
                        child: Column(children: [
                          _infoRow(Icons.phone, 'Phone', profile.mobile),
                          _infoRow(Icons.email, 'Email', profile.email),
                          _infoRow(Icons.location_on, 'Address', profile.address),
                          if (profile.emergencyContact != null)
                            _infoRow(Icons.contacts, 'Emergency', profile.emergencyContact!),
                          _infoRow(Icons.calendar_today, 'Joined', DateFormat.yMMMd().format(profile.joinedDate)),
                        ]),
                      ),
                      const SizedBox(height: 16),
                      // Actions
                      _menuItem(context, Icons.description_outlined, 'Documents & KYC', PartnerRouter.partnerDocuments),
                      _menuItem(context, Icons.directions_car, 'Vehicle Details', PartnerRouter.partnerVehicleDetails),
                      _menuItem(context, Icons.account_balance, 'Bank Details', PartnerRouter.partnerBankDetails),
                      _menuItem(context, Icons.star_outline, 'My Ratings', PartnerRouter.partnerRating),
                      _menuItem(context, Icons.headset_mic, 'Support', PartnerRouter.partnerSupport),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _kycBadge(KycStatus status) {
    final isApproved = status == KycStatus.approved;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: (isApproved ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isApproved ? 'KYC Approved ✓' : 'KYC: ${status.displayName}',
        style: TextStyle(
          fontSize: 12, fontWeight: FontWeight.w700,
          color: isApproved ? PartnerTheme.onlineGreen : PartnerTheme.warningAmber,
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      Icon(icon, size: 18, color: PartnerTheme.textMuted),
      const SizedBox(width: 12),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ]),
    ]),
  );

  Widget _menuItem(BuildContext context, IconData icon, String label, String route) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    child: ListTile(
      leading: Icon(icon, size: 22, color: PartnerTheme.textSecondary),
      title: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      trailing: const Icon(Icons.chevron_right, size: 20, color: PartnerTheme.textMuted),
      onTap: () => Navigator.pushNamed(context, route),
      tileColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
