import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Scheduled Rides Screen — Book rides in advance with date/time picker.
///
/// Features:
///  - Upcoming scheduled rides list
///  - Schedule new ride with date, time, and recurring options
///  - Edit/cancel existing schedules
///  - Countdown timer for upcoming rides
///  - Empty state with CTA
class ScheduledRidesScreen extends StatefulWidget {
  const ScheduledRidesScreen({super.key});

  @override
  State<ScheduledRidesScreen> createState() => _ScheduledRidesScreenState();
}

class _ScheduledRidesScreenState extends State<ScheduledRidesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  final List<_ScheduledRide> _upcoming = [
    _ScheduledRide(
        id: '1',
        pickup: 'Home',
        destination: 'Office',
        dateTime: DateTime.now().add(const Duration(hours: 14)),
        vehicleType: 'Comfort',
        isRecurring: true,
        recurringDays: 'Mon-Fri'),
    _ScheduledRide(
        id: '2',
        pickup: 'Airport T1A',
        destination: 'Serena Hotel',
        dateTime: DateTime.now().add(const Duration(days: 2, hours: 6)),
        vehicleType: 'Premium',
        isRecurring: false),
  ];

  final List<_ScheduledRide> _past = [
    _ScheduledRide(
        id: '3',
        pickup: 'Home',
        destination: 'CBD',
        dateTime: DateTime.now().subtract(const Duration(days: 1)),
        vehicleType: 'Economy',
        isRecurring: false,
        status: 'Completed'),
    _ScheduledRide(
        id: '4',
        pickup: 'Mall',
        destination: 'Home',
        dateTime: DateTime.now().subtract(const Duration(days: 3)),
        vehicleType: 'Economy',
        isRecurring: false,
        status: 'Cancelled'),
  ];

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bg => _isDark ? const Color(0xFF0F0F23) : Colors.grey.shade50;
  Color get _card => _isDark ? const Color(0xFF1A1A2E) : Colors.white;
  Color get _accent => const Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('Scheduled Rides',
            style: TextStyle(fontWeight: FontWeight.w700)),
        elevation: 0,
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: _accent,
          labelColor: _accent,
          unselectedLabelColor: Colors.grey,
          tabs: [
            Tab(
                child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.upcoming_rounded, size: 18),
              const SizedBox(width: 6),
              Text('Upcoming (${_upcoming.length})'),
            ])),
            Tab(
                child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.history_rounded, size: 18),
              const SizedBox(width: 6),
              Text('Past (${_past.length})'),
            ])),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _upcoming.isEmpty
              ? _emptyState()
              : _buildList(_upcoming, isUpcoming: true),
          _past.isEmpty ? _emptyState() : _buildList(_past, isUpcoming: false),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _scheduleNewRide,
        backgroundColor: _accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.schedule_send_rounded),
        label: const Text('Schedule Ride',
            style: TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildList(List<_ScheduledRide> rides, {required bool isUpcoming}) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: rides.length,
      itemBuilder: (ctx, i) => _rideCard(rides[i], isUpcoming: isUpcoming),
    );
  }

  Widget _rideCard(_ScheduledRide ride, {required bool isUpcoming}) {
    final timeUntil = ride.dateTime.difference(DateTime.now());
    final countdownText = isUpcoming
        ? timeUntil.inHours > 24
            ? '${timeUntil.inDays}d ${timeUntil.inHours % 24}h'
            : timeUntil.inHours > 0
                ? '${timeUntil.inHours}h ${timeUntil.inMinutes % 60}m'
                : '${timeUntil.inMinutes}m'
        : ride.status ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Timeline indicator
                Column(
                  children: [
                    Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                            color: Color(0xFF10B981), shape: BoxShape.circle)),
                    Container(
                        width: 2, height: 28, color: Colors.grey.shade300),
                    Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                            color: Colors.red.shade400,
                            shape: BoxShape.circle)),
                  ],
                ),
                const SizedBox(width: 12),
                // Addresses
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ride.pickup,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 18),
                      Text(ride.destination,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14)),
                    ],
                  ),
                ),
                // Countdown / Status
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isUpcoming
                            ? _accent.withValues(alpha: 0.1)
                            : ride.status == 'Completed'
                                ? Colors.green.withValues(alpha: 0.1)
                                : Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isUpcoming ? 'In $countdownText' : countdownText,
                        style: TextStyle(
                          color: isUpcoming
                              ? _accent
                              : ride.status == 'Completed'
                                  ? Colors.green
                                  : Colors.red,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(ride.vehicleType,
                        style: TextStyle(
                            color: Colors.grey.shade500, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          // Bottom bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: _isDark
                  ? Colors.white.withValues(alpha: 0.03)
                  : Colors.grey.shade50,
              borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_today_rounded,
                    size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(_formatDateTime(ride.dateTime),
                    style:
                        TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                if (ride.isRecurring) ...[
                  const SizedBox(width: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6)),
                    child: Text('🔁 ${ride.recurringDays}',
                        style: const TextStyle(
                            fontSize: 11, color: Colors.purple)),
                  ),
                ],
                const Spacer(),
                if (isUpcoming)
                  GestureDetector(
                    onTap: () => _cancelSchedule(ride),
                    child: Text('Cancel',
                        style: TextStyle(
                            color: Colors.red.shade400,
                            fontWeight: FontWeight.w600,
                            fontSize: 13)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.event_available_rounded,
              size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text('No scheduled rides',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade500)),
          const SizedBox(height: 8),
          Text('Plan ahead by scheduling\nyour next ride',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final hour = dt.hour > 12
        ? dt.hour - 12
        : dt.hour == 0
            ? 12
            : dt.hour;
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '${months[dt.month - 1]} ${dt.day}, $hour:${dt.minute.toString().padLeft(2, '0')} $amPm';
  }

  void _scheduleNewRide() async {
    HapticFeedback.lightImpact();
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
        context: context, initialTime: const TimeOfDay(hour: 8, minute: 0));
    if (time == null || !mounted) return;

    final scheduledTime =
        DateTime(date.year, date.month, date.day, time.hour, time.minute);
    setState(() => _upcoming.insert(
        0,
        _ScheduledRide(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          pickup: 'Home',
          destination: 'Destination',
          dateTime: scheduledTime,
          vehicleType: 'Economy',
          isRecurring: false,
        )));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text('Ride scheduled for ${_formatDateTime(scheduledTime)}')),
      );
    }
  }

  void _cancelSchedule(_ScheduledRide ride) {
    HapticFeedback.mediumImpact();
    setState(() => _upcoming.remove(ride));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Schedule cancelled'),
        action: SnackBarAction(
            label: 'Undo',
            onPressed: () => setState(() => _upcoming.insert(0, ride))),
      ),
    );
  }
}

class _ScheduledRide {
  final String id;
  final String pickup;
  final String destination;
  final DateTime dateTime;
  final String vehicleType;
  final bool isRecurring;
  final String? recurringDays;
  final String? status;

  _ScheduledRide({
    required this.id,
    required this.pickup,
    required this.destination,
    required this.dateTime,
    required this.vehicleType,
    this.isRecurring = false,
    this.recurringDays,
    this.status,
  });
}
