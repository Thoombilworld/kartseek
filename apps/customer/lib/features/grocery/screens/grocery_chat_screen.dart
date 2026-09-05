import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:kartseek_shared_mobile/core/services/region_service.dart';

import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// In-app Chat Screen — Customer to Store messaging.
class GroceryChatScreen extends StatefulWidget {
  final String? storeName;
  const GroceryChatScreen({super.key, this.storeName});
  @override
  State<GroceryChatScreen> createState() => _GroceryChatScreenState();
}

class _GroceryChatScreenState extends State<GroceryChatScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  final _messages = <Map<String, dynamic>>[
    {'text': 'Hi! I have a question about my order #GRC-2847', 'isMe': true, 'time': '10:30 AM'},
    {'text': 'Hello! How can I help you?', 'isMe': false, 'time': '10:31 AM'},
    {'text': 'Can I substitute the regular tomatoes with organic ones?', 'isMe': true, 'time': '10:32 AM'},
    {'text': 'Sure! I\'ll swap them for you. The price difference is ${RegionService.instance.currentCountry.currencySymbol} 20.', 'isMe': false, 'time': '10:33 AM'},
    {'text': 'That works, thank you! 🙏', 'isMe': true, 'time': '10:33 AM'},
  ];

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add({'text': text, 'isMe': true, 'time': TimeOfDay.now().format(context)});
      _messageController.clear();
    });
    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    });
  }

  @override
  void dispose() { _messageController.dispose(); _scrollController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F5),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Row(children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
            child: const Center(child: Text('🏪', style: TextStyle(fontSize: 16))),
          ),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.storeName ?? 'FreshMart', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
            const Text('Online', style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.w600)),
          ]),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.phone, color: Colors.white, size: 20), onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryHelp)),
        ],
      ),
      body: Column(children: [
        // Messages
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(12),
            itemCount: _messages.length,
            itemBuilder: (context, i) {
              final msg = _messages[i];
              final isMe = msg['isMe'] as bool;
              return Align(
                alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                  decoration: BoxDecoration(
                    color: isMe ? _groceryColor : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 1))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text(msg['text'] as String, style: TextStyle(fontSize: 13, color: isMe ? Colors.white : Colors.grey.shade800, height: 1.3)),
                    const SizedBox(height: 2),
                    Text(msg['time'] as String, style: TextStyle(fontSize: 9, color: isMe ? Colors.white54 : Colors.grey.shade400)),
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
              IconButton(icon: Icon(Icons.add_photo_alternate, color: Colors.grey.shade400), onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('📷 Attach a photo to share with support', style: TextStyle(fontWeight: FontWeight.w600)), backgroundColor: Color(0xFF16A34A), behavior: SnackBarBehavior.floating))),
              Expanded(child: TextField(
                controller: _messageController,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade200)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  isDense: true,
                ),
                style: const TextStyle(fontSize: 13),
                onSubmitted: (_) => _sendMessage(),
              )),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: _sendMessage,
                child: Container(
                  width: 42, height: 42,
                  decoration: const BoxDecoration(color: _groceryColor, shape: BoxShape.circle),
                  child: const Icon(Icons.send, color: Colors.white, size: 18),
                ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}
