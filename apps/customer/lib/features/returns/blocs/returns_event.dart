import 'package:equatable/equatable.dart';

/// Events for the Returns module BLoC.
abstract class ReturnsEvent extends Equatable {
  const ReturnsEvent();
  @override
  List<Object?> get props => [];
}

/// Load return requests.
class LoadReturns extends ReturnsEvent {
  const LoadReturns();
}

/// Initiate a return request for an order.
class RequestReturn extends ReturnsEvent {
  final String orderId;
  final String reason;
  final List<String> itemIds;
  final String returnType; // 'refund', 'exchange', 'store_credit'

  const RequestReturn({
    required this.orderId,
    required this.reason,
    required this.itemIds,
    this.returnType = 'refund',
  });

  @override
  List<Object?> get props => [orderId, reason, itemIds, returnType];
}

/// Cancel a return request.
class CancelReturn extends ReturnsEvent {
  final String returnId;
  const CancelReturn(this.returnId);

  @override
  List<Object?> get props => [returnId];
}

/// Track return pickup status.
class TrackReturn extends ReturnsEvent {
  final String returnId;
  const TrackReturn(this.returnId);

  @override
  List<Object?> get props => [returnId];
}
