import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_event.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class TaxiVendorDriverListScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const TaxiVendorDriverListScreen(
      {super.key, this.order, this.appointment, this.booking});

  @override
  State<TaxiVendorDriverListScreen> createState() =>
      _TaxiVendorDriverListScreenState();
}

class _TaxiVendorDriverListScreenState extends State<TaxiVendorDriverListScreen>
    with SingleTickerProviderStateMixin {
  static const _taxi = Color(0xFFF59E0B);
  late TabController _tabs;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    context.read<TaxiVendorBloc>().add(const LoadTaxiVendorDrivers());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return BlocListener<TaxiVendorBloc, TaxiVendorState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (ctx, s) {
        if (s.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(s.actionMessage!),
            backgroundColor: SellerTheme.successGreen,
            behavior: SnackBarBehavior.floating,
          ));
        }
      },
      child: Scaffold(
        backgroundColor: SellerTheme.surface,
        appBar: AppBar(
          backgroundColor: _taxi,
          foregroundColor: Colors.white,
          elevation: 0,
          title: Text('Drivers · ${ss.country.flag}',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => context
                  .read<TaxiVendorBloc>()
                  .add(const LoadTaxiVendorDrivers()),
            ),
            IconButton(
              icon: const Icon(Icons.person_add_outlined),
              onPressed: () =>
                  _addDriverDialog(context, ss.country.currencySymbol),
            ),
          ],
          bottom: TabBar(
            controller: _tabs,
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white60,
            tabs: const [
              Tab(text: 'All'),
              Tab(text: 'Online'),
              Tab(text: 'On Trip'),
              Tab(text: 'Offline'),
            ],
          ),
        ),
        body: BlocBuilder<TaxiVendorBloc, TaxiVendorState>(
          builder: (ctx, ts) {
            return Column(children: [
              // Search + stats
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(12),
                child: Column(children: [
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Search driver name or plate...',
                      prefixIcon: const Icon(Icons.search,
                          color: SellerTheme.textMuted),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      isDense: true,
                    ),
                    onChanged: (q) => setState(() => _search = q),
                  ),
                  const SizedBox(height: 10),
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _stat('${ts.onlineDrivers}', 'Online',
                            SellerTheme.successGreen),
                        _stat('${ts.onTripDrivers}', 'On Trip', _taxi),
                        _stat('${ts.offlineDrivers}', 'Offline',
                            SellerTheme.textMuted),
                        _stat(
                            '${ts.drivers.where((d) => d.status == DriverStatus.suspended).length}',
                            'Suspended',
                            SellerTheme.errorRed),
                      ]),
                ]),
              ),
              // Driver list by tab
              Expanded(
                child: ts.status == TaxiVendorBlocStatus.loading
                    ? const Center(
                        child: CircularProgressIndicator(color: _taxi))
                    : TabBarView(
                        controller: _tabs,
                        children: [
                          _driverList(ts.drivers, null),
                          _driverList(ts.drivers, DriverStatus.online),
                          _driverList(ts.drivers, DriverStatus.onTrip),
                          _driverList(ts.drivers, DriverStatus.offline),
                        ],
                      ),
              ),
            ]);
          },
        ),
      ),
    );
  }

  Widget _driverList(List<VendorDriverModel> all, DriverStatus? filterStatus) {
    var drivers = filterStatus == null
        ? all
        : all.where((d) => d.status == filterStatus).toList();
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      drivers = drivers
          .where((d) =>
              d.name.toLowerCase().contains(q) ||
              d.vehiclePlate.toLowerCase().contains(q))
          .toList();
    }
    if (drivers.isEmpty) {
      return const Center(
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('🚗', style: TextStyle(fontSize: 48)),
        SizedBox(height: 12),
        Text('No drivers found',
            style: TextStyle(color: SellerTheme.textMuted)),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: drivers.length,
      itemBuilder: (ctx, i) => _DriverCard(driver: drivers[i]),
    );
  }

  Widget _stat(String v, String l, Color c) => Column(children: [
        Text(v,
            style:
                TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: c)),
        Text(l,
            style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
      ]);

  void _addDriverDialog(BuildContext context, String cur) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final plateCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Add New Driver'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                  labelText: 'Full Name', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(
              controller: phoneCtrl,
              decoration: const InputDecoration(
                  labelText: 'Phone', border: OutlineInputBorder()),
              keyboardType: TextInputType.phone),
          const SizedBox(height: 10),
          TextField(
              controller: plateCtrl,
              decoration: const InputDecoration(
                  labelText: 'Vehicle Plate', border: OutlineInputBorder())),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: _taxi, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Add Driver'),
          ),
        ],
      ),
    );
  }
}

// ─── Driver card ──────────────────────────────────────────────────────────────

class _DriverCard extends StatelessWidget {
  final VendorDriverModel driver;
  const _DriverCard({required this.driver});

  static const _taxi = Color(0xFFF59E0B);

  @override
  Widget build(BuildContext context) {
    final bloc = context.read<TaxiVendorBloc>();

    final statusColor = switch (driver.status) {
      DriverStatus.online => SellerTheme.successGreen,
      DriverStatus.onTrip => _taxi,
      DriverStatus.offline => SellerTheme.textMuted,
      DriverStatus.suspended => SellerTheme.errorRed,
    };
    final statusLabel = switch (driver.status) {
      DriverStatus.online => '🟢 Online',
      DriverStatus.onTrip => '🚕 On Trip',
      DriverStatus.offline => '⚫ Offline',
      DriverStatus.suspended => '🔴 Suspended',
    };
    final vehicleIcon = switch (driver.vehicleType) {
      'SUV' => '🚙',
      'Sedan' => '🚗',
      _ => '🚕',
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: SellerTheme.elevatedCard(),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(children: [
          Row(children: [
            // Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _taxi.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: statusColor, width: 2),
              ),
              child: Center(
                  child: Text(driver.name.substring(0, 1),
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                          color: _taxi))),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(driver.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14)),
                  Text('${driver.phone} · $vehicleIcon ${driver.vehicleType}',
                      style: const TextStyle(
                          color: SellerTheme.textSecondary, fontSize: 12)),
                  Text(driver.vehiclePlate,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: SellerTheme.textMuted,
                        letterSpacing: 1,
                      )),
                ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(statusLabel,
                    style: TextStyle(
                        fontSize: 10,
                        color: statusColor,
                        fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 4),
              Text('⭐ ${driver.rating.toStringAsFixed(1)}',
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.bold)),
            ]),
          ]),
          const SizedBox(height: 10),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _kpi('${driver.totalTrips}', 'Total Trips', SellerTheme.infoBlue),
            _kpi(driver.todayEarnings.toStringAsFixed(0), 'Today Earnings',
                SellerTheme.successGreen),
          ]),
          const SizedBox(height: 10),
          // Actions
          if (driver.status != DriverStatus.suspended)
            Row(children: [
              Expanded(child: _outlineBtn('📞 Call', _taxi, () {})),
              const SizedBox(width: 8),
              Expanded(
                  child: _outlineBtn('🚫 Suspend', SellerTheme.errorRed, () {
                bloc.add(SuspendDriver(driver.id));
              })),
            ])
          else
            SizedBox(
                width: double.infinity,
                child: _outlineBtn('✅ Reinstate', SellerTheme.successGreen, () {
                  bloc.add(ReinstateDriver(driver.id));
                })),
        ]),
      ),
    );
  }

  Widget _kpi(String v, String l, Color c) => Column(children: [
        Text(v,
            style:
                TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: c)),
        Text(l,
            style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
      ]);

  Widget _outlineBtn(String label, Color c, VoidCallback onTap) => SizedBox(
        height: 34,
        child: OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            foregroundColor: c,
            side: BorderSide(color: c.withValues(alpha: 0.5)),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: EdgeInsets.zero,
          ),
          child: Text(label,
              style:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      );
}
