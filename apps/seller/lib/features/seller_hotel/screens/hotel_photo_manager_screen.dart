import 'package:flutter/material.dart';

class HotelPhotoManagerScreen extends StatefulWidget {
  const HotelPhotoManagerScreen({super.key});

  @override
  State<HotelPhotoManagerScreen> createState() =>
      _HotelPhotoManagerScreenState();
}

class _HotelPhotoManagerScreenState extends State<HotelPhotoManagerScreen> {
  final List<Map<String, dynamic>> _photos = [
    {
      'id': 'p1',
      'category': 'Exterior',
      'caption': 'Hotel entrance at sunset',
      'emoji': '🏰',
      'isPrimary': true,
      'uploadedAt': '2026-06-01'
    },
    {
      'id': 'p2',
      'category': 'Lobby',
      'caption': 'Grand lobby with chandelier',
      'emoji': '🛋️',
      'isPrimary': false,
      'uploadedAt': '2026-06-01'
    },
    {
      'id': 'p3',
      'category': 'Rooms',
      'caption': 'Deluxe King Room',
      'emoji': '🛏️',
      'isPrimary': false,
      'uploadedAt': '2026-06-02'
    },
    {
      'id': 'p4',
      'category': 'Rooms',
      'caption': 'Executive Suite living area',
      'emoji': '🪑',
      'isPrimary': false,
      'uploadedAt': '2026-06-02'
    },
    {
      'id': 'p5',
      'category': 'Pool',
      'caption': 'Infinity pool overlooking the city',
      'emoji': '🏊',
      'isPrimary': false,
      'uploadedAt': '2026-06-03'
    },
    {
      'id': 'p6',
      'category': 'Restaurant',
      'caption': 'Fine dining restaurant',
      'emoji': '🍽️',
      'isPrimary': false,
      'uploadedAt': '2026-06-03'
    },
    {
      'id': 'p7',
      'category': 'Spa',
      'caption': 'Relaxation lounge',
      'emoji': '💆',
      'isPrimary': false,
      'uploadedAt': '2026-06-04'
    },
    {
      'id': 'p8',
      'category': 'Bathroom',
      'caption': 'Marble bathroom with rain shower',
      'emoji': '🚿',
      'isPrimary': false,
      'uploadedAt': '2026-06-04'
    },
  ];

  String _selectedCategory = 'All';
  final List<String> _categories = [
    'All',
    'Exterior',
    'Lobby',
    'Rooms',
    'Pool',
    'Restaurant',
    'Spa',
    'Bathroom',
    'Gym',
    'Other'
  ];

  List<Map<String, dynamic>> get _filteredPhotos {
    if (_selectedCategory == 'All') return _photos;
    return _photos.where((p) => p['category'] == _selectedCategory).toList();
  }

  void _deletePhoto(int index) {
    setState(() {
      _photos.removeAt(index);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Photo deleted'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: const Color(0xFF0F172A),
      ),
    );
  }

  void _setPrimary(String id) {
    setState(() {
      for (final p in _photos) {
        p['isPrimary'] = p['id'] == id;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Cover photo updated'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  void _showUploadSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Upload Photos',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.camera_alt, color: Color(0xFF2563EB)),
              ),
              title: const Text('Take Photo',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Use camera to take a new photo'),
              onTap: () => Navigator.pop(ctx),
            ),
            ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(14),
                ),
                child:
                    const Icon(Icons.photo_library, color: Color(0xFF059669)),
              ),
              title: const Text('Choose from Gallery',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Select photos from your gallery'),
              onTap: () => Navigator.pop(ctx),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Photo Manager',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_photos.length} photos',
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF64748B)),
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showUploadSheet,
        backgroundColor: const Color(0xFFE11D48),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_a_photo),
        label:
            const Text('Upload', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          // Category Filter
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategory == cat;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategory = cat),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFFE11D48)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Grid
          Expanded(
            child: _filteredPhotos.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('📷', style: TextStyle(fontSize: 48)),
                        SizedBox(height: 12),
                        Text('No photos in this category',
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF64748B))),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.85,
                    ),
                    itemCount: _filteredPhotos.length,
                    itemBuilder: (context, index) {
                      final photo = _filteredPhotos[index];
                      return _buildPhotoCard(photo);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoCard(Map<String, dynamic> photo) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image placeholder
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFFFF1F2), Color(0xFFFEF3C7)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Text(photo['emoji'],
                        style: const TextStyle(fontSize: 40)),
                  ),
                  if (photo['isPrimary'])
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('COVER',
                            style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: Colors.white)),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'primary') _setPrimary(photo['id']);
                        if (value == 'delete') {
                          _deletePhoto(_photos.indexOf(photo));
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                            value: 'primary', child: Text('Set as Cover')),
                        const PopupMenuItem(
                            value: 'edit', child: Text('Edit Caption')),
                        const PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete',
                                style: TextStyle(color: Colors.red))),
                      ],
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.more_horiz,
                            size: 16, color: Color(0xFF64748B)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Caption
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(photo['caption'],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(photo['category'],
                    style: const TextStyle(
                        fontSize: 10, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
