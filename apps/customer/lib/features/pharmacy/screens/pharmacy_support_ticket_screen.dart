import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Pharmacy support ticket screen — create and track support requests.
class PharmacySupportTicketScreen extends StatefulWidget {
  final String? orderId;
  const PharmacySupportTicketScreen({super.key, this.orderId});
  @override
  State<PharmacySupportTicketScreen> createState() =>
      _PharmacySupportTicketScreenState();
}

class _PharmacySupportTicketScreenState
    extends State<PharmacySupportTicketScreen> {
  final _subjectCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _category = 'General';
  String _priority = 'Medium';
  bool _submitting = false;

  final _categories = [
    'General',
    'Order Issue',
    'Prescription',
    'Refund',
    'Delivery',
    'Payment',
    'Medicine Quality',
    'App Bug'
  ];
  final _priorities = ['Low', 'Medium', 'High', 'Urgent'];

  // Mock existing tickets
  final _existingTickets = [
    ('TK-4521', 'Refund not received', 'Open', 'High', '2 hours ago'),
    ('TK-4498', 'Wrong medicine delivered', 'Resolved', 'Medium', '3 days ago'),
    (
      'TK-4410',
      'Prescription verification delay',
      'Closed',
      'Low',
      '1 week ago'
    ),
  ];

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subjectCtrl.text.trim().isEmpty || _descCtrl.text.trim().isEmpty) {
      return;
    }
    setState(() => _submitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('Ticket created — TK-4522'),
        backgroundColor: Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ));
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Colors.grey.shade50,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              onPressed: () => Navigator.pop(context)),
          title: const Text('Support',
              style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87)),
          bottom: TabBar(
            labelColor: AppTheme.pharmacyColor,
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: AppTheme.pharmacyColor,
            indicatorWeight: 3,
            labelStyle:
                const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            tabs: const [Tab(text: 'New Ticket'), Tab(text: 'My Tickets')],
          ),
        ),
        body: TabBarView(children: [
          // New ticket
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (widget.orderId != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                      color: AppTheme.pharmacyColor.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    const Icon(Icons.receipt_long,
                        color: AppTheme.pharmacyColor, size: 20),
                    const SizedBox(width: 10),
                    Text('Related to order #${widget.orderId}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: AppTheme.pharmacyColor)),
                  ]),
                ),
                const SizedBox(height: 16),
              ],

              // Category
              const Text('Category',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200)),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _category,
                    isExpanded: true,
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _category = v!),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Priority
              const Text('Priority',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 8),
              Wrap(
                  spacing: 8,
                  children: _priorities.map((p) {
                    final selected = _priority == p;
                    final color = p == 'Urgent'
                        ? Colors.red
                        : p == 'High'
                            ? Colors.orange
                            : p == 'Medium'
                                ? Colors.blue
                                : Colors.grey;
                    return ChoiceChip(
                      label: Text(p),
                      selected: selected,
                      selectedColor: color.shade50,
                      labelStyle: TextStyle(
                          color:
                              selected ? color.shade700 : Colors.grey.shade600,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      onSelected: (_) => setState(() => _priority = p),
                    );
                  }).toList()),
              const SizedBox(height: 16),

              // Subject
              const Text('Subject',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 8),
              TextField(
                controller: _subjectCtrl,
                decoration: InputDecoration(
                  hintText: 'Brief summary of your issue',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200)),
                ),
              ),
              const SizedBox(height: 16),

              // Description
              const Text('Description',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 8),
              TextField(
                controller: _descCtrl,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: 'Describe the issue in detail...',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200)),
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                height: 54,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.pharmacyColor,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14))),
                  child: _submitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.5, color: Colors.white))
                      : const Text('Submit Ticket',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),

          // Existing tickets
          ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _existingTickets.length,
            itemBuilder: (_, i) {
              final (id, subject, status, priority, time) = _existingTickets[i];
              final statusColor = status == 'Open'
                  ? Colors.green
                  : status == 'Resolved'
                      ? Colors.blue
                      : Colors.grey;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text(id,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: AppTheme.pharmacyColor)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                              color: statusColor.shade50,
                              borderRadius: BorderRadius.circular(6)),
                          child: Text(status,
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: statusColor.shade700)),
                        ),
                      ]),
                      const SizedBox(height: 8),
                      Text(subject,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 6),
                      Row(children: [
                        Text('Priority: $priority',
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade500)),
                        const Spacer(),
                        Text(time,
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade400)),
                      ]),
                    ]),
              );
            },
          ),
        ]),
      ),
    );
  }
}
