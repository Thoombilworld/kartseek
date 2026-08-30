import 'package:flutter/material.dart';

/// Seller Security Settings — 2FA, sessions, login history, password management.
class MarketplaceSecurityScreen extends StatefulWidget {
  const MarketplaceSecurityScreen({super.key});
  @override
  State<MarketplaceSecurityScreen> createState() =>
      _MarketplaceSecurityScreenState();
}

class _MarketplaceSecurityScreenState extends State<MarketplaceSecurityScreen> {
  static const _mp = Color(0xFF6C3FC8);
  bool _twoFA = true;

  final _sessions = [
    const _Session(
        device: 'Chrome on Windows',
        location: 'Mumbai, IN',
        time: 'Active now',
        current: true),
    const _Session(
        device: 'Firefox on MacOS',
        location: 'Delhi, IN',
        time: '2h ago',
        current: false),
    const _Session(
        device: 'Safari on iPhone',
        location: 'Bangalore, IN',
        time: '1d ago',
        current: false),
  ];

  final _loginHistory = [
    const _Login(
        time: 'Jul 2, 10:15 AM',
        device: 'Chrome, Windows',
        location: 'Mumbai',
        success: true),
    const _Login(
        time: 'Jul 1, 8:30 PM',
        device: 'Firefox, MacOS',
        location: 'Delhi',
        success: true),
    const _Login(
        time: 'Jun 30, 11:00 PM',
        device: 'Unknown',
        location: 'Beijing, CN',
        success: false),
    const _Login(
        time: 'Jun 30, 3:15 PM',
        device: 'Chrome, Windows',
        location: 'Mumbai',
        success: true),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Security Settings',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            // 2FA
            _card(
                child: Row(children: [
              const Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Two-Factor Authentication',
                        style: TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15)),
                    SizedBox(height: 2),
                    Text('Extra security for your account',
                        style:
                            TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                  ])),
              Switch(
                value: _twoFA,
                onChanged: (v) => setState(() => _twoFA = v),
                activeThumbColor: _mp,
              ),
            ])),
            if (_twoFA)
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(12)),
                child: const Row(children: [
                  Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20),
                  SizedBox(width: 8),
                  Text('2FA enabled via Authenticator App',
                      style: TextStyle(
                          color: Color(0xFF10B981),
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                ]),
              ),

            // Password
            _card(
                child: Row(children: [
              const Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Password',
                        style: TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15)),
                    SizedBox(height: 2),
                    Text('Last changed 45 days ago',
                        style:
                            TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                  ])),
              OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                    foregroundColor: _mp,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10))),
                child: const Text('Change',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ])),

            // Active Sessions
            _card(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Active Sessions',
                            style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                        TextButton(
                            onPressed: () {},
                            child: const Text('Revoke All',
                                style: TextStyle(
                                    color: Color(0xFFEF4444),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12))),
                      ]),
                  ..._sessions.map((s) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(10)),
                        child: Row(children: [
                          const Icon(Icons.devices,
                              color: Color(0xFF6B7280), size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Row(children: [
                                  Text(s.device,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13)),
                                  if (s.current) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                            color: const Color(0xFF10B981)
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(4)),
                                        child: const Text('THIS DEVICE',
                                            style: TextStyle(
                                                fontSize: 8,
                                                fontWeight: FontWeight.w800,
                                                color: Color(0xFF10B981)))),
                                  ],
                                ]),
                                Text('${s.location} • ${s.time}',
                                    style: const TextStyle(
                                        color: Color(0xFF9CA3AF),
                                        fontSize: 11)),
                              ])),
                          if (!s.current)
                            GestureDetector(
                              onTap: () => setState(() => _sessions.remove(s)),
                              child: const Text('Revoke',
                                  style: TextStyle(
                                      color: Color(0xFFEF4444),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600)),
                            ),
                        ]),
                      )),
                ])),

            // Login History
            _card(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  const Text('Login History',
                      style:
                          TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 10),
                  ..._loginHistory.map((l) => Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(8)),
                        child: Row(children: [
                          Icon(l.success ? Icons.check_circle : Icons.block,
                              size: 16,
                              color: l.success
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFFEF4444)),
                          const SizedBox(width: 8),
                          Expanded(
                              child: Text('${l.device} • ${l.location}',
                                  style: const TextStyle(fontSize: 12))),
                          Text(l.time,
                              style: const TextStyle(
                                  color: Color(0xFF9CA3AF), fontSize: 11)),
                        ]),
                      )),
                ])),
          ])),
    );
  }

  Widget _card({required Widget child}) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB))),
        child: child,
      );
}

class _Session {
  final String device, location, time;
  final bool current;
  const _Session(
      {required this.device,
      required this.location,
      required this.time,
      required this.current});
}

class _Login {
  final String time, device, location;
  final bool success;
  const _Login(
      {required this.time,
      required this.device,
      required this.location,
      required this.success});
}
