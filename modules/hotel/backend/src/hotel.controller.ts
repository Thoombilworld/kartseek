import { Controller, Get, Post, Put, Param, Body, Query, UsePipes, ValidationPipe, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HotelService } from './hotel.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ModifyBookingDto } from './dto/modify-booking.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('hotels')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HotelController {
  constructor(private readonly svc: HotelService) {}

  @Get('health')
  health() { return this.svc.healthCheck(); }

  @Get()
  search(@Query() dto: SearchHotelsDto) {
    return this.svc.searchHotels(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) { return this.svc.getHotelById(id); }

  @Get(':id/rooms')
  getRoomAvailability(
    @Param('id') id: string,
    @Query('checkin') checkin: string, @Query('checkout') checkout: string, @Query('guests') guests = 2,
  ) { return this.svc.getRoomAvailability(id, checkin, checkout, +guests); }

  @Post(':id/bookings')
  createBooking(@Param('id') hotelId: string, @Body() dto: CreateBookingDto) {
    return this.svc.createBooking(hotelId, dto);
  }

  @Post(':id/reviews')
  submitReview(@Param('id') hotelId: string, @Body() dto: SubmitReviewDto) {
    return this.svc.submitReview(hotelId, dto);
  }

  @Get('bookings/:bookingId')
  getBooking(@Param('bookingId') id: string) { return this.svc.getBookingById(id); }

  @Get('bookings/user/:userId')
  getUserBookings(@Param('userId') userId: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.svc.getUserBookings(userId, +page, +limit);
  }

  @Put('bookings/:bookingId/cancel')
  cancelBooking(@Param('bookingId') id: string, @Body('reason') reason: string) {
    return this.svc.cancelBooking(id, reason);
  }

  @Put('bookings/:bookingId/modify')
  modifyBooking(@Param('bookingId') id: string, @Body() dto: ModifyBookingDto) {
    return this.svc.modifyBooking(id, dto);
  }

  // ── Microservice MessagePatterns ──────────────────────────────────────────
  @MessagePattern({ cmd: 'hotel_health' })
  msgHealth() { return this.svc.healthCheck(); }

  @MessagePattern({ cmd: 'search_hotels' })
  msgSearch(@Payload() d: EmptyMessage) { return this.svc.searchHotels(d); }

  @MessagePattern({ cmd: 'get_hotel' })
  msgGetHotel(@Payload() d: EmptyMessage) { return this.svc.getHotelById(d.id); }

  @MessagePattern({ cmd: 'create_hotel_booking' })
  msgCreateBooking(@Payload() d: EmptyMessage) { return this.svc.createBooking(d.hotelId, d); }

  @MessagePattern({ cmd: 'get_room_availability' })
  msgGetRoomAvailability(@Payload() d: EmptyMessage) { return this.svc.getRoomAvailability(d.hotelId, d.checkin, d.checkout, d.guests); }

  @MessagePattern({ cmd: 'get_hotel_booking' })
  msgGetBooking(@Payload() d: EmptyMessage) { return this.svc.getBookingById(d.bookingId, d); }

  @MessagePattern({ cmd: 'get_user_bookings' })
  msgGetUserBookings(@Payload() d: EmptyMessage) { return this.svc.getUserBookings(d.userId, d.page, d.limit); }

  @MessagePattern({ cmd: 'cancel_hotel_booking' })
  msgCancelBooking(@Payload() d: EmptyMessage) { return this.svc.cancelBooking(d.bookingId, d.reason, d); }

  @MessagePattern({ cmd: 'modify_hotel_booking' })
  msgModifyBooking(@Payload() d: EmptyMessage) { return this.svc.modifyBooking(d.bookingId, d, d); }

  @MessagePattern({ cmd: 'submit_hotel_review' })
  msgSubmitReview(@Payload() d: EmptyMessage) { return this.svc.submitReview(d.hotelId, d); }

  @MessagePattern({ cmd: 'get_hotel_reviews' })
  msgGetReviews(@Payload() d: EmptyMessage) { return this.svc.getHotelReviews(d.hotelId, d.page, d.limit); }
}
