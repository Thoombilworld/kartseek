import 'package:flutter/material.dart';

/// Video Consult Screen — Waiting room + simulated video interface.
class VideoConsultScreen extends StatefulWidget {
  final Map<String, dynamic> appointmentData;
  const VideoConsultScreen({super.key, required this.appointmentData});

  @override
  State<VideoConsultScreen> createState() => _VideoConsultScreenState();
}

class _VideoConsultScreenState extends State<VideoConsultScreen> with TickerProviderStateMixin {
  bool _inCall = false;
  bool _micOn = true;
  bool _videoOn = true;
  final _chatController = TextEditingController();
  final _messages = <Map<String, String>>[];
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    // Auto-join after 3 seconds to simulate waiting room
    Future.delayed(const Duration(seconds: 3), () { if (mounted) setState(() => _inCall = true); });
  }

  @override
  void dispose() { _chatController.dispose(); _pulseController.dispose(); super.dispose(); }

  void _sendMessage() {
    if (_chatController.text.trim().isEmpty) return;
    setState(() {
      _messages.add({'sender': 'You', 'text': _chatController.text.trim()});
      _chatController.clear();
    });
    // Simulate doctor reply
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _messages.add({'sender': 'Doctor', 'text': 'Thank you, I understand. Let me check that for you.'}));
    });
  }

  @override
  Widget build(BuildContext context) {
    final doctorName = widget.appointmentData['doctorName'] ?? 'Dr. Sarah Kamau';

    if (!_inCall) return _buildWaitingRoom(context, doctorName);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(children: [
          // ── Top Bar ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.fiber_manual_record, size: 8, color: Color(0xFF10B981)),
                  SizedBox(width: 4),
                  Text('LIVE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF10B981))),
                ]),
              ),
              const Spacer(),
              const Icon(Icons.timer, size: 14, color: Colors.white54),
              const SizedBox(width: 4),
              const Text('05:32', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white70)),
              const Spacer(),
              IconButton(icon: const Icon(Icons.more_vert, color: Colors.white54, size: 20), onPressed: () {}),
            ]),
          ),

          // ── Video Area ──
          Expanded(
            child: Stack(children: [
              // Doctor's video (simulated)
              Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(
                  width: 100, height: 100,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]),
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: const Color(0xFF6D28D9).withValues(alpha: 0.3), blurRadius: 30)],
                  ),
                  child: Center(child: Text(doctorName.split(' ').last[0], style: const TextStyle(color: Colors.white, fontSize: 44, fontWeight: FontWeight.w900))),
                ),
                const SizedBox(height: 12),
                Text(doctorName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 2),
                Text(widget.appointmentData['speciality'] ?? 'Specialist', style: const TextStyle(fontSize: 12, color: Colors.white54)),
              ])),

              // Self-view (bottom right)
              Positioned(
                bottom: 16, right: 16,
                child: Container(
                  width: 100, height: 130,
                  decoration: BoxDecoration(
                    color: _videoOn ? const Color(0xFF1E293B) : const Color(0xFF334155),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 2),
                  ),
                  child: Center(child: _videoOn
                    ? const Icon(Icons.person, color: Colors.white38, size: 40)
                    : const Icon(Icons.videocam_off, color: Colors.white38, size: 24)),
                ),
              ),
            ]),
          ),

          // ── Chat Messages ──
          if (_messages.isNotEmpty)
            Container(
              constraints: const BoxConstraints(maxHeight: 120),
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView.builder(
                reverse: true, shrinkWrap: true,
                itemCount: _messages.length,
                itemBuilder: (_, i) {
                  final msg = _messages[_messages.length - 1 - i];
                  final isMe = msg['sender'] == 'You';
                  return Align(
                    alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isMe ? const Color(0xFF6D28D9) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(msg['text']!, style: const TextStyle(fontSize: 12, color: Colors.white)),
                    ),
                  );
                },
              ),
            ),

          // ── Chat Input ──
          Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              Expanded(child: TextField(
                controller: _chatController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(border: InputBorder.none, hintText: 'Type a message...', hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 13)),
                onSubmitted: (_) => _sendMessage(),
              )),
              IconButton(icon: const Icon(Icons.send, color: Color(0xFF6D28D9), size: 20), onPressed: _sendMessage),
            ]),
          ),

          // ── Controls ──
          Container(
            padding: const EdgeInsets.fromLTRB(30, 12, 30, 16),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              _controlButton(Icons.mic, Icons.mic_off, _micOn, () => setState(() => _micOn = !_micOn), const Color(0xFF334155)),
              _controlButton(Icons.videocam, Icons.videocam_off, _videoOn, () => setState(() => _videoOn = !_videoOn), const Color(0xFF334155)),
              GestureDetector(
                onTap: () => _showEndCallDialog(context),
                child: Container(
                  width: 60, height: 60,
                  decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                  child: const Icon(Icons.call_end, color: Colors.white, size: 28),
                ),
              ),
              _controlButton(Icons.chat, Icons.chat, true, () {}, const Color(0xFF334155)),
              _controlButton(Icons.more_horiz, Icons.more_horiz, true, () {}, const Color(0xFF334155)),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _buildWaitingRoom(BuildContext context, String doctorName) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (_, child) => Transform.scale(scale: 1.0 + (_pulseController.value * 0.1), child: child),
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)]),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: const Color(0xFF6D28D9).withValues(alpha: 0.4), blurRadius: 40)],
              ),
              child: const Icon(Icons.videocam, color: Colors.white, size: 48),
            ),
          ),
          const SizedBox(height: 30),
          const Text('Connecting...', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 8),
          Text('Waiting for $doctorName to join', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.6))),
          const SizedBox(height: 30),
          const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6D28D9))),
          const SizedBox(height: 40),
          OutlinedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close, size: 16),
            label: const Text('Leave Waiting Room'),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.white54, side: BorderSide(color: Colors.white.withValues(alpha: 0.2)), padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          ),
        ])),
      ),
    );
  }

  Widget _controlButton(IconData onIcon, IconData offIcon, bool isOn, VoidCallback onTap, Color bg) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48, height: 48,
        decoration: BoxDecoration(color: isOn ? bg : Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle),
        child: Icon(isOn ? onIcon : offIcon, color: Colors.white, size: 22),
      ),
    );
  }

  void _showEndCallDialog(BuildContext context) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('End Consultation?', style: TextStyle(fontWeight: FontWeight.w800)),
      content: const Text('Are you sure you want to end this video consultation?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Continue')),
        TextButton(onPressed: () { Navigator.pop(ctx); Navigator.pop(context); }, child: const Text('End Call', style: TextStyle(color: Color(0xFFEF4444)))),
      ],
    ));
  }
}
