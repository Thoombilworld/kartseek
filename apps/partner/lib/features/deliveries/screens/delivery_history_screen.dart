import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/delivery_model.dart';

/// Delivery History Screen — Lists all past deliveries from PartnerBloc state.
class DeliveryHistoryScreen extends StatelessWidget {
  const DeliveryHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final deliveries = state.deliveryHistory;

        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Delivery History'), leading: const BackButton(color: PartnerTheme.textPrimary)),
          body: deliveries.isEmpty
              ? const Center(child: Text('No deliveries yet', style: TextStyle(color: PartnerTheme.textMuted, fontSize: 15)))
              : ListView.separated(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  itemCount: deliveries.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => _deliveryCard(deliveries[i]),
                ),
        );
      },
    );
  }

  Widget _deliveryCard(DeliveryTask delivery) {
    final isDelivered = delivery.status == DeliveryStatus.delivered || delivery.status == DeliveryStatus.paymentCollected;
    final isFailed = delivery.status == DeliveryStatus.failedDelivery;
    final statusLabel = isDelivered ? 'Delivered' : isFailed ? 'Failed' : delivery.status.displayName;
    final statusColor = isDelivered ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed;
    final fmt = NumberFormat('#,###');
    final dateFmt = DateFormat('dd MMM, hh:mm a');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(delivery.id, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PartnerTheme.textMuted)),
          const SizedBox(width: 8),
          if (delivery.orderType != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: PartnerTheme.deliveryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
              child: Text(delivery.orderType!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: PartnerTheme.deliveryColor)),
            ),
          if (delivery.deliveredAt != null) ...[
            const SizedBox(width: 8),
            Text(dateFmt.format(delivery.deliveredAt!), style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
          ],
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
            child: Text(statusLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor)),
          ),
        ]),
        const SizedBox(height: 8),
        Text(delivery.customerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text('${delivery.sellerName} → ${delivery.dropAddress.split(',').first}', style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted)),
        const SizedBox(height: 10),
        Row(children: [
          Text('${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(delivery.deliveryFee)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const Spacer(),
          if (isDelivered && delivery.rating != null) ...[
            const Icon(Icons.star, size: 14, color: Colors.amber),
            const SizedBox(width: 2),
            Text(delivery.rating!.toStringAsFixed(1), style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
          ],
          const SizedBox(width: 10),
          Text(delivery.isCod ? 'COD' : 'Online', style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
        ]),
      ]),
    );
  }
}
