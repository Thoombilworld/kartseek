import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

class AddAddressBottomSheet extends StatefulWidget {
  const AddAddressBottomSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: const AddAddressBottomSheet(),
      ),
    );
  }

  @override
  State<AddAddressBottomSheet> createState() => _AddAddressBottomSheetState();
}

class _AddAddressBottomSheetState extends State<AddAddressBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  
  @override
  Widget build(BuildContext context) {
    final country = RegionService.instance.currentCountry;
    
    return Container(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Add New Address (${country.flag})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            _input('Full Name', Icons.person),
            const SizedBox(height: 12),
            _input('Phone Number', Icons.phone, prefix: '${country.callingCode} '),
            const SizedBox(height: 12),
            _buildDynamicFields(country),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  if (_formKey.currentState!.validate()) {
                    Navigator.pop(context, true);
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryGreen, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Save Address', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDynamicFields(SupportedCountry country) {
    switch (country) {
      case SupportedCountry.india:
        return Column(
          children: [
            _input('House No, Building, Street', Icons.home),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _input('City', Icons.location_city)),
              const SizedBox(width: 12),
              Expanded(child: _input('PIN Code', Icons.pin_drop)),
            ]),
            const SizedBox(height: 12),
            _input('State', Icons.map),
          ],
        );
      case SupportedCountry.uae:
      case SupportedCountry.qatar:
      case SupportedCountry.saudiArabia:
      case SupportedCountry.bahrain:
      case SupportedCountry.kuwait:
      case SupportedCountry.oman:
        return Column(
          children: [
            _input('Villa/Flat No, Building Name', Icons.home),
            const SizedBox(height: 12),
            _input('Street Name / Area', Icons.add_road),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _input('City / Emirate', Icons.location_city)),
              const SizedBox(width: 12),
              Expanded(child: _input('P.O. Box (Optional)', Icons.markunread_mailbox)),
            ]),
          ],
        );
      case SupportedCountry.uk:
        return Column(
          children: [
            Row(children: [
              Expanded(child: _input('House/Flat No', Icons.home)),
              const SizedBox(width: 12),
              Expanded(child: _input('Postcode', Icons.local_post_office)),
            ]),
            const SizedBox(height: 12),
            _input('Street Address', Icons.add_road),
            const SizedBox(height: 12),
            _input('Town/City', Icons.location_city),
          ],
        );
      case SupportedCountry.usa:
        return Column(
          children: [
            _input('Street Address', Icons.home),
            const SizedBox(height: 12),
            _input('Apt, Suite, Bldg (Optional)', Icons.business),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _input('City', Icons.location_city)),
              const SizedBox(width: 12),
              Expanded(child: _input('State', Icons.map)),
              const SizedBox(width: 12),
              Expanded(child: _input('Zip Code', Icons.local_post_office)),
            ]),
          ],
        );
      default:
        return Column(
          children: [
            _input('Street / Area', Icons.add_road),
            const SizedBox(height: 12),
            _input('Building / Estate / Apartment', Icons.business),
            const SizedBox(height: 12),
            _input('City / Town', Icons.location_city),
          ],
        );
    }
  }

  Widget _input(String label, IconData icon, {String? prefix}) {
    return TextFormField(
      validator: (val) {
        if (!label.contains('(Optional)') && (val == null || val.isEmpty)) {
          return 'Required';
        }
        return null;
      },
      decoration: InputDecoration(
        labelText: label,
        prefixText: prefix,
        prefixIcon: Icon(icon, size: 20, color: Colors.grey),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }
}
