import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Settings — Business settings, notifications, policies, and account preferences.
class MarketplaceSettingsScreen extends StatefulWidget {
  const MarketplaceSettingsScreen({super.key});

  @override
  State<MarketplaceSettingsScreen> createState() => _MarketplaceSettingsScreenState();
}

class _MarketplaceSettingsScreenState extends State<MarketplaceSettingsScreen> {
  static const _mp = Color(0xFF6C3FC8);

  bool _orderNotifications = true;
  bool _lowStockAlerts = true;
  bool _reviewNotifications = true;
  bool _promotionalEmails = false;
  bool _autoAcceptOrders = false;
  bool _autoFulfillment = false;
  bool _vacationMode = false;
  String _fulfillmentMode = 'manual';

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp, foregroundColor: Colors.white, elevation: 0,
        title: Text('Settings · ${ss.country.flag}', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Business Info
                _section('Business Information', Icons.business, [
                  _infoRow('Legal Name', 'Gulf Tech & Fashion Trading LLC'),
                  _infoRow('Trade License', 'TL-2024-QA-78432'),
                  _infoRow('Tax Registration', 'TRN-QA-9876543210'),
                  _infoRow('Business Address', 'Office 502, Tower 3, The Pearl, Doha, Qatar'),
                  const SizedBox(height: 8),
                  SizedBox(width: double.infinity, child: OutlinedButton(
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Business info editor opened'), duration: Duration(seconds: 2))),
                    style: OutlinedButton.styleFrom(foregroundColor: _mp, side: const BorderSide(color: _mp),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: const Text('Edit Business Info'),
                  )),
                ]),
                const SizedBox(height: 16),

                // Notifications
                _section('Notifications', Icons.notifications_active, [
                  _switch('New Order Alerts', 'Push notification for every new order', _orderNotifications, (v) => setState(() => _orderNotifications = v)),
                  _switch('Low Stock Alerts', 'Alert when products drop below threshold', _lowStockAlerts, (v) => setState(() => _lowStockAlerts = v)),
                  _switch('Review Notifications', 'Notify when customers leave reviews', _reviewNotifications, (v) => setState(() => _reviewNotifications = v)),
                  _switch('Promotional Emails', 'Receive marketplace promotion opportunities', _promotionalEmails, (v) => setState(() => _promotionalEmails = v)),
                ]),
                const SizedBox(height: 16),

                // Order Processing
                _section('Order Processing', Icons.shopping_bag, [
                  _switch('Auto-Accept Orders', 'Automatically accept incoming orders', _autoAcceptOrders, (v) => setState(() => _autoAcceptOrders = v)),
                  _switch('Auto-Fulfillment', 'Use automated fulfillment pipeline', _autoFulfillment, (v) => setState(() => _autoFulfillment = v)),
                  const Divider(height: 24),
                  const Text('Fulfillment Mode', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  ...['manual', 'semi-auto', 'fully-auto'].map((mode) => ListTile(
                    leading: Radio<String>(
                      value: mode,
                      // ignore: deprecated_member_use
                      groupValue: _fulfillmentMode,
                      // ignore: deprecated_member_use
                      onChanged: (v) => setState(() => _fulfillmentMode = v!),
                      activeColor: _mp,
                    ),
                    title: Text(mode == 'manual' ? 'Manual' : mode == 'semi-auto' ? 'Semi-Automated' : 'Fully Automated',
                      style: const TextStyle(fontSize: 14)),
                    subtitle: Text(
                      mode == 'manual' ? 'You manually process each order step' :
                      mode == 'semi-auto' ? 'Auto-accept, manual packing & shipping' :
                      'Full automation with integrated logistics',
                      style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    onTap: () => setState(() => _fulfillmentMode = mode),
                  )),
                ]),
                const SizedBox(height: 16),

                // Vacation Mode
                _section('Vacation Mode', Icons.beach_access, [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _vacationMode ? SellerTheme.warningAmber.withValues(alpha: 0.08) : SellerTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _vacationMode ? SellerTheme.warningAmber.withValues(alpha: 0.3) : SellerTheme.border),
                    ),
                    child: Row(children: [
                      Icon(_vacationMode ? Icons.beach_access : Icons.store, color: _vacationMode ? SellerTheme.warningAmber : _mp, size: 24),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_vacationMode ? 'Store is on vacation' : 'Store is active',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _vacationMode ? SellerTheme.warningAmber : SellerTheme.successGreen)),
                        Text(_vacationMode ? 'Your store is hidden from customers' : 'Products are visible and orders are being accepted',
                          style: const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
                      ])),
                      Switch.adaptive(value: _vacationMode, onChanged: (v) => setState(() => _vacationMode = v), activeTrackColor: SellerTheme.warningAmber),
                    ]),
                  ),
                ]),
                const SizedBox(height: 16),

                // Danger zone
                _section('Danger Zone', Icons.warning, [
                  SizedBox(width: double.infinity, child: OutlinedButton(
                    onPressed: () {
                      showDialog(context: context, builder: (_) => AlertDialog(
                        title: const Text('Deactivate Store?'),
                        content: const Text('Your store will be hidden from customers. You can reactivate it anytime from Settings.'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                          TextButton(onPressed: () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Store deactivation requested'))); },
                            child: const Text('Deactivate', style: TextStyle(color: Colors.red))),
                        ],
                      ));
                    },
                    style: OutlinedButton.styleFrom(foregroundColor: SellerTheme.errorRed, side: const BorderSide(color: SellerTheme.errorRed),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: const Text('Deactivate Store'),
                  )),
                ]),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _section(String title, IconData icon, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: _mp, size: 20),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 14),
        ...children,
      ]),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 110, child: Text(label, style: const TextStyle(fontSize: 13, color: SellerTheme.textMuted))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
      ]),
    );
  }

  Widget _switch(String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          Text(subtitle, style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
        ])),
        Switch.adaptive(value: value, onChanged: onChanged, activeTrackColor: _mp),
      ]),
    );
  }
}
