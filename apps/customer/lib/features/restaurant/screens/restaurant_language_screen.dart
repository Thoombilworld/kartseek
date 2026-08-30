import 'package:flutter/material.dart';

/// Restaurant — Language Selection Screen.
class RestaurantLanguageScreen extends StatefulWidget {
  const RestaurantLanguageScreen({super.key});
  @override
  State<RestaurantLanguageScreen> createState() => _RestaurantLanguageScreenState();
}

class _RestaurantLanguageScreenState extends State<RestaurantLanguageScreen> {
  static const _brandColor = Color(0xFFEA580C);
  int _selectedIndex = 0;

  final _languages = [
    {'name': 'English', 'native': 'English', 'flag': '🇬🇧'},
    {'name': 'Swahili', 'native': 'Kiswahili', 'flag': '🇰🇪'},
    {'name': 'Hindi', 'native': 'हिन्दी', 'flag': '🇮🇳'},
    {'name': 'Arabic', 'native': 'العربية', 'flag': '🇸🇦'},
    {'name': 'French', 'native': 'Français', 'flag': '🇫🇷'},
    {'name': 'Spanish', 'native': 'Español', 'flag': '🇪🇸'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Language', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _languages.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final l = _languages[i];
          final isSelected = i == _selectedIndex;
          return GestureDetector(
            onTap: () => setState(() => _selectedIndex = i),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isSelected ? _brandColor.withValues(alpha: 0.05) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade200, width: isSelected ? 2 : 1),
              ),
              child: Row(children: [
                Text(l['flag']!, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(l['name']!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  Text(l['native']!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                ])),
                if (isSelected) const Icon(Icons.check_circle, color: _brandColor, size: 22),
              ]),
            ),
          );
        },
      ),
    );
  }
}
