import 'package:flutter/material.dart';

/// Restaurant — In-app Chat Screen (Customer to Restaurant messaging).
class RestaurantChatScreen extends StatefulWidget {
  final String? restaurantName;
  const RestaurantChatScreen({super.key, this.restaurantName});
  @override
  State<RestaurantChatScreen> createState() => _RestaurantChatScreenState();
}

class _RestaurantChatScreenState extends State<RestaurantChatScreen> {
  static const _brandColor = Color(0xFFEA580C);
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  final _messages = <Map<String, dynamic>>[
    {'text': 'Hi! I placed order #ORD-4521. Can I add extra raita?', 'isMe': true, 'time': '10:32 AM'},
    {'text': 'Hello! Yes, we can add raita for KES 40 extra. Shall I update your order?', 'isMe': false, 'time': '10:33 AM'},
    {'text': 'Yes please, and can you make the biryani less spicy?', 'isMe': true, 'time': '10:34 AM'},
    {'text': 'Sure! We\'ll make it medium spice. Your updated total is KES 520. The order is being prepared now 🍛', 'isMe': false, 'time': '10:35 AM'},
  ];

  @override
  void dispose() { _messageController.dispose(); _scrollController.dispose(); super.dispose(); }

  void _send() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    setState(() { _messages.add({'text': text, 'isMe': true, 'time': TimeOfDay.now().format(context)}); _messageController.clear(); });
    Future.delayed(const Duration(milliseconds: 600), () { if (mounted) _scrollController.animateTo(_scrollController.position.maxScrollExtent + 60, duration: const Duration(milliseconds: 300), curve: Curves.easeOut); });
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.restaurantName ?? 'The Grand Biryani House';
    return Scaffold(
      backgroundColor: const Color(0xFFF5F0EB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Row(children: [
          CircleAvatar(radius: 16, backgroundColor: Colors.white.withValues(alpha: 0.2), child: const Icon(Icons.restaurant, color: Colors.white, size: 16)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14), overflow: TextOverflow.ellipsis),
            const Text('Online • Typically replies in 2 min', style: TextStyle(color: Colors.white70, fontSize: 10)),
          ])),
        ]),
        actions: [IconButton(icon: const Icon(Icons.call, color: Colors.white, size: 20), onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Calling $name…'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)))],
      ),
      body: Column(children: [
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (_, i) {
              final m = _messages[i];
              final isMe = m['isMe'] as bool;
              return Align(
                alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                  decoration: BoxDecoration(
                    color: isMe ? _brandColor : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4), bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text(m['text'] as String, style: TextStyle(fontSize: 13, color: isMe ? Colors.white : Colors.black87, height: 1.4)),
                    const SizedBox(height: 4),
                    Text(m['time'] as String, style: TextStyle(fontSize: 9, color: isMe ? Colors.white60 : Colors.grey.shade400)),
                  ]),
                ),
              );
            },
          ),
        ),
        // Input bar
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, -2))]),
          child: SafeArea(
            top: false,
            child: Row(children: [
              IconButton(icon: Icon(Icons.add_photo_alternate, color: Colors.grey.shade400), onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('📷 Attach photo to send with your message'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating))),
              Expanded(child: TextField(
                controller: _messageController,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade200)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade200)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: _brandColor)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  isDense: true,
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
              )),
              const SizedBox(width: 6),
              Container(
                decoration: const BoxDecoration(shape: BoxShape.circle, color: _brandColor),
                child: IconButton(icon: const Icon(Icons.send, color: Colors.white, size: 18), onPressed: _send),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
