import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Language Selection Screen.
class GroceryLanguageScreen extends StatefulWidget {
  const GroceryLanguageScreen({super.key});
  @override
  State<GroceryLanguageScreen> createState() => _GroceryLanguageScreenState();
}

class _GroceryLanguageScreenState extends State<GroceryLanguageScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  String _selected = 'en';

  static const _languages = [
    {'code': 'en', 'name': 'English', 'native': 'English', 'flag': '🇺🇸'},
    {'code': 'hi', 'name': 'Hindi', 'native': 'हिन्दी', 'flag': '🇮🇳'},
    {'code': 'ar', 'name': 'Arabic', 'native': 'العربية', 'flag': '🇦🇪'},
    {'code': 'ta', 'name': 'Tamil', 'native': 'தமிழ்', 'flag': '🇮🇳'},
    {'code': 'te', 'name': 'Telugu', 'native': 'తెలుగు', 'flag': '🇮🇳'},
    {'code': 'kn', 'name': 'Kannada', 'native': 'ಕನ್ನಡ', 'flag': '🇮🇳'},
    {'code': 'ml', 'name': 'Malayalam', 'native': 'മലയാളം', 'flag': '🇮🇳'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Language', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(14),
            itemCount: _languages.length,
            itemBuilder: (context, i) {
              final lang = _languages[i];
              final isActive = _selected == lang['code'];
              return GestureDetector(
                onTap: () => setState(() => _selected = lang['code'] as String),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isActive ? _groceryColor : Colors.grey.shade200, width: isActive ? 2 : 1),
                  ),
                  child: Row(children: [
                    Text(lang['flag'] as String, style: const TextStyle(fontSize: 24)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(lang['name'] as String, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: isActive ? _groceryColor : Colors.grey.shade800)),
                      Text(lang['native'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ])),
                    if (isActive) const Icon(Icons.check_circle, color: _groceryColor, size: 22),
                  ]),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))]),
          child: SafeArea(top: false, child: SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
            child: const Text('Apply & Restart', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          ))),
        ),
      ]),
    );
  }
}
