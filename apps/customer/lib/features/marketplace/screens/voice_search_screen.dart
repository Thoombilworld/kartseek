import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Voice Search Screen — Voice-activated product search with waveform animation.
class VoiceSearchScreen extends StatefulWidget {
  const VoiceSearchScreen({super.key});
  @override
  State<VoiceSearchScreen> createState() => _VoiceSearchScreenState();
}

class _VoiceSearchScreenState extends State<VoiceSearchScreen>
    with TickerProviderStateMixin {
  bool _listening = false;
  String _transcript = '';
  late AnimationController _waveCtrl;
  final _suggestions = [
    'Samsung Galaxy S24',
    'iPhone 16 Pro Max',
    'Sony headphones under 5000',
    'Running shoes Nike',
    'Laptop bag waterproof'
  ];

  @override
  void initState() {
    super.initState();
    _waveCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat();
  }

  @override
  void dispose() {
    _waveCtrl.dispose();
    super.dispose();
  }

  void _toggleListening() => setState(() {
        _listening = !_listening;
        if (_listening) _transcript = '';
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f0f23),
      appBar: AppBar(
          backgroundColor: const Color(0xFF0f0f23),
          elevation: 0,
          leading: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.pop(context)),
          title: const Text('Voice Search',
              style:
                  TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
      body: Center(
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        if (_transcript.isNotEmpty)
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text('"$_transcript"',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      fontStyle: FontStyle.italic),
                  textAlign: TextAlign.center)),
        const SizedBox(height: 40),
        GestureDetector(
            onTap: _toggleListening,
            child: AnimatedBuilder(
                animation: _waveCtrl,
                builder: (_, __) => Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _listening
                            ? AppTheme.marketplaceColor
                            : AppTheme.textPrimary,
                        boxShadow: _listening
                            ? [
                                BoxShadow(
                                    color: AppTheme.marketplaceColor.withValues(
                                        alpha: 0.3 + _waveCtrl.value * 0.3),
                                    blurRadius: 30 + _waveCtrl.value * 20,
                                    spreadRadius: 5 + _waveCtrl.value * 10)
                              ]
                            : []),
                    child: Icon(Icons.mic,
                        color: Colors.white,
                        size: _listening ? 48 + _waveCtrl.value * 8 : 48)))),
        const SizedBox(height: 24),
        Text(_listening ? 'Listening...' : 'Tap to speak',
            style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6), fontSize: 16)),
        if (_listening)
          Padding(
              padding: const EdgeInsets.only(top: 20),
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                      7,
                      (i) => AnimatedBuilder(
                          animation: _waveCtrl,
                          builder: (_, __) {
                            final h = 10.0 +
                                30 *
                                    (((_waveCtrl.value + i * 0.15) % 1.0) * 2 -
                                            1)
                                        .abs();
                            return Container(
                                width: 4,
                                height: h,
                                margin:
                                    const EdgeInsets.symmetric(horizontal: 3),
                                decoration: BoxDecoration(
                                    color: AppTheme.marketplaceColor,
                                    borderRadius: BorderRadius.circular(2)));
                          })))),
        const SizedBox(height: 40),
        if (!_listening) ...[
          const Text('Try saying:',
              style: TextStyle(color: Colors.white38, fontSize: 13)),
          const SizedBox(height: 12),
          ...(_suggestions.take(3).map((s) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: GestureDetector(
                  onTap: () => setState(() => _transcript = s),
                  child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white10)),
                      child: Text('"$s"',
                          style: const TextStyle(
                              color: Colors.white54, fontSize: 14))))))),
        ],
      ])),
    );
  }
}
