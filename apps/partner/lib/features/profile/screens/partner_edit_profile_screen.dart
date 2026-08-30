import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_event.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';

/// Edit Profile Screen — Pre-populates fields from PartnerBloc state.
///
/// On save, dispatches [UpdatePartnerProfile] with the modified profile.
class PartnerEditProfileScreen extends StatefulWidget {
  const PartnerEditProfileScreen({super.key});
  @override
  State<PartnerEditProfileScreen> createState() => _PartnerEditProfileScreenState();
}

class _PartnerEditProfileScreenState extends State<PartnerEditProfileScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _emergencyCtrl;

  @override
  void initState() {
    super.initState();
    final profile = context.read<PartnerBloc>().state.profile;
    _nameCtrl = TextEditingController(text: profile.name);
    _phoneCtrl = TextEditingController(text: profile.mobile);
    _emailCtrl = TextEditingController(text: profile.email);
    _addressCtrl = TextEditingController(text: profile.address);
    _emergencyCtrl = TextEditingController(text: profile.emergencyContact ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _emergencyCtrl.dispose();
    super.dispose();
  }

  void _save() {
    final profile = context.read<PartnerBloc>().state.profile;
    final updated = profile.copyWith(
      name: _nameCtrl.text.trim(),
      mobile: _phoneCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      address: _addressCtrl.text.trim(),
      emergencyContact: _emergencyCtrl.text.trim().isEmpty ? null : _emergencyCtrl.text.trim(),
    );
    context.read<PartnerBloc>().add(UpdatePartnerProfile(updated));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile updated'), backgroundColor: PartnerTheme.onlineGreen),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(
            backgroundColor: Colors.white, elevation: 0,
            title: const Text('Edit Profile'),
            leading: const BackButton(color: PartnerTheme.textPrimary),
          ),
          body: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              Center(child: Stack(children: [
                CircleAvatar(
                  radius: 48,
                  backgroundColor: PartnerTheme.primaryLight,
                  backgroundImage: state.profile.profilePhoto != null
                      ? NetworkImage(state.profile.profilePhoto!)
                      : null,
                  child: state.profile.profilePhoto == null
                      ? Text(
                          state.profile.name.isNotEmpty ? state.profile.name[0].toUpperCase() : 'P',
                          style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: PartnerTheme.primary),
                        )
                      : null,
                ),
                Positioned(
                  bottom: 0, right: 0,
                  child: Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: PartnerTheme.primary, shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                  ),
                ),
              ])),
              const SizedBox(height: 24),
              _field('Full Name', _nameCtrl, Icons.person_outline),
              _field('Phone Number', _phoneCtrl, Icons.phone_outlined),
              _field('Email', _emailCtrl, Icons.email_outlined),
              _field('Address', _addressCtrl, Icons.location_on_outlined),
              _field('Emergency Contact', _emergencyCtrl, Icons.contacts_outlined),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity, height: 54,
                child: ElevatedButton(
                  onPressed: state.isLoading ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PartnerTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: state.isLoading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('Save Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ]),
          ),
        );
      },
    );
  }

  Widget _field(String label, TextEditingController controller, IconData icon) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary)),
      const SizedBox(height: 6),
      TextFormField(
        controller: controller,
        decoration: InputDecoration(
          prefixIcon: Icon(icon, size: 20, color: PartnerTheme.textMuted),
          filled: true, fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
        ),
      ),
    ]),
  );
}
