import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Chat with Seller Screen — Real-time messaging about a product.
class ChatSellerScreen extends StatefulWidget {
  final String? sellerName;
  final String? productName;
  const ChatSellerScreen({super.key, this.sellerName, this.productName});
  @override
  State<ChatSellerScreen> createState() => _ChatSellerScreenState();
}

class _ChatSellerScreenState extends State<ChatSellerScreen> {
  final _msgCtrl = TextEditingController();
  final _messages = <_ChatMsg>[
    _ChatMsg(
        text: 'Hi! I have a question about this product.',
        isMe: true,
        time: '10:30 AM'),
    _ChatMsg(
        text: 'Hello! Sure, how can I help you?',
        isMe: false,
        time: '10:31 AM'),
    _ChatMsg(
        text: 'Is this available in Midnight Blue color?',
        isMe: true,
        time: '10:32 AM'),
    _ChatMsg(
        text: 'Yes, we have Midnight Blue in stock!',
        isMe: false,
        time: '10:33 AM'),
  ];

  void _send() {
    if (_msgCtrl.text.trim().isEmpty) return;
    setState(() => _messages.add(_ChatMsg(
        text: _msgCtrl.text.trim(),
        isMe: true,
        time: TimeOfDay.now().format(context))));
    _msgCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
          backgroundColor: AppTheme.marketplaceColor,
          elevation: 0,
          title:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.sellerName ?? 'Seller',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white)),
            Text(widget.productName ?? 'Product inquiry',
                style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ])),
      body: Column(children: [
        Expanded(
            child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (_, i) {
                  final m = _messages[i];
                  return Align(
                      alignment:
                          m.isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(
                              maxWidth:
                                  MediaQuery.of(context).size.width * 0.75),
                          decoration: BoxDecoration(
                              color: m.isMe
                                  ? AppTheme.marketplaceColor
                                  : Colors.white,
                              borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(m.isMe ? 16 : 4),
                                  bottomRight:
                                      Radius.circular(m.isMe ? 4 : 16)),
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.05),
                                    blurRadius: 4)
                              ]),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(m.text,
                                    style: TextStyle(
                                        color: m.isMe
                                            ? Colors.white
                                            : AppTheme.textPrimary,
                                        fontSize: 15)),
                                const SizedBox(height: 4),
                                Text(m.time,
                                    style: TextStyle(
                                        color: m.isMe
                                            ? Colors.white54
                                            : AppTheme.textMuted,
                                        fontSize: 11)),
                              ])));
                })),
        Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)]),
            child: SafeArea(
                child: Row(children: [
              IconButton(
                  icon: const Icon(Icons.attach_file, color: AppTheme.textSecondary),
                  onPressed: () {}),
              Expanded(
                  child: TextField(
                      controller: _msgCtrl,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                          hintText: 'Type a message...',
                          filled: true,
                          fillColor: AppTheme.surfaceMuted,
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10)))),
              const SizedBox(width: 8),
              GestureDetector(
                  onTap: _send,
                  child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                          color: AppTheme.marketplaceColor, shape: BoxShape.circle),
                      child: const Icon(Icons.send,
                          color: Colors.white, size: 20))),
            ]))),
      ]),
    );
  }
}

class _ChatMsg {
  final String text;
  final bool isMe;
  final String time;
  _ChatMsg({required this.text, required this.isMe, required this.time});
}
