import 'package:flutter/material.dart';

class HotelQuickPricingScreen extends StatefulWidget {
  const HotelQuickPricingScreen({super.key});

  @override
  State<HotelQuickPricingScreen> createState() => _HotelQuickPricingScreenState();
}

class _HotelQuickPricingScreenState extends State<HotelQuickPricingScreen> {
  final _selectedRoom = 'Deluxe King Room';
  final Map<String, double> _prices = {};
  // ignore: unused_field
  DateTime? _bulkStart;
  // ignore: unused_field
  DateTime? _bulkEnd;
  final _bulkPriceController = TextEditingController();
  bool _isSaving = false;

  List<DateTime> get _next30Days {
    final today = DateTime.now();
    return List.generate(30, (i) => today.add(Duration(days: i)));
  }

  String _formatDate(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  String _dayName(DateTime d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday - 1];

  double _getPrice(DateTime d) => _prices[_formatDate(d)] ?? 450;
  bool _isWeekend(DateTime d) => d.weekday == 5 || d.weekday == 6;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text('Quick Pricing', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.grey.shade900)),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _isSaving ? null : () {
              final messenger = ScaffoldMessenger.of(context);
              setState(() => _isSaving = true);
              Future.delayed(const Duration(seconds: 1), () {
                if (mounted) {
                  setState(() => _isSaving = false);
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Prices saved!'), backgroundColor: Color(0xFF059669)),
                  );
                }
              });
            },
            child: _isSaving
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFE11D48)))
              : const Text('Save', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFE11D48))),
          ),
        ],
      ),
      body: Column(
        children: [
          // Room selector
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                Text('Room: ', style: TextStyle(fontSize: 13, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                  child: Text(_selectedRoom, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFFE11D48))),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: _showBulkDialog,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE11D48)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Bulk Update', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFFE11D48))),
                  ),
                ),
              ],
            ),
          ),

          // Pricing Grid
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _next30Days.length,
              itemBuilder: (context, index) {
                final date = _next30Days[index];
                final price = _getPrice(date);
                final isWeekend = _isWeekend(date);
                final isToday = index == 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isToday ? const Color(0xFFE11D48) : Colors.grey.shade100, width: isToday ? 2 : 1),
                  ),
                  child: Row(
                    children: [
                      // Date
                      SizedBox(
                        width: 80,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _dayName(date),
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                                color: isWeekend ? Colors.amber.shade700 : Colors.grey.shade500,
                              ),
                            ),
                            Text(
                              '${date.month}/${date.day}',
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900),
                            ),
                          ],
                        ),
                      ),

                      // Weekend Badge
                      if (isWeekend)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(4)),
                          child: Text('WE', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 9, color: Colors.amber.shade700)),
                        ),

                      const Spacer(),

                      // Price Input
                      SizedBox(
                        width: 100,
                        child: TextField(
                          controller: TextEditingController(text: price.toStringAsFixed(0)),
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.grey.shade900),
                          decoration: InputDecoration(
                            prefixText: 'AED ',
                            prefixStyle: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w600),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
                            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE11D48), width: 2)),
                            isDense: true,
                          ),
                          onChanged: (val) {
                            final parsed = double.tryParse(val);
                            if (parsed != null) {
                              setState(() => _prices[_formatDate(date)] = parsed);
                            }
                          },
                        ),
                      ),

                      const SizedBox(width: 8),

                      // Quick adjust buttons
                      Column(
                        children: [
                          GestureDetector(
                            onTap: () => setState(() => _prices[_formatDate(date)] = price + 50),
                            child: Container(
                              width: 28, height: 22,
                              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: const BorderRadius.vertical(top: Radius.circular(6))),
                              child: Icon(Icons.add, size: 14, color: Colors.grey.shade600),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _prices[_formatDate(date)] = (price - 50).clamp(0, 99999)),
                            child: Container(
                              width: 28, height: 22,
                              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: const BorderRadius.vertical(bottom: Radius.circular(6))),
                              child: Icon(Icons.remove, size: 14, color: Colors.grey.shade600),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showBulkDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 16, right: 16, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text('Bulk Price Update', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.grey.shade900)),
            const SizedBox(height: 16),
            TextField(
              controller: _bulkPriceController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Price (AED)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE11D48), width: 2)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  final price = double.tryParse(_bulkPriceController.text);
                  if (price != null) {
                    setState(() {
                      for (final d in _next30Days) {
                        _prices[_formatDate(d)] = price;
                      }
                    });
                  }
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE11D48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Apply to All 30 Days', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
