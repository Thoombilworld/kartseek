import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Intercity shuttle booking screen — book seats on inter-city routes.
class IntercityBookingScreen extends StatefulWidget {
  const IntercityBookingScreen({super.key});

  @override
  State<IntercityBookingScreen> createState() => _IntercityBookingScreenState();
}

class _IntercityBookingScreenState extends State<IntercityBookingScreen> {
  late String _from;
  String _to = '';
  DateTime? _date;
  int _passengers = 1;
  int _selectedRoute = -1;
  String _selectedTime = '';
  bool _isBooking = false;
  bool _booked = false;

  late final List<Map<String, dynamic>> _routes;

  @override
  void initState() {
    super.initState();
    final city = RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity;
    _from = city;
    _routes = [
      {'id': 0, 'from': city, 'to': 'City A', 'duration': '8h', 'distance': '480 km', 'fare': 1800, 'departures': ['06:00 AM', '08:00 AM', '10:00 PM']},
      {'id': 1, 'from': city, 'to': 'City B', 'duration': '6h', 'distance': '350 km', 'fare': 1500, 'departures': ['07:00 AM', '09:00 AM']},
      {'id': 2, 'from': city, 'to': 'City C', 'duration': '2.5h', 'distance': '160 km', 'fare': 700, 'departures': ['07:30 AM', '10:00 AM', '02:00 PM', '05:00 PM']},
      {'id': 3, 'from': city, 'to': 'City D', 'duration': '4h', 'distance': '310 km', 'fare': 1200, 'departures': ['06:00 AM', '08:00 AM', '01:00 PM']},
      {'id': 4, 'from': city, 'to': 'City E', 'duration': '2h', 'distance': '150 km', 'fare': 650, 'departures': ['08:00 AM', '12:00 PM', '04:00 PM']},
    ];
  }

  List<Map<String, dynamic>> get _filteredRoutes {
    return _routes.where((r) {
      if (_to.isEmpty) return true;
      return (r['to'] as String).toLowerCase().contains(_to.toLowerCase());
    }).toList();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _book() async {
    if (_selectedRoute < 0 || _selectedTime.isEmpty || _date == null) return;
    setState(() => _isBooking = true);
    await Future.delayed(const Duration(milliseconds: 1500));
    setState(() { _isBooking = false; _booked = true; });
  }

  @override
  Widget build(BuildContext context) {
    if (_booked) return _confirmedView();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Intercity Travel', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 20)),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search form
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey[200]!)),
              child: Column(
                children: [
                  // From / To
                  Row(
                    children: [
                      Column(
                        children: [
                          Container(width: 10, height: 10, decoration: BoxDecoration(color: Colors.grey[400], shape: BoxShape.circle)),
                          Container(width: 1, height: 30, color: Colors.grey[300]),
                          Container(width: 10, height: 10, decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(2))),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          children: [
                            TextField(
                              controller: TextEditingController(text: _from),
                              onChanged: (v) => setState(() => _from = v),
                              decoration: InputDecoration(
                                hintText: 'From', isDense: true, filled: true, fillColor: Colors.grey[50],
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey[200]!)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey[200]!)),
                              ),
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              onChanged: (v) => setState(() => _to = v),
                              decoration: InputDecoration(
                                hintText: 'To (destination city)', isDense: true, filled: true, fillColor: Colors.grey[50],
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey[200]!)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey[200]!)),
                              ),
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Date + Passengers
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: _pickDate,
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey[200]!)),
                            child: Row(
                              children: [
                                Icon(Icons.calendar_today, size: 16, color: Colors.grey[500]),
                                const SizedBox(width: 6),
                                Text(
                                  _date != null ? '${_date!.day}/${_date!.month}' : 'Date',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _date != null ? Colors.black : Colors.grey[400]),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey[200]!)),
                        child: Row(
                          children: [
                            Icon(Icons.person, size: 16, color: Colors.grey[500]),
                            const SizedBox(width: 4),
                            IconButton(icon: const Icon(Icons.remove, size: 16), onPressed: _passengers > 1 ? () => setState(() => _passengers--) : null, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                            Text('$_passengers', style: const TextStyle(fontWeight: FontWeight.w800)),
                            IconButton(icon: const Icon(Icons.add, size: 16), onPressed: _passengers < 8 ? () => setState(() => _passengers++) : null, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),
            const Text('Available Routes', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),

            // Routes
            if (_filteredRoutes.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Center(child: Text('No routes found', style: TextStyle(color: Colors.grey[400]))),
              )
            else
              ...List.generate(_filteredRoutes.length, (i) {
                final route = _filteredRoutes[i];
                final isSelected = _selectedRoute == route['id'];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GestureDetector(
                    onTap: () => setState(() { _selectedRoute = route['id']; _selectedTime = ''; }),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isSelected ? const Color(0xFFFBBF24) : Colors.grey[200]!, width: isSelected ? 2 : 1),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    Text(route['from'], style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                    const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 8),
                                      child: Icon(Icons.arrow_forward, size: 16, color: Color(0xFFFBBF24)),
                                    ),
                                    Text(route['to'], style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                  ],
                                ),
                              ),
                              Text(
                                '${RegionService.instance.currentCountry.currencySymbol} ${((route['fare'] as int) * _passengers)}',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.schedule, size: 14, color: Colors.grey[400]),
                              const SizedBox(width: 4),
                              Text(route['duration'], style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                              const SizedBox(width: 12),
                              Icon(Icons.place, size: 14, color: Colors.grey[400]),
                              const SizedBox(width: 4),
                              Text(route['distance'], style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                              const Spacer(),
                              Text('$_passengers seat${_passengers > 1 ? 's' : ''}', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                            ],
                          ),
                          // Departure times when selected
                          if (isSelected) ...[
                            const SizedBox(height: 12),
                            Container(height: 1, color: Colors.grey[200]),
                            const SizedBox(height: 12),
                            const Text('Choose departure:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              children: (route['departures'] as List).map<Widget>((t) {
                                final isTimeSel = _selectedTime == t;
                                return GestureDetector(
                                  onTap: () => setState(() => _selectedTime = t),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: isTimeSel ? const Color(0xFFFBBF24) : Colors.grey[100],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      t as String,
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: isTimeSel ? Colors.black : Colors.grey[700]),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }),

            // Book button
            if (_selectedRoute >= 0 && _selectedTime.isNotEmpty) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _date != null && !_isBooking ? _book : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isBooking
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Reserve Seat', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _confirmedView() {
    final route = _routes.firstWhere((r) => r['id'] == _selectedRoute);
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎉', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 16),
              const Text('Seat Reserved!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text('${route['from']} → ${route['to']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('$_selectedTime • $_passengers seat${_passengers > 1 ? 's' : ''}', style: TextStyle(color: Colors.grey[500])),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(14)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(color: Colors.grey)),
                    Text('${RegionService.instance.currentCountry.currencySymbol} ${((route['fare'] as int) * _passengers)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF16A34A))),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
