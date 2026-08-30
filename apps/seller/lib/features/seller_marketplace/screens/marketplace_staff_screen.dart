import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Staff Management — Manage staff members, roles, and access permissions.
class MarketplaceStaffScreen extends StatefulWidget {
  const MarketplaceStaffScreen({super.key});

  @override
  State<MarketplaceStaffScreen> createState() => _MarketplaceStaffScreenState();
}

class _MarketplaceStaffScreenState extends State<MarketplaceStaffScreen> {
  static const _mp = Color(0xFF6C3FC8);

  final List<_Staff> _staff = [
    const _Staff(
        name: 'Ahmed Al-Thani',
        email: 'ahmed@gulftechstore.com',
        role: 'Owner',
        avatar: 'A',
        status: 'active',
        permissions: ['All Access'],
        lastActive: 'Just now'),
    const _Staff(
        name: 'Sara Mohammed',
        email: 'sara@gulftechstore.com',
        role: 'Manager',
        avatar: 'S',
        status: 'active',
        permissions: ['Orders', 'Inventory', 'Analytics', 'Returns'],
        lastActive: '5 min ago'),
    const _Staff(
        name: 'Khalid Rahman',
        email: 'khalid@gulftechstore.com',
        role: 'Staff',
        avatar: 'K',
        status: 'active',
        permissions: ['Orders', 'Inventory'],
        lastActive: '2 hours ago'),
    const _Staff(
        name: 'Fatima Nasser',
        email: 'fatima@gulftechstore.com',
        role: 'Staff',
        avatar: 'F',
        status: 'inactive',
        permissions: ['Orders'],
        lastActive: '3 days ago'),
  ];

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Staff · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showInviteDialog,
        backgroundColor: _mp,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Invite Staff',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Summary
                Row(children: [
                  Expanded(
                      child: _kpi(
                          'Active',
                          '${_staff.where((s) => s.status == 'active').length}',
                          SellerTheme.successGreen,
                          Icons.people)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _kpi(
                          'Inactive',
                          '${_staff.where((s) => s.status == 'inactive').length}',
                          SellerTheme.textMuted,
                          Icons.person_off)),
                  const SizedBox(width: 10),
                  Expanded(
                      child:
                          _kpi('Total', '${_staff.length}', _mp, Icons.group)),
                ]),
                const SizedBox(height: 16),

                // Roles legend
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: SellerTheme.cardDecoration(),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(children: [
                          Icon(Icons.admin_panel_settings,
                              color: _mp, size: 18),
                          SizedBox(width: 6),
                          Text('Access Roles',
                              style: TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w700)),
                        ]),
                        const SizedBox(height: 10),
                        _roleLegend(
                            'Owner',
                            'Full access to all store functions',
                            SellerTheme.errorRed),
                        _roleLegend(
                            'Manager',
                            'Orders, inventory, analytics, returns',
                            SellerTheme.warningAmber),
                        _roleLegend('Staff', 'Orders and basic inventory only',
                            SellerTheme.infoBlue),
                      ]),
                ),
                const SizedBox(height: 16),

                // Staff list
                ..._staff.map((s) => _buildStaffCard(s)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(value,
            style: TextStyle(
                fontSize: 20, fontWeight: FontWeight.w800, color: color)),
        Text(label,
            style:
                TextStyle(fontSize: 11, color: color.withValues(alpha: 0.8))),
      ]),
    );
  }

  Widget _roleLegend(String role, String desc, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text(role,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(width: 8),
        Expanded(
            child: Text(desc,
                style: const TextStyle(
                    fontSize: 11, color: SellerTheme.textMuted))),
      ]),
    );
  }

  Widget _buildStaffCard(_Staff s) {
    final roleColor = s.role == 'Owner'
        ? SellerTheme.errorRed
        : s.role == 'Manager'
            ? SellerTheme.warningAmber
            : SellerTheme.infoBlue;
    final isActive = s.status == 'active';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
              radius: 22,
              backgroundColor: _mp.withValues(alpha: 0.1),
              child: Text(s.avatar,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, color: _mp, fontSize: 16))),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Row(children: [
                  Text(s.name,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: roleColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6)),
                    child: Text(s.role,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: roleColor)),
                  ),
                ]),
                const SizedBox(height: 2),
                Text(s.email,
                    style: const TextStyle(
                        fontSize: 12, color: SellerTheme.textMuted)),
              ])),
          Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                  color: isActive
                      ? SellerTheme.successGreen
                      : SellerTheme.textMuted,
                  shape: BoxShape.circle)),
        ]),
        const SizedBox(height: 10),
        Wrap(
          spacing: 6,
          runSpacing: 4,
          children: s.permissions
              .map((p) => Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                        color: SellerTheme.surface,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: SellerTheme.border)),
                    child: Text(p,
                        style: const TextStyle(
                            fontSize: 10, color: SellerTheme.textSecondary)),
                  ))
              .toList(),
        ),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.access_time, size: 13, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text('Last active: ${s.lastActive}',
              style:
                  const TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
          const Spacer(),
          if (s.role != 'Owner') ...[
            TextButton(
                onPressed: () {
                  showModalBottomSheet(
                      context: context,
                      shape: const RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.vertical(top: Radius.circular(20))),
                      builder: (_) => Padding(
                          padding: const EdgeInsets.all(24),
                          child:
                              Column(mainAxisSize: MainAxisSize.min, children: [
                            Text('Edit ${s.name}',
                                style: const TextStyle(
                                    fontSize: 18, fontWeight: FontWeight.w800)),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<String>(
                                initialValue: s.role,
                                items: ['Manager', 'Staff', 'Viewer']
                                    .map((r) => DropdownMenuItem(
                                        value: r, child: Text(r)))
                                    .toList(),
                                onChanged: (v) {},
                                decoration: const InputDecoration(
                                    labelText: 'Role',
                                    border: OutlineInputBorder())),
                            const SizedBox(height: 16),
                            SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                    onPressed: () {
                                      Navigator.pop(context);
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(SnackBar(
                                              content:
                                                  Text('${s.name} updated')));
                                    },
                                    style: ElevatedButton.styleFrom(
                                        backgroundColor: _mp,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 14),
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12))),
                                    child: const Text('Save Changes',
                                        style: TextStyle(
                                            fontWeight: FontWeight.w700)))),
                          ])));
                },
                child: const Text('Edit',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _mp))),
            TextButton(
                onPressed: () => setState(() {
                      final idx = _staff.indexOf(s);
                      if (idx >= 0) {
                        _staff[idx] = s.copyWith(
                            status: isActive ? 'inactive' : 'active');
                      }
                    }),
                child: Text(isActive ? 'Deactivate' : 'Activate',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isActive
                            ? SellerTheme.errorRed
                            : SellerTheme.successGreen))),
          ],
        ]),
      ]),
    );
  }

  void _showInviteDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding:
            EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(
                    child: SizedBox(
                        width: 40,
                        height: 4,
                        child: DecoratedBox(
                            decoration: BoxDecoration(
                                color: SellerTheme.border,
                                borderRadius:
                                    BorderRadius.all(Radius.circular(2)))))),
                const SizedBox(height: 16),
                const Text('Invite Staff Member',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                TextField(
                    decoration: InputDecoration(
                        labelText: 'Email Address',
                        prefixIcon: const Icon(Icons.email, size: 20),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                TextField(
                    decoration: InputDecoration(
                        labelText: 'Full Name',
                        prefixIcon: const Icon(Icons.person, size: 20),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: 'Staff',
                  items: ['Manager', 'Staff']
                      .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                      .toList(),
                  onChanged: (_) {},
                  decoration: InputDecoration(
                      labelText: 'Role',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12))),
                ),
                const SizedBox(height: 16),
                SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: _mp,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          elevation: 0),
                      child: const Text('Send Invitation',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700)),
                    )),
                const SizedBox(height: 8),
              ]),
        ),
      ),
    );
  }
}

class _Staff {
  final String name, email, role, avatar, status, lastActive;
  final List<String> permissions;
  const _Staff(
      {required this.name,
      required this.email,
      required this.role,
      required this.avatar,
      required this.status,
      required this.permissions,
      required this.lastActive});
  _Staff copyWith({String? status}) => _Staff(
      name: name,
      email: email,
      role: role,
      avatar: avatar,
      status: status ?? this.status,
      permissions: permissions,
      lastActive: lastActive);
}
