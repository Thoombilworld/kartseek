import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/utils/responsive.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';

/// Dine-in Table & Area Selection Screen.
/// Supports Mode A (customer selects) and Mode B (restaurant assigns).
class DineInTableSelectionScreen extends StatefulWidget {
  final Map<String, dynamic>? args;
  const DineInTableSelectionScreen({super.key, this.args});

  @override
  State<DineInTableSelectionScreen> createState() => _DineInTableSelectionScreenState();
}

class _DineInTableSelectionScreenState extends State<DineInTableSelectionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedAreaId;
  String? _selectedTableId;
  int _guestCount = 2;

  // Mock area data
  static const _areas = [
    {'id': 'a1', 'name': 'Main Hall', 'desc': 'Indoor • AC', 'emoji': '🏛️'},
    {'id': 'a2', 'name': 'Rooftop', 'desc': 'Outdoor • Open air', 'emoji': '🌇'},
    {'id': 'a3', 'name': 'Family Section', 'desc': 'Indoor • Private booths', 'emoji': '👨‍👩‍👧'},
    {'id': 'a4', 'name': 'Bar Area', 'desc': 'Indoor • 18+', 'emoji': '🍸'},
  ];

  static const _tables = {
    'a1': [
      {'id': 't1', 'num': 'T-01', 'cap': 2, 'status': 'available'},
      {'id': 't2', 'num': 'T-02', 'cap': 4, 'status': 'available'},
      {'id': 't3', 'num': 'T-03', 'cap': 4, 'status': 'occupied'},
      {'id': 't4', 'num': 'T-04', 'cap': 6, 'status': 'available'},
      {'id': 't5', 'num': 'T-05', 'cap': 2, 'status': 'reserved'},
      {'id': 't6', 'num': 'T-06', 'cap': 8, 'status': 'available'},
    ],
    'a2': [
      {'id': 't7', 'num': 'R-01', 'cap': 2, 'status': 'available'},
      {'id': 't8', 'num': 'R-02', 'cap': 4, 'status': 'available'},
      {'id': 't9', 'num': 'R-03', 'cap': 6, 'status': 'occupied'},
      {'id': 't10', 'num': 'R-04', 'cap': 4, 'status': 'available'},
    ],
    'a3': [
      {'id': 't11', 'num': 'F-01', 'cap': 6, 'status': 'available'},
      {'id': 't12', 'num': 'F-02', 'cap': 8, 'status': 'available'},
      {'id': 't13', 'num': 'F-03', 'cap': 10, 'status': 'occupied'},
    ],
    'a4': [
      {'id': 't14', 'num': 'B-01', 'cap': 2, 'status': 'available'},
      {'id': 't15', 'num': 'B-02', 'cap': 4, 'status': 'available'},
    ],
  };

  List<Map<String, dynamic>> get _currentTables {
    if (_selectedAreaId == null) return [];
    return (_tables[_selectedAreaId] ?? []).cast<Map<String, dynamic>>();
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Rebuild when tab changes so bottomNavigationBar shows/hides correctly
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _statusColor(String status) {
    return switch (status) {
      'available' => Colors.green.shade600,
      'occupied'  => Colors.red.shade500,
      'reserved'  => Colors.orange.shade600,
      _           => Colors.grey.shade400,
    };
  }

  Color _statusBg(String status) {
    return switch (status) {
      'available' => Colors.green.shade50,
      'occupied'  => Colors.red.shade50,
      'reserved'  => Colors.orange.shade50,
      _           => Colors.grey.shade100,
    };
  }

  @override
  Widget build(BuildContext context) {
    final canProceed = _selectedAreaId != null && _selectedTableId != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Select Your Table', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87)),
            Text('The Grand Biryani House', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.normal)),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.restaurantColor,
          unselectedLabelColor: Colors.grey.shade500,
          indicatorColor: AppTheme.restaurantColor,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: const [
            Tab(text: 'Select Table'),
            Tab(text: 'Restaurant Assigns'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildSelectTable(), _buildAutoAssign()],
      ),
      bottomNavigationBar: _tabController.index == 0 ? _buildConfirmBar(canProceed) : null,
    );
  }

  Widget _buildSelectTable() {
    return Column(
      children: [
        // Guest count
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: Row(
            children: [
              const Icon(Icons.people_outline, size: 20, color: Colors.black54),
              const SizedBox(width: 10),
              const Text('Guests', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const Spacer(),
              _CounterButton(
                onDecrement: () { if (_guestCount > 1) setState(() => _guestCount--); },
                onIncrement: () { if (_guestCount < 20) setState(() => _guestCount++); },
                value: _guestCount,
              ),
            ],
          ),
        ),
        Divider(color: Colors.grey.shade200, height: 1),

        // Area selector
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text('Choose Area', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.grey.shade600)),
          ),
        ),
        SizedBox(
          height: 90,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _areas.length,
            itemBuilder: (_, i) {
              final area = _areas[i];
              final selected = _selectedAreaId == area['id'];
              return GestureDetector(
                onTap: () => setState(() { _selectedAreaId = area['id'] as String; _selectedTableId = null; }),
                child: Container(
                  width: 110,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: selected ? AppTheme.restaurantColor : Colors.white,
                    border: Border.all(color: selected ? AppTheme.restaurantColor : Colors.grey.shade200, width: selected ? 2 : 1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text(area['emoji'] as String, style: const TextStyle(fontSize: 22)),
                    const SizedBox(height: 4),
                    Text(area['name'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: selected ? Colors.white : Colors.black87), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(area['desc'] as String, style: TextStyle(fontSize: 9, color: selected ? Colors.white70 : Colors.grey.shade500), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ]),
                ),
              );
            },
          ),
        ),

        // Table grid
        if (_selectedAreaId != null) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Available Tables', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.grey.shade600)),
                Row(children: [
                  _LegendDot(color: Colors.green.shade600, label: 'Free'),
                  const SizedBox(width: 10),
                  _LegendDot(color: Colors.red.shade500, label: 'Occupied'),
                  const SizedBox(width: 10),
                  _LegendDot(color: Colors.orange.shade600, label: 'Reserved'),
                ]),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: Responsive.value<int>(phone: 3, foldable: 4, tablet: 5), childAspectRatio: 1.05, crossAxisSpacing: 10, mainAxisSpacing: 10,
              ),
              itemCount: _currentTables.length,
              itemBuilder: (_, i) {
                final table = _currentTables[i];
                final status = table['status'] as String;
                final isAvailable = status == 'available';
                final isSelected = _selectedTableId == table['id'];
                final cap = table['cap'] as int;
                final fits = cap >= _guestCount;

                return GestureDetector(
                  onTap: (isAvailable && fits) ? () => setState(() => _selectedTableId = table['id'] as String) : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.restaurantColor : _statusBg(status),
                      border: Border.all(
                        color: isSelected ? AppTheme.restaurantColor : (isAvailable && fits ? Colors.grey.shade300 : Colors.grey.shade200),
                        width: isSelected ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.table_restaurant, size: 26, color: isSelected ? Colors.white : _statusColor(status)),
                      const SizedBox(height: 4),
                      Text(table['num'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: isSelected ? Colors.white : Colors.black87)),
                      Text('$cap seats', style: TextStyle(fontSize: 9, color: isSelected ? Colors.white70 : Colors.grey.shade500)),
                      if (!fits && isAvailable)
                        Text('Too small', style: TextStyle(fontSize: 8, color: Colors.orange.shade700, fontWeight: FontWeight.w700))
                      else
                        Text(status[0].toUpperCase() + status.substring(1), style: TextStyle(fontSize: 9, color: isSelected ? Colors.white70 : _statusColor(status), fontWeight: FontWeight.w600)),
                    ]),
                  ),
                );
              },
            ),
          ),
        ] else
          Expanded(
            child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.table_restaurant, size: 64, color: Colors.grey.shade300),
              const SizedBox(height: 12),
              Text('Select an area first', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
            ])),
          ),
      ],
    );
  }

  Widget _buildAutoAssign() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(Icons.check_circle, color: Colors.green.shade700, size: 24),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Restaurant Will Assign Your Table', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.green.shade800)),
                const SizedBox(height: 6),
                Text('Place your dine-in order and the restaurant will assign the best available table for you. Your table number will appear once the order is accepted.', style: TextStyle(fontSize: 13, color: Colors.green.shade700, height: 1.5)),
              ])),
            ]),
          ),
          const SizedBox(height: 20),
          const _AutoAssignInfoTile(icon: Icons.timer_outlined, title: 'Average Wait', subtitle: '5–10 min for table assignment'),
          const _AutoAssignInfoTile(icon: Icons.people_outline, title: 'Guests', subtitle: 'Please arrive with the correct number of guests'),
          const _AutoAssignInfoTile(icon: Icons.notifications_outlined, title: 'Notification', subtitle: 'You\'ll receive a push notification with your table number'),
          const _AutoAssignInfoTile(icon: Icons.restaurant_menu, title: 'Order First', subtitle: 'You can browse menu and place order before table assignment'),
          const Spacer(),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, AppRouter.dineInCheckout, arguments: {
              'tableMode': 'auto_assign',
              'guests': _guestCount,
            }),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.restaurantColor,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: const Text('Continue Without Table Selection', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmBar(bool canProceed) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (canProceed)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.green.shade200)),
                child: Row(children: [
                  Icon(Icons.check_circle, size: 16, color: Colors.green.shade700),
                  const SizedBox(width: 8),
                  Flexible(child: Text(
                    'Table ${(_currentTables.firstWhere((t) => t['id'] == _selectedTableId, orElse: () => {'num': ''})['num'])} • $_guestCount guests',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.green.shade800),
                  )),
                ]),
              ),
            ElevatedButton(
              onPressed: canProceed
                  ? () => Navigator.pushNamed(context, AppRouter.dineInCheckout, arguments: {
                        'areaId': _selectedAreaId,
                        'tableId': _selectedTableId,
                        'tableNum': _currentTables.firstWhere((t) => t['id'] == _selectedTableId, orElse: () => {'num': ''})['num'],
                        'guests': _guestCount,
                        'tableMode': 'customer_selects',
                      })
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.restaurantColor,
                disabledBackgroundColor: Colors.grey.shade300,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: Text(
                canProceed ? 'Confirm Table & Continue' : 'Select an area and table',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}

class _CounterButton extends StatelessWidget {
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final int value;
  const _CounterButton({required this.onDecrement, required this.onIncrement, required this.value});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(10)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        GestureDetector(onTap: onDecrement, child: const Padding(padding: EdgeInsets.all(10), child: Icon(Icons.remove, size: 16))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('$value', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
        GestureDetector(onTap: onIncrement, child: const Padding(padding: EdgeInsets.all(10), child: Icon(Icons.add, size: 16))),
      ]),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      DecoratedBox(decoration: BoxDecoration(color: color, shape: BoxShape.circle), child: const SizedBox(width: 8, height: 8)),
      const SizedBox(width: 3),
      Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600)),
    ]);
  }
}

class _AutoAssignInfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _AutoAssignInfoTile({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: AppTheme.restaurantColor),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        ])),
      ]),
    );
  }
}
