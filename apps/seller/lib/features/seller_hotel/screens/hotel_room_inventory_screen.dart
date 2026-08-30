import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_event.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Room Inventory Screen
///
/// 5-tab layout: All · Available · Occupied · Cleaning · Maintenance
/// Grid/List toggle, per-room detail sheet with:
///   - Status change picker
///   - Price editor
///   - Notes field
///   - Amenity display
///   - Quick action buttons
class HotelRoomInventoryScreen extends StatefulWidget {
  const HotelRoomInventoryScreen({super.key});

  @override
  State<HotelRoomInventoryScreen> createState() =>
      _HotelRoomInventoryScreenState();
}

class _HotelRoomInventoryScreenState extends State<HotelRoomInventoryScreen>
    with SingleTickerProviderStateMixin {
  static const _hotelPurple = Color(0xFF8B5CF6);
  static const _hotelGold = Color(0xFFF59E0B);

  late TabController _tabCtrl;
  bool _gridView = true;
  String _filterType =
      'All'; // 'All' | 'Standard' | 'Deluxe' | 'Suite' | 'Penthouse'
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 5, vsync: this);

    final ss = context.read<SellerBloc>().state;
    context
        .read<HotelSellerBloc>()
        .add(LoadHotelRooms(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<HotelSellerBloc, HotelSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (_, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: SellerTheme.successGreen,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<SellerBloc, dynamic>(
        builder: (context, ss) =>
            BlocBuilder<HotelSellerBloc, HotelSellerState>(
          builder: (context, state) {
            final allRooms = state.hotelRooms;
            final available = allRooms
                .where((r) => r.status == RoomStatus.available)
                .toList();
            final occupied =
                allRooms.where((r) => r.status == RoomStatus.occupied).toList();
            final cleaning =
                allRooms.where((r) => r.status == RoomStatus.cleaning).toList();
            final maintenance = allRooms
                .where((r) =>
                    r.status == RoomStatus.maintenance ||
                    r.status == RoomStatus.outOfOrder)
                .toList();

            return Scaffold(
              backgroundColor: SellerTheme.surface,
              appBar: AppBar(
                backgroundColor: _hotelPurple,
                foregroundColor: Colors.white,
                title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Room Inventory',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      Text(
                          '${allRooms.length} rooms · ${(state.occupancyRate * 100).toStringAsFixed(0)}% occupied',
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white70)),
                    ]),
                actions: [
                  IconButton(
                    icon: Icon(
                        _gridView
                            ? Icons.view_list_outlined
                            : Icons.grid_view_outlined,
                        color: Colors.white),
                    tooltip: _gridView ? 'List View' : 'Grid View',
                    onPressed: () => setState(() => _gridView = !_gridView),
                  ),
                ],
                bottom: TabBar(
                  controller: _tabCtrl,
                  isScrollable: true,
                  indicatorColor: Colors.white,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white60,
                  labelStyle: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.bold),
                  tabAlignment: TabAlignment.start,
                  tabs: [
                    _tab('All', allRooms.length, Colors.white),
                    _tab('Available', available.length,
                        SellerTheme.successGreen),
                    _tab('Occupied', occupied.length, _hotelPurple),
                    _tab('Cleaning', cleaning.length, SellerTheme.infoBlue),
                    _tab('Maintenance', maintenance.length,
                        SellerTheme.warningAmber),
                  ],
                ),
              ),
              body: Column(children: [
                // ── Search + Type Filter ─────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                  child: Column(children: [
                    TextField(
                      onChanged: (v) =>
                          setState(() => _searchQuery = v.toLowerCase()),
                      decoration: InputDecoration(
                        hintText: 'Search room number or type...',
                        hintStyle: const TextStyle(fontSize: 13),
                        prefixIcon: const Icon(Icons.search_outlined, size: 18),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: SellerTheme.border)),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: SellerTheme.border)),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          'All',
                          'Standard',
                          'Deluxe',
                          'Suite',
                          'Penthouse'
                        ]
                            .map((t) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap: () =>
                                        setState(() => _filterType = t),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: _filterType == t
                                            ? _hotelPurple
                                            : Colors.white,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: _filterType == t
                                              ? _hotelPurple
                                              : SellerTheme.border,
                                        ),
                                      ),
                                      child: Text(t,
                                          style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: _filterType == t
                                                  ? Colors.white
                                                  : SellerTheme.textSecondary)),
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ]),
                ),

                // ── Occupancy stats row ──────────────────────────────────────
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  child: Row(children: [
                    _statChip('${available.length}', 'Available',
                        SellerTheme.successGreen),
                    const SizedBox(width: 8),
                    _statChip('${occupied.length}', 'Occupied', _hotelPurple),
                    const SizedBox(width: 8),
                    _statChip(
                        '${cleaning.length}', 'Cleaning', SellerTheme.infoBlue),
                    const SizedBox(width: 8),
                    _statChip('${maintenance.length}', 'Maint.',
                        SellerTheme.warningAmber),
                  ]),
                ),
                const SizedBox(height: 8),

                // ── Tab content ──────────────────────────────────────────────
                Expanded(
                  child: TabBarView(
                    controller: _tabCtrl,
                    children: [
                      _buildRoomGrid(context, allRooms, state, ss),
                      _buildRoomGrid(context, available, state, ss),
                      _buildRoomGrid(context, occupied, state, ss),
                      _buildRoomGrid(context, cleaning, state, ss),
                      _buildRoomGrid(context, maintenance, state, ss),
                    ],
                  ),
                ),
              ]),
            );
          },
        ),
      ),
    );
  }

  Tab _tab(String label, int count, Color c) => Tab(
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$count', style: const TextStyle(fontSize: 9)),
            ),
          ],
        ]),
      );

  Widget _statChip(String val, String label, Color c) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: c.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: c.withValues(alpha: 0.3)),
          ),
          child: Column(children: [
            Text(val,
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.bold, color: c)),
            Text(label,
                style:
                    const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
          ]),
        ),
      );

  Widget _buildRoomGrid(BuildContext context, List<HotelRoomModel> rooms,
      HotelSellerState state, dynamic ss) {
    var filtered = rooms.where((r) {
      final matchType = _filterType == 'All' || r.type == _filterType;
      final matchQuery = _searchQuery.isEmpty ||
          r.number.toString().contains(_searchQuery) ||
          r.type.toLowerCase().contains(_searchQuery);
      return matchType && matchQuery;
    }).toList();

    if (filtered.isEmpty) {
      return const Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text('🛏', style: TextStyle(fontSize: 40)),
          SizedBox(height: 12),
          Text('No rooms match your filter',
              style: TextStyle(color: SellerTheme.textSecondary, fontSize: 14)),
        ]),
      );
    }

    final cur = ss.country.currencySymbol;

    if (_gridView) {
      return GridView.builder(
        padding: const EdgeInsets.all(14),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 0.85,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemCount: filtered.length,
        itemBuilder: (ctx, i) => _RoomGridCard(
          room: filtered[i],
          cur: cur,
          onTap: () => _showRoomSheet(ctx, filtered[i], state),
        ),
      );
    } else {
      return ListView.separated(
        padding: const EdgeInsets.all(14),
        itemCount: filtered.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (ctx, i) => _RoomListCard(
          room: filtered[i],
          cur: cur,
          onTap: () => _showRoomSheet(ctx, filtered[i], state),
        ),
      );
    }
  }

  // ── Room Detail Sheet ──────────────────────────────────────────────────────

  void _showRoomSheet(
      BuildContext context, HotelRoomModel room, HotelSellerState state) {
    final priceCtrl =
        TextEditingController(text: room.pricePerNight.toStringAsFixed(0));
    final noteCtrl = TextEditingController(text: room.notes ?? '');
    final cur = context.read<SellerBloc>().state.country.currencySymbol;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 28),
        child: SingleChildScrollView(
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color:
                          _colorForStatus(room.status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('🛏', style: TextStyle(fontSize: 18)),
                          Text('${room.number}',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: _colorForStatus(room.status))),
                        ]),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text('Room ${room.number} — ${room.type}',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(
                            'Floor ${room.floor} · Max ${room.maxGuests} guests',
                            style: const TextStyle(
                                color: SellerTheme.textMuted, fontSize: 12)),
                      ])),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color:
                          _colorForStatus(room.status).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(_labelForStatus(room.status),
                        style: TextStyle(
                            color: _colorForStatus(room.status),
                            fontWeight: FontWeight.bold,
                            fontSize: 11)),
                  ),
                ]),
                const SizedBox(height: 16),

                // If occupied, show current guest
                if (room.currentGuestName != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _hotelPurple.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: _hotelPurple.withValues(alpha: 0.2)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.person_outline,
                          size: 16, color: Color(0xFF8B5CF6)),
                      const SizedBox(width: 8),
                      Text('Guest: ${room.currentGuestName}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 13)),
                    ]),
                  ),
                  const SizedBox(height: 12),
                ],

                // Status picker
                const Text('Change Status',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 6, children: [
                  for (final s in [
                    ('available', 'Available', SellerTheme.successGreen),
                    ('cleaning', 'Cleaning', SellerTheme.infoBlue),
                    ('maintenance', 'Maintenance', SellerTheme.warningAmber),
                    ('out_of_order', 'Out of Order', SellerTheme.errorRed),
                  ])
                    GestureDetector(
                      onTap: () {
                        context
                            .read<HotelSellerBloc>()
                            .add(UpdateRoomStatus(room.id, s.$1));
                        Navigator.pop(ctx);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: s.$3.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border:
                              Border.all(color: s.$3.withValues(alpha: 0.4)),
                        ),
                        child: Text(s.$2,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: s.$3)),
                      ),
                    ),
                ]),

                const SizedBox(height: 16),

                // Amenities
                const Text('Amenities',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: room.amenities
                      .map((a) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: SellerTheme.surface,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: SellerTheme.border),
                            ),
                            child:
                                Text(a, style: const TextStyle(fontSize: 11)),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 16),

                // Price editor
                const Text('Room Rate / Night',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: priceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        prefixText: '$cur ',
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10)),
                        filled: true,
                        fillColor: SellerTheme.surface,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: () {
                      final price = double.tryParse(priceCtrl.text) ?? 0;
                      if (price > 0) {
                        context
                            .read<HotelSellerBloc>()
                            .add(UpdateRoomPrice(room.id, price));
                        Navigator.pop(ctx);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _hotelGold,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(
                          vertical: 12, horizontal: 14),
                      elevation: 0,
                    ),
                    child: const Text('Update'),
                  ),
                ]),
                const SizedBox(height: 16),

                // Notes
                const Text('Housekeeping Notes',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                TextField(
                  controller: noteCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText:
                        'e.g. AC filter needs replacement, deep clean required...',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: SellerTheme.surface,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _hotelPurple,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    onPressed: () {
                      context
                          .read<HotelSellerBloc>()
                          .add(AddRoomNote(room.id, noteCtrl.text.trim()));
                      Navigator.pop(ctx);
                    },
                    child: const Text('Save Notes',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
        ),
      ),
    );
  }

  Color _colorForStatus(RoomStatus s) => switch (s) {
        RoomStatus.available => SellerTheme.successGreen,
        RoomStatus.occupied => _hotelPurple,
        RoomStatus.cleaning => SellerTheme.infoBlue,
        RoomStatus.maintenance => SellerTheme.warningAmber,
        RoomStatus.outOfOrder => SellerTheme.errorRed,
      };

  String _labelForStatus(RoomStatus s) => switch (s) {
        RoomStatus.available => 'Available',
        RoomStatus.occupied => 'Occupied',
        RoomStatus.cleaning => 'Cleaning',
        RoomStatus.maintenance => 'Maintenance',
        RoomStatus.outOfOrder => 'Out of Order',
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid card
// ─────────────────────────────────────────────────────────────────────────────

class _RoomGridCard extends StatelessWidget {
  final HotelRoomModel room;
  final String cur;
  final VoidCallback onTap;
  const _RoomGridCard(
      {required this.room, required this.cur, required this.onTap});

  Color get _color => switch (room.status) {
        RoomStatus.available => SellerTheme.successGreen,
        RoomStatus.occupied => const Color(0xFF8B5CF6),
        RoomStatus.cleaning => SellerTheme.infoBlue,
        RoomStatus.maintenance => SellerTheme.warningAmber,
        RoomStatus.outOfOrder => SellerTheme.errorRed,
      };

  String get _emoji => switch (room.status) {
        RoomStatus.available => '🟢',
        RoomStatus.occupied => '👥',
        RoomStatus.cleaning => '🧹',
        RoomStatus.maintenance => '🔧',
        RoomStatus.outOfOrder => '⛔',
      };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _color.withValues(alpha: 0.4)),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ],
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(_emoji, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 4),
          Text('${room.number}',
              style: TextStyle(
                  fontSize: 14, fontWeight: FontWeight.bold, color: _color)),
          Text(room.type,
              style:
                  const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
          const SizedBox(height: 2),
          Text('$cur ${room.pricePerNight.toStringAsFixed(0)}',
              style: TextStyle(
                  fontSize: 9, fontWeight: FontWeight.w600, color: _color)),
          if (room.currentGuestName != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(room.currentGuestName!.split(' ').first,
                  style: const TextStyle(
                      fontSize: 7, color: SellerTheme.textMuted),
                  overflow: TextOverflow.ellipsis),
            ),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List card
// ─────────────────────────────────────────────────────────────────────────────

class _RoomListCard extends StatelessWidget {
  final HotelRoomModel room;
  final String cur;
  final VoidCallback onTap;
  const _RoomListCard(
      {required this.room, required this.cur, required this.onTap});

  Color get _color => switch (room.status) {
        RoomStatus.available => SellerTheme.successGreen,
        RoomStatus.occupied => const Color(0xFF8B5CF6),
        RoomStatus.cleaning => SellerTheme.infoBlue,
        RoomStatus.maintenance => SellerTheme.warningAmber,
        RoomStatus.outOfOrder => SellerTheme.errorRed,
      };

  String get _label => switch (room.status) {
        RoomStatus.available => 'Available',
        RoomStatus.occupied => 'Occupied',
        RoomStatus.cleaning => 'Cleaning',
        RoomStatus.maintenance => 'Maintenance',
        RoomStatus.outOfOrder => 'Out of Order',
      };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: SellerTheme.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: _color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('🛏', style: TextStyle(fontSize: 18)),
                    Text('${room.number}',
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: _color)),
                  ]),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Row(children: [
                    Text('Room ${room.number}',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                          color: _color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6)),
                      child: Text(room.type,
                          style: TextStyle(
                              fontSize: 9,
                              color: _color,
                              fontWeight: FontWeight.bold)),
                    ),
                  ]),
                  Text('Floor ${room.floor} · ${room.maxGuests} guests max',
                      style: const TextStyle(
                          color: SellerTheme.textSecondary, fontSize: 11)),
                  if (room.currentGuestName != null)
                    Text('Guest: ${room.currentGuestName}',
                        style: const TextStyle(
                            color: SellerTheme.textMuted, fontSize: 10)),
                  if (room.notes != null)
                    Text('📝 ${room.notes}',
                        style: const TextStyle(
                            color: SellerTheme.warningAmber, fontSize: 10),
                        overflow: TextOverflow.ellipsis),
                  Wrap(
                    spacing: 4,
                    runSpacing: 2,
                    children: room.amenities
                        .take(3)
                        .map((a) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: SellerTheme.surface,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: SellerTheme.border),
                              ),
                              child: Text(a,
                                  style: const TextStyle(
                                      fontSize: 8,
                                      color: SellerTheme.textMuted)),
                            ))
                        .toList(),
                  ),
                ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_label,
                    style: TextStyle(
                        color: _color,
                        fontSize: 9,
                        fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 6),
              Text('$cur ${room.pricePerNight.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: Color(0xFF8B5CF6))),
              const Text('/night',
                  style: TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
            ]),
          ]),
        ),
      ),
    );
  }
}
