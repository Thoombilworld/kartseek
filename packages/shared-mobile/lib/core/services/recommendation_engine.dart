import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/services/user_behavior_service.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:shared_mobile/features/marketplace/services/marketplace_mock_data.dart';

/// KARTSEEK — Personalized Recommendation Engine
///
/// Produces scored product recommendations based on:
///   1. **Category Affinity** — weighted by view/purchase frequency
///   2. **Brand Affinity** — products from frequently viewed brands
///   3. **Price Range Preference** — within user's typical spending range
///   4. **Search Relevance** — products matching recent search keywords
///   5. **Recency Decay** — recent interactions weigh more than older ones
///   6. **Diversity** — ensures category variety in the final list
///
/// Refactored to execute calculations off the main UI thread using isolates
/// via Flutter's [compute] method.
class RecommendationEngine {
  RecommendationEngine._() {
    // Initial sync load to populate cache immediately on startup
    _loadRecommendationsSync();
  }
  static final RecommendationEngine instance = RecommendationEngine._();

  // ── Scoring Weights ───────────────────────────────────────────────────────
  static const double _wCategory = 35.0;
  static const double _wBrand = 20.0;
  static const double _wPrice = 15.0;
  static const double _wSearch = 20.0;
  static const double _wPopularity = 10.0;

  // ── Cached Recommendations ────────────────────────────────────────────────
  List<ScoredProduct> _cachedRecommendations = [];
  bool _isComputing = false;

  /// Get currently cached recommendations.
  List<ScoredProduct> get cachedRecommendations => _cachedRecommendations;

  /// Synchronously loads recommendations on creation for instant availability.
  void _loadRecommendationsSync() {
    final behavior = UserBehaviorService.instance;
    final allProducts = MarketplaceMockData.allProducts;
    if (allProducts.isEmpty) return;

    final (minPrice, maxPrice) = behavior.priceRangePreference;
    final params = RecommendationParams(
      allProducts: allProducts,
      categoryViews: Map<String, int>.from(behavior.categoryViews),
      brandViews: Map<String, int>.from(behavior.brandViews),
      minPrice: minPrice,
      maxPrice: maxPrice,
      recentSearches: List<String>.from(behavior.recentSearchQueries),
      viewedProductIds: behavior.viewHistory.map((v) => v.productId).toSet(),
      limit: 30,
    );
    _cachedRecommendations = _computeRecommendationsTask(params);
  }

  /// Asynchronously refresh recommendations using a background Isolate.
  Future<List<ScoredProduct>> refreshRecommendations({int limit = 30}) async {
    if (_isComputing) return _cachedRecommendations;
    _isComputing = true;

    try {
      final behavior = UserBehaviorService.instance;
      final allProducts = MarketplaceMockData.allProducts;

      if (allProducts.isEmpty) {
        _isComputing = false;
        return [];
      }

      final (minPrice, maxPrice) = behavior.priceRangePreference;
      final params = RecommendationParams(
        allProducts: allProducts,
        categoryViews: Map<String, int>.from(behavior.categoryViews),
        brandViews: Map<String, int>.from(behavior.brandViews),
        minPrice: minPrice,
        maxPrice: maxPrice,
        recentSearches: List<String>.from(behavior.recentSearchQueries),
        viewedProductIds: behavior.viewHistory.map((v) => v.productId).toSet(),
        limit: limit,
      );

      // Execute computation in background isolate
      final results = await compute(_computeRecommendationsTask, params);
      _cachedRecommendations = results;
      debugPrint('[RecEngine] ⚡ Background recommendations refreshed: ${results.length} items');
      return results;
    } catch (e) {
      debugPrint('[RecEngine] ⚠️ Background computation failed, falling back to sync: $e');
      _loadRecommendationsSync();
      return _cachedRecommendations;
    } finally {
      _isComputing = false;
    }
  }

  /// Get personalized product recommendations (returns cached values immediately,
  /// and triggers a background refresh).
  List<ScoredProduct> getRecommendations({int limit = 20}) {
    // Trigger background refresh for subsequent calls
    refreshRecommendations(limit: max(limit, 30));
    
    if (_cachedRecommendations.isEmpty) {
      _loadRecommendationsSync();
    }
    return _cachedRecommendations.take(limit).toList();
  }

  /// Get recommendations for a specific category.
  List<ScoredProduct> getCategoryRecommendations(String categoryId, {int limit = 10}) {
    final recs = getRecommendations(limit: limit * 3);
    return recs.where((r) => r.product.categoryId == categoryId).take(limit).toList();
  }

  /// Get "because you searched for X" recommendations.
  List<ScoredProduct> getSearchBasedRecommendations(String query, {int limit = 10}) {
    final allProducts = MarketplaceMockData.allProducts;
    final queryLower = query.toLowerCase();
    final scored = <ScoredProduct>[];

    for (final product in allProducts) {
      double score = 0;
      final nameMatch = product.name.toLowerCase().contains(queryLower);
      final catMatch = product.categoryName.toLowerCase().contains(queryLower);
      final brandMatch = product.brand.toLowerCase().contains(queryLower);

      if (nameMatch) score += 50;
      if (catMatch) score += 30;
      if (brandMatch) score += 20;

      // Add popularity boost
      score += product.rating * 2;
      score += min(product.ratingCount / 100, 10);

      if (score > 0) {
        scored.add(ScoredProduct(
          product: product,
          score: score,
          reason: 'Based on your search "$query"',
        ));
      }
    }

    scored.sort((a, b) => b.score.compareTo(a.score));
    return scored.take(limit).toList();
  }
}

/// A product with its recommendation score and reason.
class ScoredProduct {
  final ProductModel product;
  final double score;
  final String reason;

  const ScoredProduct({required this.product, required this.score, required this.reason});

  @override
  String toString() => '${product.name} (score=${score.toStringAsFixed(1)}, reason="$reason")';
}

/// Parameter class passed to background Isolate.
class RecommendationParams {
  final List<ProductModel> allProducts;
  final Map<String, int> categoryViews;
  final Map<String, int> brandViews;
  final double minPrice;
  final double maxPrice;
  final List<String> recentSearches;
  final Set<String> viewedProductIds;
  final int limit;

  RecommendationParams({
    required this.allProducts,
    required this.categoryViews,
    required this.brandViews,
    required this.minPrice,
    required this.maxPrice,
    required this.recentSearches,
    required this.viewedProductIds,
    required this.limit,
  });
}

// ── Top-Level Background Task ────────────────────────────────────────────────

List<ScoredProduct> _computeRecommendationsTask(RecommendationParams params) {
  if (params.allProducts.isEmpty) return [];

  // If no behavior data, return trending/popular products
  if (params.viewedProductIds.isEmpty && params.recentSearches.isEmpty) {
    return _fallbackRecommendationsStatic(params.allProducts, params.limit);
  }

  // Score each product
  final scored = <ScoredProduct>[];
  for (final product in params.allProducts) {
    final score = _computeScoreStatic(product, params);
    scored.add(ScoredProduct(
      product: product,
      score: score,
      reason: _determineReasonStatic(product, params),
    ));
  }

  // Sort by score descending
  scored.sort((a, b) => b.score.compareTo(a.score));

  // Apply diversity filter (max 4 products per category in top results)
  return _applyDiversityStatic(scored, params.limit);
}

double _computeScoreStatic(ProductModel product, RecommendationParams params) {
  double score = 0;

  // 1. Category affinity score
  final catCount = params.categoryViews[product.categoryId] ?? 0;
  if (catCount > 0) {
    score += RecommendationEngine._wCategory * min(catCount / 10.0, 1.0);
  }

  // 2. Brand affinity score
  final brandCount = params.brandViews[product.brand] ?? 0;
  if (brandCount > 0) {
    score += RecommendationEngine._wBrand * min(brandCount / 5.0, 1.0);
  }

  // 3. Price range preference
  if (params.minPrice > 0 || params.maxPrice < 100000) {
    if (product.price >= params.minPrice && product.price <= params.maxPrice) {
      score += RecommendationEngine._wPrice;
    } else {
      final dist = product.price < params.minPrice
          ? (params.minPrice - product.price) / params.minPrice
          : (product.price - params.maxPrice) / params.maxPrice;
      score += RecommendationEngine._wPrice * max(0, 1.0 - dist);
    }
  } else {
    score += RecommendationEngine._wPrice * 0.5;
  }

  // 4. Search relevance
  for (final query in params.recentSearches.take(5)) {
    final qLower = query.toLowerCase();
    if (product.name.toLowerCase().contains(qLower)) {
      score += RecommendationEngine._wSearch * 0.8;
      break;
    }
    if (product.categoryName.toLowerCase().contains(qLower) ||
        product.brand.toLowerCase().contains(qLower)) {
      score += RecommendationEngine._wSearch * 0.4;
      break;
    }
  }

  // 5. Popularity boost
  score += RecommendationEngine._wPopularity * (product.rating / 5.0);

  // 6. Novelty bonus
  if (!params.viewedProductIds.contains(product.id)) {
    score *= 1.15;
  }

  // 7. Discount bonus
  if (product.discount > 0) {
    score += min(product.discount / 10.0, 3.0);
  }

  return score;
}

String _determineReasonStatic(ProductModel product, RecommendationParams params) {
  final catCount = params.categoryViews[product.categoryId] ?? 0;
  final brandCount = params.brandViews[product.brand] ?? 0;

  if (brandCount >= 3) return 'Because you like ${product.brand}';
  if (catCount >= 3) return 'Popular in ${product.categoryName}';

  for (final query in params.recentSearches.take(3)) {
    if (product.name.toLowerCase().contains(query.toLowerCase())) {
      return 'Related to "$query"';
    }
  }

  if (product.discount >= 20) return '${product.discount}% off — great deal!';
  if (product.rating >= 4.5) return 'Highly rated • ${product.rating}★';

  return 'Recommended for you';
}

List<ScoredProduct> _fallbackRecommendationsStatic(List<ProductModel> products, int limit) {
  final sorted = List<ProductModel>.from(products)
    ..sort((a, b) {
      final aScore = a.rating * 10 + a.discount;
      final bScore = b.rating * 10 + b.discount;
      return bScore.compareTo(aScore);
    });
  return sorted
      .take(limit)
      .map((p) => ScoredProduct(
            product: p,
            score: p.rating * 10 + p.discount,
            reason: p.discount >= 20 ? '${p.discount}% off' : 'Popular choice',
          ))
      .toList();
}

List<ScoredProduct> _applyDiversityStatic(List<ScoredProduct> sorted, int limit) {
  final result = <ScoredProduct>[];
  final categoryCounts = <String, int>{};
  const maxPerCategory = 4;

  for (final item in sorted) {
    if (result.length >= limit) break;
    final catId = item.product.categoryId;
    final count = categoryCounts[catId] ?? 0;
    if (count < maxPerCategory) {
      result.add(item);
      categoryCounts[catId] = count + 1;
    }
  }

  if (result.length < limit) {
    for (final item in sorted) {
      if (result.length >= limit) break;
      if (!result.contains(item)) {
        result.add(item);
      }
    }
  }

  return result;
}
