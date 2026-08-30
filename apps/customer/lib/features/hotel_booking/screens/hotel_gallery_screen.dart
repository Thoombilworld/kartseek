import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Hotel Gallery Screen — Full-screen swipeable photo gallery.
///
/// Features:
///   • Category tabs: All, Rooms, Lobby, Restaurant, Pool, Exterior
///   • Grid view with tap-to-fullscreen
///   • PageView for swipe navigation
///   • Photo counter overlay
class HotelGalleryScreen extends StatefulWidget {
  final String hotelId;
  final String hotelName;
  final int initialIndex;

  const HotelGalleryScreen({
    super.key,
    required this.hotelId,
    this.hotelName = 'Hotel',
    this.initialIndex = 0,
  });

  @override
  State<HotelGalleryScreen> createState() => _HotelGalleryScreenState();
}

class _HotelGalleryScreenState extends State<HotelGalleryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  int _selectedCategory = 0;
  bool _isFullScreen = false;
  int _fullScreenIndex = 0;

  static const _color = AppTheme.hotelColor;

  static const _categories = ['All', 'Rooms', 'Lobby', 'Restaurant', 'Pool', 'Exterior'];

  // Demo photo data with categories
  static const _photos = [
    {'emoji': '🛏️', 'label': 'Deluxe Suite', 'category': 'Rooms', 'gradient': [Color(0xFFE0F2FE), Color(0xFFBAE6FD)]},
    {'emoji': '🛋️', 'label': 'Premium Room', 'category': 'Rooms', 'gradient': [Color(0xFFF0F9FF), Color(0xFFE0F2FE)]},
    {'emoji': '🏛️', 'label': 'Grand Lobby', 'category': 'Lobby', 'gradient': [Color(0xFFFEF3C7), Color(0xFFFDE68A)]},
    {'emoji': '🍽️', 'label': 'Fine Dining', 'category': 'Restaurant', 'gradient': [Color(0xFFFCE7F3), Color(0xFFFBCFE8)]},
    {'emoji': '🍳', 'label': 'Breakfast Hall', 'category': 'Restaurant', 'gradient': [Color(0xFFFFF7ED), Color(0xFFFED7AA)]},
    {'emoji': '🏊', 'label': 'Infinity Pool', 'category': 'Pool', 'gradient': [Color(0xFFCFFAFE), Color(0xFFA5F3FC)]},
    {'emoji': '🌊', 'label': 'Pool Terrace', 'category': 'Pool', 'gradient': [Color(0xFFE0F2FE), Color(0xFF7DD3FC)]},
    {'emoji': '🏨', 'label': 'Hotel Front', 'category': 'Exterior', 'gradient': [Color(0xFFEDE9FE), Color(0xFFDDD6FE)]},
    {'emoji': '🌅', 'label': 'Sunset View', 'category': 'Exterior', 'gradient': [Color(0xFFFFF1F2), Color(0xFFFFE4E6)]},
    {'emoji': '🛁', 'label': 'Luxury Bathroom', 'category': 'Rooms', 'gradient': [Color(0xFFF0FDF4), Color(0xFFDCFCE7)]},
    {'emoji': '🧖', 'label': 'Spa Area', 'category': 'Pool', 'gradient': [Color(0xFFF5F3FF), Color(0xFFEDE9FE)]},
    {'emoji': '🌳', 'label': 'Garden View', 'category': 'Exterior', 'gradient': [Color(0xFFF0FDF4), Color(0xFFBBF7D0)]},
  ];

  List<Map<String, dynamic>> get _filteredPhotos {
    if (_selectedCategory == 0) return _photos;
    return _photos.where((p) => p['category'] == _categories[_selectedCategory]).toList();
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categories.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _selectedCategory = _tabController.index);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isFullScreen) return _buildFullScreen();
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: Text('${widget.hotelName} Gallery', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: _color,
          unselectedLabelColor: const Color(0xFF94A3B8),
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          indicatorColor: _color,
          indicatorWeight: 3,
          tabAlignment: TabAlignment.start,
          tabs: _categories.map((c) => Tab(text: c)).toList(),
        ),
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(12),
        physics: const BouncingScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.0,
        ),
        itemCount: _filteredPhotos.length,
        itemBuilder: (_, i) => _buildPhotoCard(_filteredPhotos[i], i),
      ),
    );
  }

  Widget _buildPhotoCard(Map<String, dynamic> photo, int index) {
    final gradientColors = photo['gradient'];
    final gradient = gradientColors is List<Color> ? gradientColors : [Colors.grey.shade200, Colors.grey.shade300];
    final imageUrl = photo['imageUrl']?.toString();
    final emoji = (photo['emoji'] ?? '📷').toString();
    final label = (photo['label'] ?? '').toString();
    final category = (photo['category'] ?? '').toString();

    return GestureDetector(
      onTap: () => setState(() { _isFullScreen = true; _fullScreenIndex = index; }),
      child: Container(
        decoration: BoxDecoration(
          gradient: imageUrl == null ? LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight) : null,
          color: imageUrl != null ? Colors.grey.shade100 : null,
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(children: [
          if (imageUrl != null)
            Positioned.fill(child: CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => Container(
                decoration: BoxDecoration(gradient: LinearGradient(colors: gradient)),
                child: Center(child: Text(emoji, style: const TextStyle(fontSize: 56))),
              ),
              placeholder: (_, __) => Container(
                decoration: BoxDecoration(gradient: LinearGradient(colors: gradient)),
                child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
            ))
          else
            Center(child: Text(emoji, style: const TextStyle(fontSize: 56))),
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black.withValues(alpha: 0.5)]),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
                Text(category, style: const TextStyle(fontSize: 10, color: Colors.white70)),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _buildFullScreen() {
    final photos = _filteredPhotos;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            itemCount: photos.length,
            controller: PageController(initialPage: _fullScreenIndex),
            onPageChanged: (i) => setState(() => _fullScreenIndex = i),
            itemBuilder: (_, i) {
              final photo = photos[i];
              final gradientColors = photo['gradient'];
              final gradient = gradientColors is List<Color> ? gradientColors : [Colors.grey.shade800, Colors.grey.shade900];
              final imageUrl = photo['imageUrl']?.toString();
              final emoji = (photo['emoji'] ?? '📷').toString();

              if (imageUrl != null) {
                return CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.contain,
                  errorWidget: (_, __, ___) => Container(
                    decoration: BoxDecoration(gradient: LinearGradient(colors: gradient)),
                    child: Center(child: Text(emoji, style: const TextStyle(fontSize: 120))),
                  ),
                );
              }
              return Container(
                decoration: BoxDecoration(gradient: LinearGradient(colors: gradient)),
                child: Center(child: Text(emoji, style: const TextStyle(fontSize: 120))),
              );
            },
          ),
          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => setState(() => _isFullScreen = false),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.close, color: Colors.white, size: 22),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(20)),
                    child: Text('${_fullScreenIndex + 1} / ${photos.length}', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          ),
          // Bottom label
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black.withValues(alpha: 0.7)])),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text((photos[_fullScreenIndex]['label'] ?? '').toString(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                  Text((photos[_fullScreenIndex]['category'] ?? '').toString(), style: const TextStyle(fontSize: 14, color: Colors.white60)),
                ]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
