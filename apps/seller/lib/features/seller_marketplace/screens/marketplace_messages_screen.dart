import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:intl/intl.dart';

/// Messages — Buyer-seller conversations, support tickets, and system notifications.
class MarketplaceMessagesScreen extends StatefulWidget {
  const MarketplaceMessagesScreen({super.key});

  @override
  State<MarketplaceMessagesScreen> createState() =>
      _MarketplaceMessagesScreenState();
}

class _MarketplaceMessagesScreenState extends State<MarketplaceMessagesScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  late TabController _tabCtrl;
  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  final _conversations = <_Conversation>[
    _Conversation(
        'c1',
        'Rohit Sharma',
        'Regarding iPhone 15 Pro delivery delay',
        DateTime(2026, 6, 7, 14, 32),
        true,
        2,
        'buyer',
        'ORD-44821'),
    _Conversation('c2', 'Priya Das', 'Product warranty question',
        DateTime(2026, 6, 7, 11, 15), true, 1, 'buyer', 'ORD-44819'),
    _Conversation('c3', 'Amit Patel', 'Can I get a discount on bulk order?',
        DateTime(2026, 6, 6, 18, 45), false, 0, 'buyer', null),
    _Conversation('c4', 'Sneha Reddy', 'Wrong color received, need exchange',
        DateTime(2026, 6, 6, 10, 22), true, 3, 'buyer', 'ORD-44812'),
    _Conversation(
        'c5',
        'KARTSEEK Support',
        'Policy update: Return window extended',
        DateTime(2026, 6, 5, 9, 0),
        false,
        0,
        'support',
        null),
  ];

  final _supportTickets = <_Conversation>[
    _Conversation('t1', 'KARTSEEK Support', 'Payout delay — Ticket #SP-4532',
        DateTime(2026, 6, 7, 10, 0), true, 1, 'support', null),
    _Conversation(
        't2',
        'KARTSEEK Support',
        'Product listing suspended — Appeal',
        DateTime(2026, 6, 5, 14, 30),
        false,
        0,
        'support',
        null),
    _Conversation('t3', 'KARTSEEK Support', 'Account verification completed',
        DateTime(2026, 6, 3, 11, 0), false, 0, 'support', null),
  ];

  @override
  Widget build(BuildContext context) {
    final unreadBuyers = _conversations.where((c) => c.unread).length;
    final unreadSupport = _supportTickets.where((c) => c.unread).length;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Messages',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {},
              tooltip: 'Search'),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle:
              const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: [
            Tab(
                child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Text('Buyers'),
              if (unreadBuyers > 0) ...[
                const SizedBox(width: 6),
                _badge(unreadBuyers)
              ],
            ])),
            Tab(
                child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Text('Support'),
              if (unreadSupport > 0) ...[
                const SizedBox(width: 6),
                _badge(unreadSupport)
              ],
            ])),
            const Tab(text: 'System'),
          ],
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Quick Stats
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _quickStat('Unread', '${unreadBuyers + unreadSupport}',
                    SellerTheme.errorRed),
                _quickStat('Avg Response', '1.2h', SellerTheme.infoBlue),
                _quickStat('This Week', '18', _mp),
                _quickStat('Resolution', '94%', SellerTheme.successGreen),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: TabBarView(
              controller: _tabCtrl,
              children: [
                _buildConversationList(_conversations),
                _buildConversationList(_supportTickets),
                _buildSystemNotifications(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _badge(int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration:
          const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
      child: Text('$count',
          style: const TextStyle(
              color: _mp, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  Widget _quickStat(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 16, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style:
                  const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
        ],
      ),
    );
  }

  // ── Conversation List ───────────────────────────────────────────────────
  Widget _buildConversationList(List<_Conversation> conversations) {
    if (conversations.isEmpty) {
      return const Center(
          child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.chat_bubble_outline,
              size: 48, color: SellerTheme.textMuted),
          SizedBox(height: 12),
          Text('No conversations',
              style: TextStyle(
                  color: SellerTheme.textMuted, fontWeight: FontWeight.bold)),
        ],
      ));
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: conversations.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
      itemBuilder: (_, i) {
        final c = conversations[i];
        return _conversationTile(c);
      },
    );
  }

  Widget _conversationTile(_Conversation c) {
    final isSupport = c.type == 'support';
    return InkWell(
      onTap: () => _openChat(c),
      child: Container(
        color: c.unread ? _mp.withValues(alpha: 0.04) : null,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSupport
                    ? SellerTheme.infoBlue.withValues(alpha: 0.1)
                    : _mp.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: isSupport
                    ? const Icon(Icons.headset_mic,
                        color: SellerTheme.infoBlue, size: 20)
                    : Text(
                        c.name.split(' ').map((w) => w[0]).take(2).join(),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: _mp),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          c.name,
                          style: TextStyle(
                              fontWeight:
                                  c.unread ? FontWeight.bold : FontWeight.w500,
                              fontSize: 14,
                              color: SellerTheme.textPrimary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        _formatTime(c.lastMessage),
                        style: TextStyle(
                            fontSize: 10,
                            color: c.unread ? _mp : SellerTheme.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      if (c.orderId != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                              color:
                                  SellerTheme.infoBlue.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4)),
                          child: Text(c.orderId!,
                              style: const TextStyle(
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'monospace',
                                  color: SellerTheme.infoBlue)),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Expanded(
                        child: Text(
                          c.lastText,
                          style: TextStyle(
                              fontSize: 12,
                              color: c.unread
                                  ? SellerTheme.textPrimary
                                  : SellerTheme.textMuted),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (c.unread && c.unreadCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: const BoxDecoration(
                              color: _mp, shape: BoxShape.circle),
                          child: Text('${c.unreadCount}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── System Notifications ────────────────────────────────────────────────
  Widget _buildSystemNotifications() {
    final notifications = [
      _SysNotification(
          Icons.campaign,
          'Flash Deal Registration Open',
          'Register your products for the "Super Summer Sale" starting Jun 15. Deadline: Jun 10.',
          DateTime(2026, 6, 7, 8, 0),
          SellerTheme.warningAmber),
      _SysNotification(
          Icons.update,
          'Platform Update v4.2',
          'New shipping label format, improved analytics dashboard, and bulk edit support.',
          DateTime(2026, 6, 6, 12, 0),
          SellerTheme.infoBlue),
      _SysNotification(
          Icons.policy,
          'Policy Change: Return Window',
          'Electronics return window extended from 7 to 10 days effective Jul 1.',
          DateTime(2026, 6, 5, 9, 0),
          _mp),
      _SysNotification(
          Icons.monetization_on,
          'Commission Rate Update',
          'Fashion category commission reduced from 15% to 12% starting Jul 1.',
          DateTime(2026, 6, 4, 10, 0),
          SellerTheme.successGreen),
      _SysNotification(
          Icons.security,
          'Security Alert',
          'Enable 2FA for enhanced account security. 30% of top sellers already use it.',
          DateTime(2026, 6, 3, 14, 0),
          SellerTheme.errorRed),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: notifications.length,
      itemBuilder: (_, i) {
        final n = notifications[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: SellerTheme.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: n.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(n.icon, color: n.color, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(n.title,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 3),
                    Text(n.body,
                        style: const TextStyle(
                            fontSize: 11,
                            color: SellerTheme.textSecondary,
                            height: 1.4)),
                    const SizedBox(height: 4),
                    Text(DateFormat('dd MMM, hh:mm a').format(n.date),
                        style: const TextStyle(
                            fontSize: 9, color: SellerTheme.textMuted)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Chat Detail ────────────────────────────────────────────────────────
  void _openChat(_Conversation c) {
    Navigator.push(context,
        MaterialPageRoute(builder: (_) => _ChatDetailScreen(conversation: c)));
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    return DateFormat('dd MMM').format(dt);
  }
}

// ── Chat Detail Screen ─────────────────────────────────────────────────────
class _ChatDetailScreen extends StatefulWidget {
  final _Conversation conversation;
  const _ChatDetailScreen({required this.conversation});

  @override
  State<_ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<_ChatDetailScreen> {
  static const _mp = Color(0xFF6C3FC8);
  final _ctrl = TextEditingController();
  final _messages = <_ChatMsg>[];

  @override
  void initState() {
    super.initState();
    _messages.addAll([
      _ChatMsg(
          'Hi, I placed an order for iPhone 15 Pro but the delivery seems delayed. Can you check?',
          false,
          DateTime(2026, 6, 7, 14, 20)),
      _ChatMsg(
          'Hello! Thank you for reaching out. Let me check the tracking status for your order.',
          true,
          DateTime(2026, 6, 7, 14, 25)),
      _ChatMsg(
          'Your order ORD-44821 is currently at the Bangalore sorting hub and is expected to be delivered by tomorrow (Jun 8) before 9 PM.',
          true,
          DateTime(2026, 6, 7, 14, 26)),
      _ChatMsg('Thank you! That\'s reassuring. Can I also get gift wrapping?',
          false, DateTime(2026, 6, 7, 14, 30)),
      _ChatMsg(
          'I\'ve added a note for gift wrapping to your order. Our delivery partner will ensure it\'s packed nicely. Is there anything else I can help with?',
          true,
          DateTime(2026, 6, 7, 14, 32)),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0EDF5),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.conversation.name,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            if (widget.conversation.orderId != null)
              Text(widget.conversation.orderId!,
                  style: const TextStyle(fontSize: 11, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (_, i) => _messageBubble(_messages[i]),
            ),
          ),
          // Input
          Container(
            color: Colors.white,
            padding: EdgeInsets.only(
              left: 12,
              right: 8,
              top: 8,
              bottom: MediaQuery.of(context).padding.bottom + 8,
            ),
            child: Row(
              children: [
                IconButton(
                    icon: const Icon(Icons.attach_file,
                        color: SellerTheme.textMuted),
                    onPressed: () {}),
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: const TextStyle(
                          fontSize: 14, color: SellerTheme.textMuted),
                      filled: true,
                      fillColor: SellerTheme.surface,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                Container(
                  decoration:
                      const BoxDecoration(color: _mp, shape: BoxShape.circle),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 18),
                    onPressed: () {
                      if (_ctrl.text.trim().isNotEmpty) {
                        setState(() {
                          _messages.add(_ChatMsg(
                              _ctrl.text.trim(), true, DateTime.now()));
                          _ctrl.clear();
                        });
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _messageBubble(_ChatMsg msg) {
    return Align(
      alignment: msg.isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: msg.isMe ? _mp : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(msg.isMe ? 16 : 4),
            bottomRight: Radius.circular(msg.isMe ? 4 : 16),
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(msg.text,
                style: TextStyle(
                    fontSize: 13,
                    color: msg.isMe ? Colors.white : SellerTheme.textPrimary,
                    height: 1.4)),
            const SizedBox(height: 4),
            Text(
              DateFormat('hh:mm a').format(msg.time),
              style: TextStyle(
                  fontSize: 9,
                  color: msg.isMe ? Colors.white60 : SellerTheme.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Models ──────────────────────────────────────────────────────────────────
class _Conversation {
  final String id, name, lastText;
  final DateTime lastMessage;
  final bool unread;
  final int unreadCount;
  final String type;
  final String? orderId;
  const _Conversation(this.id, this.name, this.lastText, this.lastMessage,
      this.unread, this.unreadCount, this.type, this.orderId);
}

class _SysNotification {
  final IconData icon;
  final String title, body;
  final DateTime date;
  final Color color;
  const _SysNotification(
      this.icon, this.title, this.body, this.date, this.color);
}

class _ChatMsg {
  final String text;
  final bool isMe;
  final DateTime time;
  const _ChatMsg(this.text, this.isMe, this.time);
}
