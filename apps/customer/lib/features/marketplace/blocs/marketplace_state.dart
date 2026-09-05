import 'package:equatable/equatable.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';

/// Status enum shared across all marketplace BLoC states.
enum MarketplaceStatus {
  initial,
  loading,
  success,
  empty,
  error,
  refreshing,
  paginationLoading,
}

/// Generic marketplace BLoC state.
/// Use a specific typed alias (e.g. [MarketplaceHomeState]) for clarity.
class MarketplaceState<T> extends Equatable {
  final MarketplaceStatus status;
  final T? data;
  final String? errorMessage;
  final int currentPage;
  final bool hasMore;

  const MarketplaceState({
    this.status = MarketplaceStatus.initial,
    this.data,
    this.errorMessage,
    this.currentPage = 1,
    this.hasMore = true,
  });

  MarketplaceState<T> copyWith({
    MarketplaceStatus? status,
    T? data,
    String? errorMessage,
    int? currentPage,
    bool? hasMore,
  }) =>
      MarketplaceState<T>(
        status: status ?? this.status,
        data: data ?? this.data,
        errorMessage: errorMessage ?? this.errorMessage,
        currentPage: currentPage ?? this.currentPage,
        hasMore: hasMore ?? this.hasMore,
      );

  bool get isLoading => status == MarketplaceStatus.loading;
  bool get isSuccess => status == MarketplaceStatus.success;
  bool get isEmpty => status == MarketplaceStatus.empty;
  bool get isError => status == MarketplaceStatus.error;
  bool get isRefreshing => status == MarketplaceStatus.refreshing;
  bool get isPaginationLoading => status == MarketplaceStatus.paginationLoading;

  @override
  List<Object?> get props => [status, data, errorMessage, currentPage, hasMore];
}

// ── Typed Aliases ──────────────────────────────────────────────────────────
typedef MarketplaceHomeState = MarketplaceState<MarketplaceHomeData>;
typedef CategoryListState = MarketplaceState<List<CategoryModel>>;
typedef ProductListState = MarketplaceState<List<ProductModel>>;
typedef ProductDetailState = MarketplaceState<ProductModel>;
typedef CartState = MarketplaceState<List<CartItemModel>>;
typedef WishlistState = MarketplaceState<List<ProductModel>>;
typedef OrderListState = MarketplaceState<List<OrderModel>>;
typedef OrderDetailState = MarketplaceState<OrderModel>;
typedef BrandListState = MarketplaceState<List<BrandModel>>;
typedef SellerListState = MarketplaceState<List<SellerModel>>;
typedef SearchState = MarketplaceState<List<ProductModel>>;
typedef ReviewListState = MarketplaceState<List<ProductReview>>;
