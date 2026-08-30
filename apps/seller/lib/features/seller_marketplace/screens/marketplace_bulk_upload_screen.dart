import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Bulk Upload — CSV/Excel product import with template download, validation, and progress.
class MarketplaceBulkUploadScreen extends StatefulWidget {
  const MarketplaceBulkUploadScreen({super.key});

  @override
  State<MarketplaceBulkUploadScreen> createState() =>
      _MarketplaceBulkUploadScreenState();
}

class _MarketplaceBulkUploadScreenState
    extends State<MarketplaceBulkUploadScreen> {
  static const _mp = Color(0xFF6C3FC8);
  bool _fileSelected = false;
  bool _uploading = false;
  bool _validating = false;
  bool _completed = false;
  double _progress = 0;
  String _fileName = '';
  int _totalRows = 0;
  int _validRows = 0;
  int _errorRows = 0;

  final List<_UploadError> _errors = [];

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Bulk Upload · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _buildInstructionsCard(),
                const SizedBox(height: 16),
                _buildTemplateCard(),
                const SizedBox(height: 16),
                _buildUploadZone(),
                if (_fileSelected) ...[
                  const SizedBox(height: 16),
                  _buildFileCard(),
                ],
                if (_validating || _uploading || _completed) ...[
                  const SizedBox(height: 16),
                  _buildProgressCard(),
                ],
                if (_errors.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _buildErrorsCard(),
                ],
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Instructions ────────────────────────────────────────────────────────────

  Widget _buildInstructionsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.info_outline, color: _mp, size: 20),
            SizedBox(width: 8),
            Text('How It Works',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 14),
          _step('1', 'Download the CSV template below'),
          _step('2',
              'Fill in your product details (name, price, stock, category, etc.)'),
          _step('3', 'Upload the completed file'),
          _step('4', 'Review validation results and fix any errors'),
          _step('5', 'Submit for approval — products go live once approved'),
        ],
      ),
    );
  }

  Widget _step(String num, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Center(
                child: Text(num,
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _mp))),
          ),
          const SizedBox(width: 10),
          Expanded(
              child: Text(text,
                  style: const TextStyle(
                      fontSize: 13, color: SellerTheme.textSecondary))),
        ],
      ),
    );
  }

  // ── Template Download ───────────────────────────────────────────────────────

  Widget _buildTemplateCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: SellerTheme.successGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12)),
            child:
                const Icon(Icons.table_chart, color: SellerTheme.successGreen),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('CSV Template',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              Text('Download the required format',
                  style: TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
            ]),
          ),
          ElevatedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: const Text('Template downloaded'),
                backgroundColor: SellerTheme.successGreen,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ));
            },
            icon: const Icon(Icons.download, size: 18),
            label: const Text('Download'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _mp,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
          ),
        ],
      ),
    );
  }

  // ── Upload Zone ─────────────────────────────────────────────────────────────

  Widget _buildUploadZone() {
    return GestureDetector(
      onTap: _handleSelectFile,
      child: Container(
        height: 160,
        decoration: BoxDecoration(
          color: _mp.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: _mp.withValues(alpha: 0.3),
              width: 2,
              strokeAlign: BorderSide.strokeAlignInside),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.cloud_upload_outlined,
              size: 44, color: _mp.withValues(alpha: 0.5)),
          const SizedBox(height: 10),
          const Text('Tap to select CSV file',
              style: TextStyle(
                  color: _mp, fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 4),
          const Text('Supports .csv and .xlsx — Max 5,000 rows',
              style: TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
      ),
    );
  }

  // ── File Card ───────────────────────────────────────────────────────────────

  Widget _buildFileCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: SellerTheme.cardDecoration(),
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
              color: _mp.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.description, color: _mp, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_fileName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          Text('$_totalRows products detected',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ])),
        if (!_uploading && !_completed) ...[
          IconButton(
              icon: const Icon(Icons.delete_outline,
                  color: SellerTheme.errorRed, size: 20),
              onPressed: () => setState(() {
                    _fileSelected = false;
                    _errors.clear();
                    _completed = false;
                    _validating = false;
                  })),
          const SizedBox(width: 4),
          ElevatedButton(
            onPressed: _handleUpload,
            style: ElevatedButton.styleFrom(
                backgroundColor: _mp,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10))),
            child: const Text('Upload'),
          ),
        ],
      ]),
    );
  }

  // ── Progress ────────────────────────────────────────────────────────────────

  Widget _buildProgressCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          if (_completed)
            const Icon(Icons.check_circle,
                color: SellerTheme.successGreen, size: 22)
          else
            SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: _mp,
                    value: _validating ? null : _progress)),
          const SizedBox(width: 10),
          Text(
            _completed
                ? 'Upload Complete'
                : _validating
                    ? 'Validating...'
                    : 'Uploading... ${(_progress * 100).toInt()}%',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
        ]),
        if (!_validating) ...[
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
                value: _progress,
                backgroundColor: SellerTheme.border,
                color: _completed ? SellerTheme.successGreen : _mp,
                minHeight: 6),
          ),
        ],
        if (_completed) ...[
          const SizedBox(height: 14),
          Row(children: [
            _statChip('$_validRows Valid', SellerTheme.successGreen),
            const SizedBox(width: 8),
            _statChip('$_errorRows Errors',
                _errorRows > 0 ? SellerTheme.errorRed : SellerTheme.textMuted),
            const SizedBox(width: 8),
            _statChip('$_totalRows Total', SellerTheme.infoBlue),
          ]),
        ],
      ]),
    );
  }

  Widget _statChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8)),
      child: Text(text,
          style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600, color: color)),
    );
  }

  // ── Errors ──────────────────────────────────────────────────────────────────

  Widget _buildErrorsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.warning_amber,
              color: SellerTheme.warningAmber, size: 20),
          const SizedBox(width: 8),
          Text('${_errors.length} Validation Errors',
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 12),
        ..._errors.map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Row ${e.row}:',
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: SellerTheme.errorRed)),
                const SizedBox(width: 6),
                Expanded(
                    child: Text(e.message,
                        style: const TextStyle(
                            fontSize: 12, color: SellerTheme.textSecondary))),
              ]),
            )),
      ]),
    );
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  void _handleSelectFile() {
    setState(() {
      _fileSelected = true;
      _fileName = 'marketplace_products_batch_26jun2026.csv';
      _totalRows = 48;
      _completed = false;
      _uploading = false;
      _validating = false;
      _errors.clear();
    });
  }

  Future<void> _handleUpload() async {
    setState(() {
      _validating = true;
      _uploading = true;
      _progress = 0;
    });
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() => _validating = false);

    for (int i = 1; i <= 10; i++) {
      await Future.delayed(const Duration(milliseconds: 150));
      setState(() => _progress = i / 10);
    }

    setState(() {
      _uploading = false;
      _completed = true;
      _validRows = 45;
      _errorRows = 3;
      _errors.addAll([
        const _UploadError(row: 12, message: 'Missing required field: price'),
        const _UploadError(
            row: 28, message: 'Invalid category: "Electonics" (typo?)'),
        const _UploadError(
            row: 41, message: 'Stock value must be a positive integer'),
      ]);
    });
  }
}

class _UploadError {
  final int row;
  final String message;
  const _UploadError({required this.row, required this.message});
}
