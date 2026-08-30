import 'package:equatable/equatable.dart';

abstract class HotelSellerEvent extends Equatable {
  const HotelSellerEvent();
  @override List<Object?> get props => [];
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
class LoadHotelDashboard extends HotelSellerEvent {
  final String countryCode;
  const LoadHotelDashboard({this.countryCode = 'AE'});
  @override List<Object?> get props => [countryCode];
}

// ── Bookings ───────────────────────────────────────────────────────────────────
class LoadHotelBookings extends HotelSellerEvent {
  final String countryCode;
  final String tab; // 'all' | 'checked_in' | 'upcoming' | 'checked_out'
  const LoadHotelBookings({this.countryCode = 'AE', this.tab = 'all'});
  @override List<Object?> get props => [countryCode, tab];
}

class SelectHotelBookingTab extends HotelSellerEvent {
  final String tab;
  const SelectHotelBookingTab(this.tab);
  @override List<Object?> get props => [tab];
}

class CheckInGuest extends HotelSellerEvent {
  final String bookingId;
  const CheckInGuest(this.bookingId);
  @override List<Object?> get props => [bookingId];
}

class CheckOutGuest extends HotelSellerEvent {
  final String bookingId;
  const CheckOutGuest(this.bookingId);
  @override List<Object?> get props => [bookingId];
}

class CancelHotelBooking extends HotelSellerEvent {
  final String bookingId;
  final String reason;
  const CancelHotelBooking(this.bookingId, this.reason);
  @override List<Object?> get props => [bookingId, reason];
}

class MarkPaymentReceived extends HotelSellerEvent {
  final String bookingId;
  final double amount;
  const MarkPaymentReceived(this.bookingId, this.amount);
  @override List<Object?> get props => [bookingId, amount];
}

class AddSpecialRequest extends HotelSellerEvent {
  final String bookingId;
  final String request;
  const AddSpecialRequest(this.bookingId, this.request);
  @override List<Object?> get props => [bookingId, request];
}

class ExtendStay extends HotelSellerEvent {
  final String bookingId;
  final int extraNights;
  const ExtendStay(this.bookingId, this.extraNights);
  @override List<Object?> get props => [bookingId, extraNights];
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
class LoadHotelRooms extends HotelSellerEvent {
  final String countryCode;
  const LoadHotelRooms({this.countryCode = 'AE'});
  @override List<Object?> get props => [countryCode];
}

class UpdateRoomStatus extends HotelSellerEvent {
  final String roomId;
  final String status; // 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order'
  const UpdateRoomStatus(this.roomId, this.status);
  @override List<Object?> get props => [roomId, status];
}

class UpdateRoomPrice extends HotelSellerEvent {
  final String roomId;
  final double price;
  const UpdateRoomPrice(this.roomId, this.price);
  @override List<Object?> get props => [roomId, price];
}

class AddRoomNote extends HotelSellerEvent {
  final String roomId;
  final String note;
  const AddRoomNote(this.roomId, this.note);
  @override List<Object?> get props => [roomId, note];
}

class MarkRoomCleaning extends HotelSellerEvent {
  final String roomId;
  const MarkRoomCleaning(this.roomId);
  @override List<Object?> get props => [roomId];
}

class MarkRoomAvailable extends HotelSellerEvent {
  final String roomId;
  const MarkRoomAvailable(this.roomId);
  @override List<Object?> get props => [roomId];
}

// ── Availability Calendar ────────────────────────────────────────────────────
class LoadHotelAvailability extends HotelSellerEvent {
  final String countryCode;
  const LoadHotelAvailability({this.countryCode = 'AE'});
  @override List<Object?> get props => [countryCode];
}

class BlockHotelDate extends HotelSellerEvent {
  final DateTime date;
  const BlockHotelDate(this.date);
  @override List<Object?> get props => [date];
}

class UnblockHotelDate extends HotelSellerEvent {
  final DateTime date;
  const UnblockHotelDate(this.date);
  @override List<Object?> get props => [date];
}

class BlockDateRange extends HotelSellerEvent {
  final DateTime from;
  final DateTime to;
  final String? reason;
  const BlockDateRange(this.from, this.to, {this.reason});
  @override List<Object?> get props => [from, to];
}

class SetSeasonalRate extends HotelSellerEvent {
  final DateTime from;
  final DateTime to;
  final double multiplier; // e.g. 1.5 = 50% surcharge
  const SetSeasonalRate(this.from, this.to, this.multiplier);
  @override List<Object?> get props => [from, to, multiplier];
}

// ── Analytics ─────────────────────────────────────────────────────────────────
class LoadHotelAnalytics extends HotelSellerEvent {
  final String countryCode;
  const LoadHotelAnalytics({this.countryCode = 'AE'});
  @override List<Object?> get props => [countryCode];
}
