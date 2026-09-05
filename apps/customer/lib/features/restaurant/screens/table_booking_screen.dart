import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';

class TableBookingScreen extends StatefulWidget {
  const TableBookingScreen({super.key});

  @override
  State<TableBookingScreen> createState() => _TableBookingScreenState();
}

class _TableBookingScreenState extends State<TableBookingScreen> {
  int selectedDateIndex = 0;
  int selectedTimeIndex = 3;
  int selectedGuests = 2;
  bool _preOrderItems = false;
  final Map<String, int> _preOrderCart = {};

  static final _prices = {
    'Chicken Biryani': 299,
    'Paneer Butter Masala': 249,
    'Butter Naan': 49,
    'Gulab Jamun': 79
  };
  static final _images = {
    'Chicken Biryani':
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=400&auto=format&fit=crop',
    'Paneer Butter Masala':
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'Butter Naan':
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80',
    'Gulab Jamun':
        'https://images.unsplash.com/photo-1605197788044-b6f5d47a41b8?w=400&q=80',
  };

  final List<String> times = [
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
    '20:30',
    '21:00',
    '21:30'
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Book a Table',
                style: TextStyle(
                    color: Colors.black87,
                    fontSize: 18,
                    fontWeight: FontWeight.bold)),
            Text('The Grand Biryani House',
                style: TextStyle(color: Colors.grey[600], fontSize: 12)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionCard(
                    title: 'Select Date',
                    icon: Icons.calendar_month,
                    child: _buildDateSelector(),
                  ),
                  const SizedBox(height: 16),
                  _buildSectionCard(
                    title: 'Select Time',
                    icon: Icons.access_time_filled,
                    child: _buildTimeSelector(),
                  ),
                  const SizedBox(height: 16),
                  _buildSectionCard(
                    title: 'Number of Guests',
                    icon: Icons.group,
                    child: _buildGuestSelector(),
                  ),
                  const SizedBox(height: 16),
                  _buildSectionCard(
                    title: 'Pre-order Food (Optional)',
                    icon: Icons.restaurant_menu,
                    child: _buildPreOrderSection(),
                  ),
                  const SizedBox(height: 16),
                  _buildSectionCard(
                    title: 'Special Requests (Optional)',
                    icon: Icons.note_alt,
                    child: _buildSpecialRequests(),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          _buildConfirmButton(),
        ],
      ),
    );
  }

  Widget _buildSectionCard(
      {required String title, required IconData icon, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.orange[600], size: 20),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87)),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildDateSelector() {
    return SizedBox(
      height: 90,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: 5,
        itemBuilder: (context, index) {
          final bool isSelected = selectedDateIndex == index;
          final DateTime date = DateTime.now().add(Duration(days: index));
          final List<String> days = [
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun'
          ];
          final List<String> months = [
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

          return GestureDetector(
            onTap: () => setState(() => selectedDateIndex = index),
            child: Container(
              width: 70,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: isSelected ? Colors.orange[50] : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: isSelected ? Colors.orange[600]! : Colors.grey[300]!,
                    width: isSelected ? 2 : 1),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(days[date.weekday - 1],
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? Colors.orange[600]
                              : Colors.grey[600])),
                  const SizedBox(height: 4),
                  Text('${date.day}',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: isSelected
                              ? Colors.orange[800]
                              : Colors.black87)),
                  Text(months[date.month - 1],
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? Colors.orange[600]
                              : Colors.grey[500])),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTimeSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: List.generate(times.length, (index) {
        final bool isSelected = selectedTimeIndex == index;
        return GestureDetector(
          onTap: () => setState(() => selectedTimeIndex = index),
          child: Container(
            width: (MediaQuery.of(context).size.width - 92) / 3, // 3 columns
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: isSelected ? Colors.orange[600] : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: isSelected ? Colors.orange[600]! : Colors.grey[300]!),
            ),
            child: Center(
              child: Text(
                times[index],
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : Colors.black87,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildGuestSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: List.generate(8, (index) {
        final int num = index + 1;
        final bool isSelected = selectedGuests == num;
        return GestureDetector(
          onTap: () => setState(() => selectedGuests = num),
          child: Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: isSelected ? Colors.orange[600] : Colors.white,
              shape: BoxShape.circle,
              border: Border.all(
                  color: isSelected ? Colors.orange[600]! : Colors.grey[300]!),
            ),
            child: Center(
              child: Text(
                '$num',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : Colors.black87,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildPreOrderSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Material(
          color: Colors.transparent,
          child: SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Add items from menu',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            subtitle: const Text('Have your food ready right when you arrive',
                style: TextStyle(fontSize: 12, color: Colors.black54)),
            activeThumbColor: Colors.orange[600],
            value: _preOrderItems,
            onChanged: (val) => setState(() => _preOrderItems = val),
          ),
        ),
        if (_preOrderItems) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8)),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Your pre-order will begin preparation 30 minutes before your table reservation at ${times[selectedTimeIndex]}. It will be fresh and hot when you arrive!',
                    style: TextStyle(
                        fontSize: 12, color: Colors.blue.shade900, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ..._prices.keys.map(_miniMenuItem),
        ]
      ],
    );
  }

  Widget _miniMenuItem(String name) {
    final int qty = _preOrderCart[name] ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          KartseekImage(
              url: _images[name]!,
              width: 56,
              height: 56,
              fit: BoxFit.cover,
              borderRadius: BorderRadius.circular(8)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(name,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                    '${RegionService.instance.currentCountry.currencySymbol} ${_prices[name]}',
                    style: TextStyle(
                        color: Colors.grey[700],
                        fontWeight: FontWeight.w600,
                        fontSize: 13)),
              ])),
          qty == 0
              ? SizedBox(
                  height: 32,
                  child: OutlinedButton(
                    onPressed: () => setState(() => _preOrderCart[name] = 1),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange[600],
                      side: BorderSide(color: Colors.orange[600]!),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: const Text('ADD',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                )
              : Container(
                  height: 32,
                  decoration: BoxDecoration(
                      color: Colors.orange[50],
                      borderRadius: BorderRadius.circular(16)),
                  child: Row(children: [
                    IconButton(
                        icon: const Icon(Icons.remove,
                            size: 16, color: Colors.orange),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 32),
                        onPressed: () => setState(() {
                              if (qty > 1) {
                                _preOrderCart[name] = qty - 1;
                              } else {
                                _preOrderCart.remove(name);
                              }
                            })),
                    Text('$qty',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    IconButton(
                        icon: const Icon(Icons.add,
                            size: 16, color: Colors.orange),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 32),
                        onPressed: () =>
                            setState(() => _preOrderCart[name] = qty + 1)),
                  ]),
                ),
        ],
      ),
    );
  }

  Widget _buildSpecialRequests() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: const TextField(
        maxLines: 3,
        decoration: InputDecoration(
          hintText:
              'E.g., Window seat, high chair needed, celebrating an anniversary...',
          hintStyle: TextStyle(fontSize: 14, color: Colors.black38),
          border: InputBorder.none,
          contentPadding: EdgeInsets.all(16),
        ),
      ),
    );
  }

  Widget _buildConfirmButton() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -5)),
        ],
      ),
      child: SafeArea(
        child: ElevatedButton(
          onPressed: () {
            final snackbarMessage = _preOrderItems && _preOrderCart.isNotEmpty
                ? '🎉 Table booked! Food prep starts 30 mins before ${times[selectedTimeIndex]}.'
                : '🎉 Table booked successfully!';
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(snackbarMessage,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                backgroundColor: const Color(0xFFEA580C),
                duration: const Duration(seconds: 4),
              ),
            );
            Future.delayed(const Duration(seconds: 1), () {
              if (mounted) Navigator.pop(context);
            });
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange[600],
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
            minimumSize: const Size(double.infinity, 54),
          ),
          child: const Text(
            'Confirm Table Booking',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}
