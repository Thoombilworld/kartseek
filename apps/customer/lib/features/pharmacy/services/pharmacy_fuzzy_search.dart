import 'dart:math';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';

/// Local fuzzy search for medicine names using Levenshtein distance.
///
/// Handles phonetic misspellings common in voice search, e.g.:
///   • "parasitamol" → Paracetamol (distance: 2)
///   • "setrizin" → Cetirizine (distance: 3)
///   • "amoxicilin" → Amoxicillin (distance: 1)
///   • "metforman" → Metformin (distance: 2)
class PharmacyFuzzySearch {
  PharmacyFuzzySearch._();

  // ── Levenshtein Distance ─────────────────────────────────────────────────

  /// Compute the edit distance between two strings.
  /// Returns the minimum number of insertions, deletions, and substitutions
  /// needed to transform [a] into [b].
  static int levenshtein(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    final la = a.length;
    final lb = b.length;

    // Use a single row for space efficiency (O(min(m,n)) space)
    List<int> prev = List.generate(lb + 1, (j) => j);
    List<int> curr = List.filled(lb + 1, 0);

    for (int i = 1; i <= la; i++) {
      curr[0] = i;
      for (int j = 1; j <= lb; j++) {
        final cost = a[i - 1] == b[j - 1] ? 0 : 1;
        curr[j] = [
          prev[j] + 1,       // deletion
          curr[j - 1] + 1,   // insertion
          prev[j - 1] + cost, // substitution
        ].reduce(min);
      }
      // Swap rows
      final tmp = prev;
      prev = curr;
      curr = tmp;
    }

    return prev[lb];
  }

  // ── Normalized Score ─────────────────────────────────────────────────────

  /// Returns a similarity score between 0.0 (no match) and 1.0 (exact match).
  static double similarity(String a, String b) {
    if (a.isEmpty && b.isEmpty) return 1.0;
    final maxLen = max(a.length, b.length);
    if (maxLen == 0) return 1.0;
    return 1.0 - (levenshtein(a, b) / maxLen);
  }

  // ── Phonetic Normalization ───────────────────────────────────────────────

  /// Normalize a string for phonetic comparison.
  /// Removes common suffixes, collapses double letters, and normalizes
  /// vowel patterns that cause voice recognition confusion.
  static String _normalize(String input) {
    var s = input.toLowerCase().trim();

    // Remove common non-informative suffixes
    final suffixes = ['tablet', 'tablets', 'capsule', 'capsules', 'syrup',
                      'cream', 'mg', 'ml', 'gm', 'drops'];
    for (final suffix in suffixes) {
      if (s.endsWith(' $suffix')) {
        s = s.substring(0, s.length - suffix.length - 1).trim();
      }
    }

    // Collapse common double letters
    s = s.replaceAll(RegExp(r'(.)\1'), r'$1');

    // Normalize common phonetic confusions
    s = s.replaceAll('ph', 'f')
         .replaceAll('ck', 'k')
         .replaceAll('ci', 'si')
         .replaceAll('ce', 'se')
         .replaceAll('tion', 'shun')
         .replaceAll('sion', 'shun');

    return s;
  }

  // ── Fuzzy Match ──────────────────────────────────────────────────────────

  /// Find products that fuzzy-match the [query] within the given [products].
  ///
  /// Returns a list sorted by match quality (best matches first).
  /// [maxDistance] controls how many character edits are tolerated:
  ///   • For short queries (≤5 chars): max 1 edit
  ///   • For medium queries (6–10 chars): max 2 edits
  ///   • For long queries (>10 chars): up to [maxDistance] edits
  static List<FuzzyMatch> fuzzyMatch(
    String query,
    List<PharmacyProduct> products, {
    int maxDistance = 3,
  }) {
    if (query.trim().isEmpty) return [];

    final normalizedQuery = _normalize(query);
    final queryLen = normalizedQuery.length;

    // Adaptive threshold based on query length
    final threshold = queryLen <= 5
        ? 1
        : queryLen <= 10
            ? 2
            : maxDistance;

    final results = <FuzzyMatch>[];

    for (final product in products) {
      int bestDistance = 999;
      String matchedField = 'name';

      // Check product name
      final nameNorm = _normalize(product.name);
      final nameDist = levenshtein(normalizedQuery, nameNorm);
      if (nameDist < bestDistance) {
        bestDistance = nameDist;
        matchedField = 'name';
      }

      // Check generic name
      if (product.genericName != null && product.genericName!.isNotEmpty) {
        final genNorm = _normalize(product.genericName!);
        final genDist = levenshtein(normalizedQuery, genNorm);
        if (genDist < bestDistance) {
          bestDistance = genDist;
          matchedField = 'generic';
        }
      }

      // Check brand
      final brandNorm = _normalize(product.brand);
      final brandDist = levenshtein(normalizedQuery, brandNorm);
      if (brandDist < bestDistance) {
        bestDistance = brandDist;
        matchedField = 'brand';
      }

      // Also check contains (for partial voice matches like "para" in "paracetamol")
      if (nameNorm.contains(normalizedQuery) || normalizedQuery.contains(nameNorm)) {
        bestDistance = min(bestDistance, 1);
        matchedField = 'partial';
      }

      if (bestDistance <= threshold) {
        results.add(FuzzyMatch(
          product: product,
          distance: bestDistance,
          similarity: 1.0 - (bestDistance / max(queryLen, 1)),
          matchedField: matchedField,
          correctedQuery: bestDistance > 0 ? product.name : null,
        ));
      }
    }

    // Sort by distance (best first), then by price (lower = more accessible)
    results.sort((a, b) {
      final distCmp = a.distance.compareTo(b.distance);
      if (distCmp != 0) return distCmp;
      return a.product.price.compareTo(b.product.price);
    });

    return results;
  }

  /// Quick check: does the query have a close-enough fuzzy match?
  static bool hasFuzzyMatch(String query, List<PharmacyProduct> products) {
    return fuzzyMatch(query, products).isNotEmpty;
  }

  /// Get the best single suggestion for "Did you mean...?"
  static String? bestSuggestion(String query, List<PharmacyProduct> products) {
    final matches = fuzzyMatch(query, products);
    if (matches.isEmpty) return null;
    final best = matches.first;
    // Only suggest if there's an actual correction (distance > 0)
    if (best.distance == 0) return null;
    return best.product.name;
  }
}

/// A fuzzy match result with scoring metadata.
class FuzzyMatch {
  final PharmacyProduct product;
  final int distance;
  final double similarity;
  final String matchedField;  // 'name', 'generic', 'brand', 'partial'
  final String? correctedQuery;  // The corrected name, if different from query

  const FuzzyMatch({
    required this.product,
    required this.distance,
    required this.similarity,
    required this.matchedField,
    this.correctedQuery,
  });
}
