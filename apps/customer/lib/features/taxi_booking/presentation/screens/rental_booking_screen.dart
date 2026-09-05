import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Car rental booking screen — rent a car for days/weeks with optional driver.
class RentalBookingScreen extends StatefulWidget {
  const RentalBookingScreen({super.key});

  @override
  State<RentalBookingScreen> createState() => _RentalBookingScreenState();
}

class _RentalBookingScreenState extends State<RentalBookingScreen> {
  int _selectedCar = -1;
  bool _withDriver = false;
  int _days = 1;
  DateTime? _startDate;
  bool _isBooking = false;
  bool _booked = false;

  final List<Map<String, dynamic>> _cars = [
    {'name': 'Toyota Fielder', 'type': 'Economy', 'seats': 5, 'rate': 3500, 'icon': Icons.directions_car, 'features': ['AC', 'Fuel included']},
    {'name': 'Toyota Prado', 'type': 'SUV', 'seats': 7, 'rate': 7500, 'icon': Icons.directions_car_filled, 'features': ['AC', '4WD', 'Leather']},
    {'name': 'Mercedes C-Class', 'type': 'Premium', 'seats': 4, 'rate': 12000, 'icon': Icons.local_taxi, 'features': ['AC', 'Luxury', 'Driver incl.']},
    {'name': 'Toyota HiAce', 'type': 'Van', 'seats': 14, 'rate': 9000, 'icon': Icons.airport_shuttle, 'features': ['AC', 'Large luggage']},
  ];

  int get _totalCost {
    if (_selectedCar < 0) return 0;
    return (_cars[_selectedCar]['rate'] as int) * _days + (_withDriver ? 1500 * _days : 0);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _book() async {
    if (_selectedCar < 0 || _startDate == null) return;
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
        title: const Text('Car Rentals', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 20)),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date & Days row
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: _pickDate,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey[200]!)),
                      child: Row(
                        children: [
                          Icon(Icons.calendar_today, size: 18, color: Colors.grey[500]),
                          const SizedBox(width: 8),
                          Text(
                            _startDate != null ? '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}' : 'Start date',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _startDate != null ? Colors.black : Colors.grey[400]),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey[200]!)),
                  child: Row(
                    children: [
                      IconButton(icon: const Icon(Icons.remove, size: 18), onPressed: _days > 1 ? () => setState(() => _days--) : null, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text('$_days day${_days > 1 ? 's' : ''}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                      ),
                      IconButton(icon: const Icon(Icons.add, size: 18), onPressed: () => setState(() => _days++), padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Driver toggle
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey[200]!)),
              child: Row(
                children: [
                  const Icon(Icons.person, size: 20, color: Color(0xFFD97706)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Include driver', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        Text('+${RegionService.instance.currentCountry.currencySymbol} 1,500/day', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                  Switch(
                    value: _withDriver,
                    onChanged: (v) => setState(() => _withDriver = v),
                    activeThumbColor: const Color(0xFFD97706),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Car Grid
            const Text('Choose a car', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            ...List.generate(_cars.length, (i) {
              final car = _cars[i];
              final isSelected = _selectedCar == i;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GestureDetector(
                  onTap: () => setState(() => _selectedCar = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isSelected ? const Color(0xFFD97706) : Colors.grey[200]!, width: isSelected ? 2 : 1),
                      boxShadow: isSelected ? [BoxShadow(color: const Color(0xFFD97706).withValues(alpha: 0.08), blurRadius: 12)] : null,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48, height: 48,
                          decoration: BoxDecoration(color: isSelected ? const Color(0xFFFFF7ED) : Colors.grey[100], borderRadius: BorderRadius.circular(12)),
                          child: Icon(car['icon'] as IconData, size: 24, color: isSelected ? const Color(0xFFD97706) : Colors.grey[600]),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(car['name'], style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(4)),
                                    child: Text(car['type'], style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey[600])),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('👥 ${car['seats']} seats • ${(car['features'] as List).join(' • ')}',
                                  style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('${RegionService.instance.currentCountry.currencySymbol} ${(car['rate'] as int).toString()}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                            Text('/day', style: TextStyle(fontSize: 10, color: Colors.grey[400])),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 20),

            // Total + Book
            if (_selectedCar >= 0) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(14)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(fontSize: 14, color: Colors.grey)),
                    Text('${RegionService.instance.currentCountry.currencySymbol} ${_totalCost.toString()}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF16A34A))),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _startDate != null && !_isBooking ? _book : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isBooking
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Book Rental', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _confirmedView() {
    final car = _cars[_selectedCar];
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
              const Text('Rental Confirmed!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text('${car['name']} for $_days day${_days > 1 ? 's' : ''}', style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(14)),
                child: Column(
                  children: [
                    _infoRow('Total', '${RegionService.instance.currentCountry.currencySymbol} $_totalCost'),
                    _infoRow('Driver', _withDriver ? 'Included' : 'Self-drive'),
                    _infoRow('Starts', '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'),
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

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[500])),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
