import 'package:dio/dio.dart';

/// A marketplace API call that did not succeed.
///
/// Every read in `MarketplaceApiService` used to answer a failed request with
/// bundled mock data — a whole fabricated storefront, complete with prices a
/// customer could try to pay. The screens could not tell that from a real
/// catalogue, and neither could anyone testing the app: an outage looked like a
/// well-stocked shop.
///
/// Failures now travel as this exception so the screen can say what happened
/// and offer a retry. [message] is written for a customer to read, not a
/// developer: [MarketplaceErrorState] renders it directly.
class MarketplaceApiException implements Exception {
  MarketplaceApiException(this.message, {this.statusCode, this.cause, this.isOffline = false});

  /// Customer-facing sentence. No jargon, no status codes, no stack traces.
  final String message;

  /// HTTP status when the server answered at all.
  final int? statusCode;

  /// The underlying error, for logs.
  final Object? cause;

  /// True when the request never reached the server — worth a different
  /// message, because retrying is genuinely likely to help.
  final bool isOffline;

  /// Build one from whatever Dio threw.
  ///
  /// The distinction that matters to a customer is: is it my connection, is the
  /// thing I asked for missing, or is it broken at their end. Everything else
  /// collapses into the last case.
  factory MarketplaceApiException.from(Object error, {String? subject}) {
    final what = subject ?? 'this';

    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return MarketplaceApiException(
            'That took too long to load. Check your connection and try again.',
            cause: error,
            isOffline: true,
          );
        case DioExceptionType.connectionError:
        case DioExceptionType.unknown:
          return MarketplaceApiException(
            "We couldn't reach KARTSEEK. Check your connection and try again.",
            cause: error,
            isOffline: true,
          );
        case DioExceptionType.cancel:
          return MarketplaceApiException('Request cancelled.', cause: error);
        case DioExceptionType.badCertificate:
          return MarketplaceApiException(
            "We couldn't verify a secure connection. Please try again on a trusted network.",
            cause: error,
          );
        case DioExceptionType.badResponse:
          final status = error.response?.statusCode;
          if (status == 404) {
            return MarketplaceApiException(
              "We couldn't find $what.",
              statusCode: status,
              cause: error,
            );
          }
          if (status == 401 || status == 403) {
            return MarketplaceApiException(
              'Please sign in again to continue.',
              statusCode: status,
              cause: error,
            );
          }
          return MarketplaceApiException(
            "Something went wrong loading $what. Please try again.",
            statusCode: status,
            cause: error,
          );
      }
    }

    return MarketplaceApiException(
      "Something went wrong loading $what. Please try again.",
      cause: error,
    );
  }

  @override
  String toString() => 'MarketplaceApiException($message${statusCode != null ? ', status $statusCode' : ''})';
}
