import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/ride_model.dart';

/// Trip History Screen — Lists all past taxi rides from PartnerBloc state.
class TripHistoryScreen extends StatelessWidget {
  const TripHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final rides = state.rideHistory;

        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Trip History'), leading: const BackButton(color: PartnerTheme.textPrimary)),
          body: rides.isEmpty
              ? const Center(child: Text('No trips yet', style: TextStyle(color: PartnerTheme.textMuted, fontSize: 15)))
              : ListView.separated(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  itemCount: rides.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => _tripCard(rides[i]),
                ),
        );
      },
    );
  }

  Widget _tripCard(RideRequest ride) {
    final isCompleted = ride.status == RideStatus.tripCompleted || ride.status == RideStatus.paymentCollected;
    final isCancelled = ride.status == RideStatus.cancelled;
    final statusLabel = isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : ride.status.displayName;
    final statusColor = isCompleted ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed;
    final dateFmt = DateFormat('dd MMM, hh:mm a');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Text(ride.id, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PartnerTheme.textMuted)),
            if (ride.completedAt != null) ...[
              const SizedBox(width: 8),
              Text(dateFmt.format(ride.completedAt!), style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
            ],
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
              child: Text(statusLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor)),
            ),
          ]),
          const SizedBox(height: 8),
          Text(ride.customerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('${ride.pickupAddress.split(',').first} → ${ride.dropAddress.split(',').first}', style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted)),
          const SizedBox(height: 10),
          Row(children: [
            Text(ride.formattedFare, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const Spacer(),
            if (isCompleted && ride.rating != null) ...[
              const Icon(Icons.star, size: 14, color: Colors.amber),
              const SizedBox(width: 2),
              Text(ride.rating!.toStringAsFixed(1), style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
            ],
            const SizedBox(width: 10),
            Text('${ride.paymentMethod} • ${ride.formattedDistance}', style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
          ]),
        ],
      ),
    );
  }
}
