import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// In-app chat with delivery driver for pharmacy orders.
class PharmacyDriverChatScreen extends StatefulWidget {
  final String orderId;
  final String driverName;
  const PharmacyDriverChatScreen(
      {super.key,
      this.orderId = 'PH-2026-1234',
      this.driverName = 'Mohammed A.'});
  @override
  State<PharmacyDriverChatScreen> createState() =>
      _PharmacyDriverChatScreenState();
}

class _PharmacyDriverChatScreenState extends State<PharmacyDriverChatScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_ChatMsg> _messages = [
    const _ChatMsg('Hi! I\'ve picked up your medicines from the pharmacy.',
        false, '2:30 PM'),
    const _ChatMsg('Great, thank you! How long will it take?', true, '2:31 PM'),
    const _ChatMsg('About 12 minutes, I\'m on my way now 🚗', false, '2:31 PM'),
    const _ChatMsg(
        'Perfect, I\'ll be at the gate. Building B, Tower 2.', true, '2:32 PM'),
  ];

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _send() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add(_ChatMsg(text, true, TimeOfDay.now().format(context)));
      _msgCtrl.clear();
    });
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent + 80,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F5),
      appBar: AppBar(
        backgroundColor: AppTheme.pharmacyColor,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context)),
        title: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.2)),
            child: const Icon(Icons.delivery_dining,
                color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.driverName,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700)),
            Text('Order ${widget.orderId}',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8), fontSize: 11)),
          ]),
        ]),
        actions: [
          IconButton(
              icon: const Icon(Icons.phone, color: Colors.white, size: 22),
              onPressed: () {}),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(children: [
        // Delivery banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: AppTheme.pharmacyColor.withValues(alpha: 0.08),
          child: const Row(children: [
            Icon(Icons.info_outline, size: 16, color: AppTheme.pharmacyColor),
            SizedBox(width: 8),
            Expanded(
                child: Text('Chat is available until your order is delivered',
                    style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.pharmacyColor,
                        fontWeight: FontWeight.w500))),
          ]),
        ),

        // Messages
        Expanded(
          child: ListView.builder(
            controller: _scrollCtrl,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: _messages.length,
            itemBuilder: (_, i) {
              final msg = _messages[i];
              return _bubble(msg);
            },
          ),
        ),

        // Quick replies
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              _quickReply('I\'m at the gate'),
              _quickReply('Please call me'),
              _quickReply('Leave at door'),
              _quickReply('Coming down now'),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // Input
        Container(
          padding: EdgeInsets.fromLTRB(
              16, 8, 8, 8 + MediaQuery.of(context).padding.bottom),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, -2))
          ]),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _msgCtrl,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle:
                      TextStyle(color: Colors.grey.shade400, fontSize: 14),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _send,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                    shape: BoxShape.circle, color: AppTheme.pharmacyColor),
                child: const Icon(Icons.send_rounded,
                    color: Colors.white, size: 20),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _bubble(_ChatMsg msg) {
    return Align(
      alignment: msg.isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(
          bottom: 8,
          left: msg.isMe ? 60 : 0,
          right: msg.isMe ? 0 : 60,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: msg.isMe ? AppTheme.pharmacyColor : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(msg.isMe ? 18 : 4),
            bottomRight: Radius.circular(msg.isMe ? 4 : 18),
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(msg.text,
              style: TextStyle(
                  color: msg.isMe ? Colors.white : Colors.black87,
                  fontSize: 14,
                  height: 1.4)),
          const SizedBox(height: 4),
          Text(msg.time,
              style: TextStyle(
                  color: msg.isMe
                      ? Colors.white.withValues(alpha: 0.7)
                      : Colors.grey.shade400,
                  fontSize: 10)),
        ]),
      ),
    );
  }

  Widget _quickReply(String text) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () {
          _msgCtrl.text = text;
          _send();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: AppTheme.pharmacyColor.withValues(alpha: 0.3)),
          ),
          child: Text(text,
              style: const TextStyle(
                  color: AppTheme.pharmacyColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class _ChatMsg {
  final String text;
  final bool isMe;
  final String time;
  const _ChatMsg(this.text, this.isMe, this.time);
}
