import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:photo_view/photo_view.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_event.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Prescription Review Screen
///
/// Features:
/// • Pinch-to-zoom prescription image (PhotoView)
/// • Doctor & hospital name
/// • Listed medicines on the prescription
/// • Verify / Request Info / Reject with predefined reasons
/// • Status chips with color coding
class PharmacyPrescriptionReviewScreen extends StatelessWidget {
  const PharmacyPrescriptionReviewScreen({super.key});

  static const _pharma = Color(0xFF3B82F6);

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<PharmacySellerBloc, PharmacySellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (_, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: (state.actionSuccess ?? true)
                ? SellerTheme.successGreen
                : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      builder: (context, state) {
        final pending =
            state.prescriptions.where((p) => p.status == 'pending').toList();

        return Scaffold(
          backgroundColor: SellerTheme.surface,
          appBar: AppBar(
            backgroundColor: _pharma,
            foregroundColor: Colors.white,
            elevation: 0,
            title: Row(children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Prescriptions',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(width: 10),
              if (pending.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('${pending.length} pending',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                ),
            ]),
            actions: [
              if (pending.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(right: 14),
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        // Verify all pending with one tap
                        for (final rx in pending) {
                          context
                              .read<PharmacySellerBloc>()
                              .add(VerifyPrescription(rx.id));
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.4)),
                        ),
                        child: const Text('Verify All',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          body: state.status == PharmacyBlocStatus.loading
              ? const Center(child: CircularProgressIndicator(color: _pharma))
              : state.prescriptions.isEmpty
                  ? const Center(
                      child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                          Icon(Icons.description_outlined,
                              size: 64, color: SellerTheme.textMuted),
                          SizedBox(height: 16),
                          Text('No prescriptions to review',
                              style: TextStyle(
                                  color: SellerTheme.textSecondary,
                                  fontSize: 14)),
                          SizedBox(height: 6),
                          Text('New Rx prescriptions will appear here',
                              style: TextStyle(
                                  color: SellerTheme.textMuted, fontSize: 12)),
                        ]))
                  : Column(children: [
                      _buildSummaryBar(state),
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.all(14),
                          itemCount: state.prescriptions.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 14),
                          itemBuilder: (context, i) => _PrescriptionCard(
                            rx: state.prescriptions[i],
                            pharmaColor: _pharma,
                          ),
                        ),
                      ),
                    ]),
        );
      },
    );
  }

  Widget _buildSummaryBar(PharmacySellerState state) {
    final counts = {
      'pending':     state.prescriptions.where((p) => p.status == 'pending').length,
      'verified':    state.prescriptions.where((p) => p.status == 'verified').length,
      'rejected':    state.prescriptions.where((p) => p.status == 'rejected').length,
      'info_needed': state.prescriptions.where((p) => p.status == 'info_needed').length,
    };
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(children: [
        _summaryPill('⏳ ${counts['pending']} Pending',   SellerTheme.warningAmber),
        const SizedBox(width: 8),
        _summaryPill('✅ ${counts['verified']} Verified', SellerTheme.successGreen),
        const SizedBox(width: 8),
        _summaryPill('❌ ${counts['rejected']} Rejected', SellerTheme.errorRed),
        if ((counts['info_needed'] ?? 0) > 0) ...[
          const SizedBox(width: 8),
          _summaryPill('💬 ${counts['info_needed']} Info', SellerTheme.infoBlue),
        ],
      ]),
    );
  }

  Widget _summaryPill(String label, Color color) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: color)),
        ),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Card Widget
// ─────────────────────────────────────────────────────────────────────────────

class _PrescriptionCard extends StatefulWidget {
  final PrescriptionModel rx;
  final Color pharmaColor;

  const _PrescriptionCard({required this.rx, required this.pharmaColor});

  @override
  State<_PrescriptionCard> createState() => _PrescriptionCardState();
}

class _PrescriptionCardState extends State<_PrescriptionCard> {
  bool _expanded = false;

  PrescriptionModel get rx => widget.rx;

  Color get _statusColor {
    return switch (rx.status) {
      'verified'    => SellerTheme.successGreen,
      'rejected'    => SellerTheme.errorRed,
      'info_needed' => SellerTheme.infoBlue,
      _             => SellerTheme.warningAmber,
    };
  }

  String get _statusLabel {
    return switch (rx.status) {
      'verified'    => '✅ VERIFIED',
      'rejected'    => '❌ REJECTED',
      'info_needed' => '💬 INFO NEEDED',
      _             => '⏳ PENDING',
    };
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SellerTheme.border),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Image ──────────────────────────────────────────────────────────
        GestureDetector(
          onTap: () => _openZoom(context, rx.imageUrl),
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: AspectRatio(
              aspectRatio: 16 / 7,
              child: Stack(children: [
                Image.network(
                  rx.imageUrl,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(0xFFF0F4FF),
                    child: const Center(
                        child: Icon(Icons.document_scanner_outlined,
                            size: 52, color: Color(0xFF3B82F6))),
                  ),
                ),
                Positioned(
                  top: 10, right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(8)),
                    child: const Row(children: [
                      Icon(Icons.zoom_in, color: Colors.white, size: 13),
                      SizedBox(width: 4),
                      Text('Zoom', style: TextStyle(color: Colors.white, fontSize: 10)),
                    ]),
                  ),
                ),
                Positioned(
                  top: 10, left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statusColor.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_statusLabel,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
            ),
          ),
        ),

        // ── Details ─────────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Rx #${rx.id}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15)),
              Text(_elapsed(rx.uploadedAt),
                  style: const TextStyle(
                      color: SellerTheme.textMuted, fontSize: 11)),
            ]),
            const SizedBox(height: 6),
            _infoRow(Icons.person_outline, 'Patient', rx.customerName),
            _infoRow(Icons.phone_outlined, 'Phone', rx.customerPhone),
            _infoRow(Icons.medical_services_outlined, 'Doctor', rx.doctorName),
            _infoRow(Icons.receipt_long_outlined, 'Order', rx.orderId),

            // Medicines list
            if (rx.medicines.isNotEmpty) ...[
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => setState(() => _expanded = !_expanded),
                child: Row(children: [
                  const Text('💊',
                      style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 6),
                  Text('${rx.medicines.length} medicine${rx.medicines.length != 1 ? 's' : ''} prescribed',
                      style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                          color: SellerTheme.textPrimary)),
                  const Spacer(),
                  Icon(_expanded
                      ? Icons.keyboard_arrow_up
                      : Icons.keyboard_arrow_down,
                      size: 18, color: SellerTheme.textMuted),
                ]),
              ),
              if (_expanded) ...[
                const SizedBox(height: 8),
                ...rx.medicines.map((m) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(children: [
                    Container(
                      width: 6, height: 6,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        color: widget.pharmaColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Expanded(child: Text(m,
                        style: const TextStyle(fontSize: 12, color: SellerTheme.textPrimary))),
                  ]),
                )),
              ],
            ],

            // Rejection reason / info request
            if (rx.rejectionReason != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: SellerTheme.errorRed.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: SellerTheme.errorRed.withValues(alpha: 0.2)),
                ),
                child: Row(children: [
                  const Icon(Icons.info_outline,
                      size: 14, color: SellerTheme.errorRed),
                  const SizedBox(width: 6),
                  Expanded(child: Text('Reason: ${rx.rejectionReason}',
                      style: const TextStyle(
                          color: SellerTheme.errorRed, fontSize: 12))),
                ]),
              ),
            ],
            if (rx.additionalInfo != null && rx.status == 'info_needed') ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: SellerTheme.infoBlue.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: SellerTheme.infoBlue.withValues(alpha: 0.2)),
                ),
                child: Row(children: [
                  const Icon(Icons.chat_bubble_outline,
                      size: 14, color: SellerTheme.infoBlue),
                  const SizedBox(width: 6),
                  Expanded(child: Text('Requested: ${rx.additionalInfo}',
                      style: const TextStyle(
                          color: SellerTheme.infoBlue, fontSize: 12))),
                ]),
              ),
            ],

            // ── Actions for pending prescriptions ────────────────────────────
            if (rx.status == 'pending') ...[
              const SizedBox(height: 14),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showRejectDialog(context),
                    icon: const Icon(Icons.close, size: 14, color: SellerTheme.errorRed),
                    label: const Text('Reject',
                        style: TextStyle(color: SellerTheme.errorRed, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                          color: SellerTheme.errorRed.withValues(alpha: 0.4)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showInfoRequestDialog(context),
                    icon: const Icon(Icons.chat_bubble_outline, size: 14, color: SellerTheme.infoBlue),
                    label: const Text('Info?',
                        style: TextStyle(color: SellerTheme.infoBlue, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                          color: SellerTheme.infoBlue.withValues(alpha: 0.4)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: () => context
                        .read<PharmacySellerBloc>()
                        .add(VerifyPrescription(rx.id)),
                    icon: const Icon(Icons.check, size: 14),
                    label: const Text('Verify Rx',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SellerTheme.successGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      elevation: 0,
                    ),
                  ),
                ),
              ]),
            ],
          ]),
        ),
      ]),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Icon(icon, size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 8),
          Text('$label: ',
              style: const TextStyle(
                  color: SellerTheme.textSecondary, fontSize: 11)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 11,
                      color: SellerTheme.textPrimary),
                  overflow: TextOverflow.ellipsis)),
        ]),
      );

  void _openZoom(BuildContext context, String imageUrl) {
    Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => Scaffold(
            backgroundColor: Colors.black,
            appBar: AppBar(
              backgroundColor: Colors.black,
              iconTheme: const IconThemeData(color: Colors.white),
              title: const Text('Prescription Image',
                  style: TextStyle(color: Colors.white)),
            ),
            body: PhotoView(imageProvider: NetworkImage(imageUrl)),
          ),
        ));
  }

  void _showRejectDialog(BuildContext context) {
    const reasons = [
      'Prescription is expired',
      'Image is not legible / unclear',
      'Prescription not from a licensed doctor',
      'Medicine not available in stock',
      'Patient information mismatch',
    ];
    int selected = 0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Reject Prescription',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Rx #${rx.id} · ${rx.customerName}',
                style: const TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
            const SizedBox(height: 14),
            RadioGroup<int>(
              groupValue: selected,
              onChanged: (v) => setS(() => selected = v ?? 0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: reasons.asMap().entries.map((e) => RadioListTile<int>(
                  dense: true, contentPadding: EdgeInsets.zero,
                  title: Text(e.value, style: const TextStyle(fontSize: 13)),
                  value: e.key,
                  activeColor: SellerTheme.errorRed,
                )).toList(),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: SellerTheme.errorRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                onPressed: () {
                  context.read<PharmacySellerBloc>().add(
                      RejectPrescription(rx.id, reasons[selected]));
                  Navigator.pop(ctx);
                },
                child: const Text('Confirm Rejection',
                    style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  void _showInfoRequestDialog(BuildContext context) {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Request More Information',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('A message will be sent to ${rx.customerName}',
              style: const TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
          const SizedBox(height: 14),
          TextField(
            controller: ctrl,
            maxLines: 3,
            decoration: InputDecoration(
              hintText:
                  'e.g. Please upload a clearer photo of the prescription...',
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              filled: true,
              fillColor: SellerTheme.surface,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity, height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.infoBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: () {
                final q = ctrl.text.trim();
                if (q.isEmpty) return;
                context.read<PharmacySellerBloc>().add(
                    RequestMoreInfoForPrescription(rx.id, q));
                Navigator.pop(ctx);
              },
              child: const Text('Send Request',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }

  String _elapsed(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
