import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:kartseek_customer/features/doctor/data/datasources/doctor_realtime_datasource.dart';

/// Appointment Detail Screen — View full appointment info with live token queue and map.
class AppointmentDetailScreen extends StatefulWidget {
  final Map<String, dynamic> appointmentData;
  const AppointmentDetailScreen({super.key, required this.appointmentData});

  @override
  State<AppointmentDetailScreen> createState() => _AppointmentDetailScreenState();
}

class _AppointmentDetailScreenState extends State<AppointmentDetailScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  GoogleMapController? _mapController;

  // ── Live token queue data from WebSocket ──────────────────────────────────
  final DoctorRealtimeDatasource _realtime = DoctorRealtimeDatasource();
  StreamSubscription? _tokenSub;
  StreamSubscription? _queueSub;
  StreamSubscription? _consultationSub;

  // Live data with graceful fallback defaults
  int _currentServingToken = 0;
  int _myToken = 0;
  double _avgWaitMin = 0;
  bool _wsConnected = false;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _initLocation();
    _initRealtimeQueue();
  }

  /// Connect to doctor-queue WebSocket and subscribe to live token updates.
  Future<void> _initRealtimeQueue() async {
    final appt = widget.appointmentData;
    final doctorId = appt['doctorId'] as String? ?? appt['doctor_id'] as String? ?? '';
    _myToken = (appt['tokenNumber'] as num?)?.toInt() ?? (appt['token_number'] as num?)?.toInt() ?? 0;

    if (doctorId.isEmpty) return;

    try {
      // Use a placeholder userId — in production this comes from auth state
      final userId = appt['userId'] as String? ?? appt['user_id'] as String? ?? 'customer';
      await _realtime.connect(userId: userId);
      _wsConnected = true;

      // Subscribe to the doctor's queue
      final date = appt['date'] as String? ?? DateTime.now().toIso8601String().substring(0, 10);
      _realtime.subscribeQueue(doctorId: doctorId, date: date);

      // Listen for token advances
      _tokenSub = _realtime.tokenAdvancedStream.listen((event) {
        if (mounted) {
          setState(() {
            _currentServingToken = event.currentToken;
            _avgWaitMin = event.avgWaitMinutes;
          });
        }
      });

      // Listen for full queue updates
      _queueSub = _realtime.queueUpdatedStream.listen((event) {
        if (mounted) {
          setState(() {
            _currentServingToken = event.currentToken;
            _avgWaitMin = event.avgWaitMinutes;
            // Update my queue position if my appointment is in the list
            for (final appt in event.appointments) {
              if (appt.tokenNumber == _myToken) {
                // Found my appointment — could update position here
                break;
              }
            }
          });
        }
      });

      // Listen for consultation status changes
      _consultationSub = _realtime.consultationUpdateStream.listen((event) {
        if (mounted && event.tokenNumber != null) {
          setState(() {
            _currentServingToken = event.tokenNumber!;
          });
        }
      });
    } catch (e) {
      debugPrint('[AppointmentDetail] WebSocket init failed (using fallback): $e');
      // Graceful fallback — keep default values
    }
  }

  @override
  void dispose() {
    _tokenSub?.cancel();
    _queueSub?.cancel();
    _consultationSub?.cancel();
    if (_wsConnected) {
      final doctorId = widget.appointmentData['doctorId'] as String?
          ?? widget.appointmentData['doctor_id'] as String? ?? '';
      if (doctorId.isNotEmpty) {
        _realtime.unsubscribeQueue(doctorId: doctorId);
      }
      _realtime.disconnect();
    }
    _pulseCtrl.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _initLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) await Geolocator.requestPermission();
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (mounted) {
        _mapController?.animateCamera(
          CameraUpdate.newLatLng(LatLng(pos.latitude, pos.longitude)),
        );
      }
    } catch (_) {}
  }

  Future<void> _openDirections(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final appointmentData = widget.appointmentData;
    final id = appointmentData['id'] ?? 'APT-001';
    final doctorName = appointmentData['doctorName'] ?? 'Dr. Sarah Kamau';
    final spec = appointmentData['speciality'] ?? appointmentData['specialty'] ?? 'General';
    final date = appointmentData['date'] ?? 'Today';
    final timeSlot = appointmentData['timeSlot'] ?? '3:00 PM';
    final status = appointmentData['status'] ?? 'confirmed';
    final fee = appointmentData['fee'] ?? 800;
    final type = appointmentData['type'] ?? 'In-Person';
    final currency = RegionService.instance.currentCountry.currencySymbol;

    final isConfirmed = status == 'confirmed';
    final isCompleted = status == 'completed';

    final statusConfig = {
      'confirmed': {'label': 'Confirmed', 'color': const Color(0xFF10B981), 'icon': Icons.check_circle},
      'pending': {'label': 'Pending', 'color': const Color(0xFFF59E0B), 'icon': Icons.schedule},
      'completed': {'label': 'Completed', 'color': const Color(0xFF3B82F6), 'icon': Icons.done_all},
      'cancelled': {'label': 'Cancelled', 'color': const Color(0xFFEF4444), 'icon': Icons.cancel},
    };
    final cfg = statusConfig[status] ?? statusConfig['confirmed']!;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('Appointment Details', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // ── Status Banner ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [(cfg['color'] as Color).withValues(alpha: 0.1), (cfg['color'] as Color).withValues(alpha: 0.05)]),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: (cfg['color'] as Color).withValues(alpha: 0.3)),
            ),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(color: (cfg['color'] as Color).withValues(alpha: 0.15), shape: BoxShape.circle),
                child: Icon(cfg['icon'] as IconData, color: cfg['color'] as Color, size: 24),
              ),
              const SizedBox(width: 14),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(cfg['label'] as String, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: cfg['color'] as Color)),
                Text('Appointment #$id', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ]),
            ]),
          ),

          const SizedBox(height: 16),

          // ── Doctor Card ──
          _card([
            Row(children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]), borderRadius: BorderRadius.circular(16)),
                child: Center(child: Text(doctorName.split(' ').last[0], style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900))),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(doctorName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Text(spec, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6D28D9))),
              ])),
            ]),
          ]),

          const SizedBox(height: 12),

          // ── Appointment Info ──
          _card([
            _infoRow(Icons.calendar_today, 'Date', date, const Color(0xFF3B82F6)),
            _infoRow(Icons.access_time, 'Time', timeSlot, const Color(0xFF8B5CF6)),
            _infoRow(Icons.medical_services, 'Type', type, const Color(0xFF0891B2)),
            _infoRow(Icons.payments, 'Fee', '$currency $fee', const Color(0xFF059669)),
          ]),

          const SizedBox(height: 12),

          // ── Live Token Queue Widget ──
          if (isConfirmed)
            AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (context, child) {
                final patientsAhead = _myToken - _currentServingToken;
                final waitMinutes = patientsAhead * _avgWaitMin;
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6), Color(0xFFA855F7)]),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF6D28D9).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8)),
                    ],
                  ),
                  child: Column(children: [
                    // Now Serving row
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('NOW SERVING', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white.withValues(alpha: 0.6), letterSpacing: 2)),
                        const SizedBox(height: 2),
                        Text('Token #$_currentServingToken', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)),
                      ]),
                      // Your Token
                      Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withValues(alpha: 0.4 + _pulseCtrl.value * 0.6), width: 3),
                          color: Colors.white.withValues(alpha: 0.15),
                        ),
                        child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Text('YOUR', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: Colors.white.withValues(alpha: 0.7))),
                          Text('#$_myToken', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
                        ])),
                      ),
                    ]),
                    const SizedBox(height: 16),
                    // Queue Info Row
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                      child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                        _queueStat(Icons.people, '$patientsAhead ahead'),
                        Container(width: 1, height: 24, color: Colors.white.withValues(alpha: 0.2)),
                        _queueStat(Icons.timer, '~$waitMinutes min'),
                        Container(width: 1, height: 24, color: Colors.white.withValues(alpha: 0.2)),
                        _queueStat(Icons.speed, '$_avgWaitMin min/patient'),
                      ]),
                    ),
                  ]),
                );
              },
            ),

          const SizedBox(height: 12),

          // ── Google Maps Card ──
          if (isConfirmed && type.toLowerCase() != 'video')
            Container(
              width: double.infinity,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 15)]),
              child: Column(children: [
                // Map
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  child: SizedBox(
                    height: 180,
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(
                          (appointmentData['hospitalLat'] as num?)?.toDouble() ?? -1.2961,
                          (appointmentData['hospitalLng'] as num?)?.toDouble() ?? 36.8120,
                        ),
                        zoom: 14,
                      ),
                      myLocationEnabled: true,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      mapToolbarEnabled: false,
                      markers: {
                        Marker(
                          markerId: const MarkerId('hospital'),
                          position: LatLng(
                            (appointmentData['hospitalLat'] as num?)?.toDouble() ?? -1.2961,
                            (appointmentData['hospitalLng'] as num?)?.toDouble() ?? 36.8120,
                          ),
                          infoWindow: InfoWindow(title: appointmentData['hospitalName'] ?? 'Hospital'),
                          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
                        ),
                      },
                      onMapCreated: (ctrl) => _mapController = ctrl,
                    ),
                  ),
                ),
                // Location info + directions button
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: const Color(0xFF6D28D9).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.location_on, color: Color(0xFF6D28D9), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(appointmentData['hospitalName'] ?? 'Hospital', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      Text(appointmentData['hospitalAddress'] ?? 'Nairobi', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ])),
                    GestureDetector(
                      onTap: () => _openDirections(
                        (appointmentData['hospitalLat'] as num?)?.toDouble() ?? -1.2961,
                        (appointmentData['hospitalLng'] as num?)?.toDouble() ?? 36.8120,
                      ),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(color: const Color(0xFF6D28D9), borderRadius: BorderRadius.circular(10)),
                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.directions, size: 14, color: Colors.white),
                          SizedBox(width: 4),
                          Text('Directions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
                        ]),
                      ),
                    ),
                  ]),
                ),
              ]),
            ),

          const SizedBox(height: 12),

          // ── Prescription / Notes ──
          _card([
            const Row(children: [
              Icon(Icons.description, color: Color(0xFF6D28D9), size: 20),
              SizedBox(width: 8),
              Text('Notes & Prescription', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            ]),
            const SizedBox(height: 12),
            if (isCompleted)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFBBF7D0))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Prescription Available', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF166534))),
                  const SizedBox(height: 4),
                  Text('Dr. $doctorName has shared a prescription.', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(8)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.download, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text('Download PDF', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                    ]),
                  ),
                ]),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                child: const Text('No notes yet. The doctor will share notes after the consultation.', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
              ),
          ]),

          const SizedBox(height: 20),

          // ── Actions ──
          if (isConfirmed) ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.edit_calendar, size: 18),
                label: const Text('Reschedule', style: TextStyle(fontWeight: FontWeight.w800)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6D28D9), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showCancelDialog(context, id),
                icon: const Icon(Icons.cancel_outlined, size: 18),
                label: const Text('Cancel Appointment', style: TextStyle(fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFEF4444), side: const BorderSide(color: Color(0xFFFCA5A5)), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              ),
            ),
          ],
          if (isCompleted) ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pushNamed(context, CustomerRouter.doctorReview, arguments: appointmentData),
                icon: const Icon(Icons.star, size: 18),
                label: const Text('Rate & Review', style: TextStyle(fontWeight: FontWeight.w800)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              ),
            ),
          ],

          const SizedBox(height: 30),
        ]),
      ),
    );
  }

  Widget _card(List<Widget> children) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
  );

  Widget _infoRow(IconData icon, String label, String value, Color color) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
      const SizedBox(width: 12),
      Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
      const Spacer(),
      Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
    ]),
  );

  Widget _queueStat(IconData icon, String text) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 14, color: Colors.white.withValues(alpha: 0.7)),
    const SizedBox(width: 4),
    Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
  ]);

  void _showCancelDialog(BuildContext context, String id) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('Cancel Appointment?', style: TextStyle(fontWeight: FontWeight.w800)),
      content: const Text('Are you sure you want to cancel this appointment? Cancellation fees may apply.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep it')),
        TextButton(onPressed: () { Navigator.pop(ctx); Navigator.pop(context); }, child: const Text('Cancel', style: TextStyle(color: Color(0xFFEF4444)))),
      ],
    ));
  }
}
