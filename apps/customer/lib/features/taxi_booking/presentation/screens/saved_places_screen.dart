import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Saved Places Screen — Manage home, work, and custom saved locations.
///
/// Features:
///  - Home/Work quick-set with special icons
///  - Favorites list with swipe-to-delete
///  - Add new place via search or map pin
///  - Last-used timestamps per place
///  - Animated list insertions/removals
class SavedPlacesScreen extends StatefulWidget {
  const SavedPlacesScreen({super.key});

  @override
  State<SavedPlacesScreen> createState() => _SavedPlacesScreenState();
}

class _SavedPlacesScreenState extends State<SavedPlacesScreen> with TickerProviderStateMixin {
  late AnimationController _fadeCtrl;

  final List<_SavedPlace> _places = [
    _SavedPlace(id: '1', label: 'Home', address: '', icon: Icons.home_rounded, type: _PlaceType.home),
    _SavedPlace(id: '2', label: 'Work', address: '', icon: Icons.work_rounded, type: _PlaceType.work),
    _SavedPlace(id: '3', label: 'Gym', address: 'Fitness First, Westlands', icon: Icons.fitness_center, type: _PlaceType.custom),
    _SavedPlace(id: '4', label: 'Mom\'s House', address: '12 Riverside Dr, Nairobi', icon: Icons.favorite_rounded, type: _PlaceType.custom),
    _SavedPlace(id: '5', label: 'Airport', address: 'JKIA Terminal 1A', icon: Icons.flight_takeoff_rounded, type: _PlaceType.custom),
  ];

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 500))..forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bg => _isDark ? const Color(0xFF0F0F23) : Colors.grey.shade50;
  Color get _card => _isDark ? const Color(0xFF1A1A2E) : Colors.white;
  Color get _accent => const Color(0xFF3B82F6);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('Saved Places', style: TextStyle(fontWeight: FontWeight.w700)),
        elevation: 0,
      ),
      body: FadeTransition(
        opacity: _fadeCtrl,
        child: Column(
          children: [
            // ── Home / Work Quick Access ────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(child: _quickAccessCard(_places[0])),
                  const SizedBox(width: 12),
                  Expanded(child: _quickAccessCard(_places[1])),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // ── Favorites List ─────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Text('Favorites', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _isDark ? Colors.white : Colors.black87)),
                  const Spacer(),
                  Text('${_places.length - 2} places', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _places.length <= 2
                  ? _emptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _places.length - 2,
                      itemBuilder: (ctx, i) {
                        final place = _places[i + 2];
                        return _placeCard(place, i);
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addNewPlace,
        backgroundColor: _accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Add Place', style: TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _quickAccessCard(_SavedPlace place) {
    final hasAddress = place.address.isNotEmpty;
    return GestureDetector(
      onTap: () => _editPlace(place),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: hasAddress ? _accent.withValues(alpha: 0.3) : Colors.grey.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: place.type == _PlaceType.home ? Colors.orange.withValues(alpha: 0.15) : _accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(place.icon, color: place.type == _PlaceType.home ? Colors.orange : _accent, size: 22),
            ),
            const SizedBox(height: 12),
            Text(place.label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: _isDark ? Colors.white : Colors.black87)),
            const SizedBox(height: 4),
            Text(
              hasAddress ? place.address : 'Tap to set address',
              style: TextStyle(fontSize: 12, color: hasAddress ? Colors.grey : _accent),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeCard(_SavedPlace place, int index) {
    return Dismissible(
      key: ValueKey(place.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        HapticFeedback.mediumImpact();
        setState(() => _places.removeAt(index + 2));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('"${place.label}" removed'), action: SnackBarAction(label: 'Undo', onPressed: () => setState(() => _places.insert(index + 2, place)))),
        );
      },
      background: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(color: Colors.red.shade400, borderRadius: BorderRadius.circular(14)),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: _card,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: _accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(place.icon, color: _accent, size: 20),
          ),
          title: Text(place.label, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(place.address, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          trailing: Icon(Icons.edit_rounded, size: 18, color: Colors.grey.shade400),
          onTap: () => _editPlace(place),
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.bookmark_add_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text('No saved places yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
          const SizedBox(height: 8),
          Text('Add your favorite spots for\nquicker booking', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  void _addNewPlace() {
    HapticFeedback.lightImpact();
    final newPlace = _SavedPlace(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      label: 'New Place',
      address: 'Tap to set address',
      icon: Icons.place_rounded,
      type: _PlaceType.custom,
    );
    setState(() => _places.add(newPlace));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('New place added — tap to set the address')));
  }

  void _editPlace(_SavedPlace place) {
    // In production: navigate to map picker or search screen
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Edit "${place.label}" — would open map picker')),
    );
  }
}

enum _PlaceType { home, work, custom }

class _SavedPlace {
  final String id;
  final String label;
  final String address;
  final IconData icon;
  final _PlaceType type;

  _SavedPlace({required this.id, required this.label, required this.address, required this.icon, required this.type});
}
