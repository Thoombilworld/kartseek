import 'package:equatable/equatable.dart';

/// Returns module status.
enum ReturnsStatus { initial, loading, loaded, submitting, submitted, error }

/// State for the Returns module BLoC.
class ReturnsState extends Equatable {
  final ReturnsStatus status;
  final List<Map<String, dynamic>> returns;
  final Map<String, dynamic>? selectedReturn;
  final String? errorMessage;

  const ReturnsState({
    this.status = ReturnsStatus.initial,
    this.returns = const [],
    this.selectedReturn,
    this.errorMessage,
  });

  ReturnsState copyWith({
    ReturnsStatus? status,
    List<Map<String, dynamic>>? returns,
    Map<String, dynamic>? selectedReturn,
    String? errorMessage,
  }) {
    return ReturnsState(
      status: status ?? this.status,
      returns: returns ?? this.returns,
      selectedReturn: selectedReturn ?? this.selectedReturn,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, returns, selectedReturn, errorMessage];
}
