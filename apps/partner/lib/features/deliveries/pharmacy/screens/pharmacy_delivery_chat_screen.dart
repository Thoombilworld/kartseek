import 'package:flutter/material.dart';
/// Customer chat during delivery.
class PharmacyDeliveryChatScreen extends StatefulWidget {
  const PharmacyDeliveryChatScreen({super.key});
  @override State<PharmacyDeliveryChatScreen> createState() => _PharmacyDeliveryChatScreenState();
}
class _PharmacyDeliveryChatScreenState extends State<PharmacyDeliveryChatScreen> {
  final _ctrl = TextEditingController();
  final _msgs = [
    {'from': 'customer', 'text': 'Hi, are you on your way?', 'time': '10:30 AM'},
    {'from': 'driver', 'text': 'Yes, I\'ve picked up your order. ETA 8 min', 'time': '10:31 AM'},
    {'from': 'customer', 'text': 'Great, please ring the bell when you arrive', 'time': '10:32 AM'},
  ];
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.grey.shade100,
    appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Chat with Customer', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
    body: Column(children: [
      Expanded(child: ListView.builder(padding: const EdgeInsets.all(16), itemCount: _msgs.length, itemBuilder: (_, i) {
        final m = _msgs[i]; final isMe = m['from'] == 'driver';
        return Align(alignment: isMe ? Alignment.centerRight : Alignment.centerLeft, child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
          decoration: BoxDecoration(color: isMe ? Colors.blue.shade600 : Colors.white, borderRadius: BorderRadius.circular(14)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(m['text']!, style: TextStyle(fontSize: 14, color: isMe ? Colors.white : Colors.black87, height: 1.3)),
            const SizedBox(height: 4),
            Text(m['time']!, style: TextStyle(fontSize: 10, color: isMe ? Colors.white70 : Colors.grey.shade400)),
          ]),
        ));
      })),
      Container(padding: const EdgeInsets.all(12), color: Colors.white,
        child: SafeArea(child: Row(children: [
          Expanded(child: TextField(controller: _ctrl, decoration: InputDecoration(hintText: 'Type a message...', hintStyle: TextStyle(color: Colors.grey.shade400), filled: true, fillColor: Colors.grey.shade100, border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)))),
          const SizedBox(width: 8),
          Container(width: 44, height: 44, decoration: const BoxDecoration(color: Colors.blue, shape: BoxShape.circle), child: IconButton(icon: const Icon(Icons.send, color: Colors.white, size: 20), onPressed: () { if (_ctrl.text.isNotEmpty) { setState(() => _msgs.add({'from': 'driver', 'text': _ctrl.text, 'time': 'Now'})); _ctrl.clear(); }})),
        ]))),
    ]),
  );
}
