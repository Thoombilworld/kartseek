import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';

/// Questions and answers about a product.
///
/// Three faults, all of the same family. The question list was four hardcoded
/// entries — "Is this phone water resistant?" answered in detail about the
/// iPhone 15 Pro — shown against whatever product the screen was opened for, so
/// a shopper looking at a saucepan read answers about a phone. The screen was
/// keyed on `productName` with 'iPhone 15 Pro' as the default. And "Submit
/// Question" did `_questions.insert(0, …)`: the question appeared at the top of
/// the list, the sheet closed, and nothing was ever sent — the customer had no
/// way to know the seller would never see it.
///
/// `getQuestions` and `createQuestion` both already existed on the client, and
/// `GET`/`POST /marketplace/products/:id/questions` both exist on the gateway.
/// Nothing called any of them.
class ProductQAScreen extends StatefulWidget {
  const ProductQAScreen({super.key, required this.productId, this.productName});

  final String productId;
  final String? productName;

  @override
  State<ProductQAScreen> createState() => _ProductQAScreenState();
}

class _ProductQAScreenState extends State<ProductQAScreen> {
  final _api = MarketplaceApiService();
  final _questionController = TextEditingController();
  final _searchController = TextEditingController();
  final _askFormKey = GlobalKey<FormState>();

  List<_QA> _questions = const [];
  bool _loading = true;
  String? _error;
  String _search = '';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _questionController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.getQuestions(widget.productId);
      final rows = (res['data'] ?? res['questions'] ?? const []) as List;
      if (!mounted) return;
      setState(() {
        _questions = rows.whereType<Map>().map((raw) {
          final q = Map<String, dynamic>.from(raw);
          final answers = (q['answers'] as List?) ?? const [];
          final first = answers.isNotEmpty && answers.first is Map
              ? Map<String, dynamic>.from(answers.first as Map)
              : null;
          return _QA(
            question: (q['question'] ?? q['text'] ?? '').toString(),
            askedBy: (q['askedByName'] ?? q['customerName'] ?? 'Customer').toString(),
            date: _formatDate(q['createdAt']),
            answer: first?['answer']?.toString() ?? first?['text']?.toString(),
            answeredBy: first?['answeredByName']?.toString() ?? (first != null ? 'Seller' : null),
            votes: (q['upvotes'] as num?)?.toInt() ?? 0,
          );
        }).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is MarketplaceApiException
            ? e.message
            : "We couldn't load questions for this product. Please try again.";
      });
    }
  }

  static String _formatDate(Object? raw) {
    final parsed = DateTime.tryParse(raw?.toString() ?? '');
    if (parsed == null) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final local = parsed.toLocal();
    return '${months[local.month - 1]} ${local.day}';
  }

  /// Post the question, then reload so the list matches the server.
  Future<void> _submitQuestion(BuildContext sheetContext) async {
    if (!(_askFormKey.currentState?.validate() ?? false)) return;

    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await _api.createQuestion(
        productId: widget.productId,
        questionText: _questionController.text.trim(),
      );
      _questionController.clear();
      if (sheetContext.mounted) Navigator.pop(sheetContext);
      messenger
        ..clearSnackBars()
        ..showSnackBar(const SnackBar(
            content: Text('Question sent — the seller will be notified.'),
            behavior: SnackBarBehavior.floating));
      await _load();
    } catch (e) {
      messenger
        ..clearSnackBars()
        ..showSnackBar(SnackBar(
            content: Text(e is MarketplaceApiException
                ? e.message
                : "We couldn't send your question. Your text is still here — try again."),
            behavior: SnackBarBehavior.floating));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  List<_QA> get _visible {
    if (_search.trim().isEmpty) return _questions;
    final q = _search.toLowerCase();
    return _questions
        .where((item) =>
            item.question.toLowerCase().contains(q) ||
            (item.answer?.toLowerCase().contains(q) ?? false))
        .toList();
  }

  void _openAskSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _askFormKey,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Ask a question',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 12),
              TextFormField(
                controller: _questionController,
                maxLines: 3,
                maxLength: 500,
                autofocus: true,
                validator: (v) {
                  final t = (v ?? '').trim();
                  if (t.isEmpty) return 'Type your question first.';
                  if (t.length < 10) return 'Add a little more detail — at least 10 characters.';
                  return null;
                },
                decoration: InputDecoration(
                  hintText: 'What would you like to know about this product?',
                  hintStyle: const TextStyle(color: AppTheme.textMuted),
                  filled: true,
                  fillColor: AppTheme.surfaceWhite,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.borderLight)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.marketplaceColor)),
                ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : () => _submitQuestion(sheetContext),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.marketplaceColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Submit question',
                          style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 8),
            ]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text(widget.productName ?? 'Questions & Answers',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAskSheet,
        backgroundColor: AppTheme.marketplaceColor,
        icon: const Icon(Icons.help_outline, color: Colors.white),
        label: const Text('Ask', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(onRefresh: _load, child: _body()),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(strokeWidth: 2));

    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          MarketplaceErrorState(message: _error!, onRetry: _load),
        ],
      );
    }

    final visible = _visible;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        if (_questions.isNotEmpty)
          TextField(
            controller: _searchController,
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Search questions...',
              hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 14),
              prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.borderLight)),
            ),
          ),
        const SizedBox(height: 16),
        if (_questions.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 60),
            child: Column(children: [
              Icon(Icons.forum_outlined, size: 48, color: AppTheme.textMuted),
              SizedBox(height: 12),
              Text('No questions yet',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              SizedBox(height: 4),
              Text('Be the first to ask about this product.',
                  style: AppTheme.caption, textAlign: TextAlign.center),
            ]),
          )
        else if (visible.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 48),
            child: Text('No questions match "$_search".',
                textAlign: TextAlign.center, style: AppTheme.caption),
          )
        else
          ...visible.map(_questionCard),
      ],
    );
  }

  Widget _questionCard(_QA qa) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Padding(
            padding: EdgeInsets.only(top: 2, right: 8),
            child: Text('Q', style: TextStyle(fontWeight: FontWeight.w900, color: AppTheme.marketplaceColor)),
          ),
          Expanded(
            child: Text(qa.question,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.4)),
          ),
        ]),
        const SizedBox(height: 4),
        Text(
          [qa.askedBy, if (qa.date.isNotEmpty) qa.date].join(' • '),
          style: AppTheme.caption,
        ),
        if (qa.answer != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.surfaceWhite,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(qa.answer!, style: const TextStyle(fontSize: 13, height: 1.5)),
              const SizedBox(height: 6),
              Text(qa.answeredBy ?? 'Seller',
                  style: AppTheme.caption.copyWith(fontWeight: FontWeight.w700)),
            ]),
          ),
        ] else ...[
          const SizedBox(height: 10),
          const Text('Not answered yet', style: AppTheme.caption),
        ],
      ]),
    );
  }
}

class _QA {
  const _QA({
    required this.question,
    required this.askedBy,
    required this.date,
    required this.answer,
    required this.answeredBy,
    required this.votes,
  });

  final String question;
  final String askedBy;
  final String date;
  final String? answer;
  final String? answeredBy;
  final int votes;
}
