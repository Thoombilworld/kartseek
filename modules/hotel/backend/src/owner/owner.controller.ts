import { Controller, Get, Post, Put, Param, Body, Query, UsePipes, ValidationPipe, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HotelService } from '../hotel.service';
import { RegisterOwnerDto } from '../dto/register-owner.dto';
import { CreateHotelDto } from '../dto/create-hotel.dto';
import { UpdatePricingDto } from '../dto/update-pricing.dto';
import { EmptyMessage, RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('owner')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HotelOwnerController {
  constructor(private readonly svc: HotelService) {}

  @Post('register')
  register(@Body() dto: RegisterOwnerDto) { return this.svc.registerHotelOwner(dto); }

  @Post('hotels')
  createHotel(@Body('ownerId') ownerId: string, @Body() dto: CreateHotelDto) {
    return this.svc.createHotel(ownerId, dto);
  }

  @Put('hotels/:id')
  updateHotel(@Param('id') id: string, @Body() dto: Partial<CreateHotelDto>) {
    return this.svc.updateHotel(id, dto);
  }

  @Post('hotels/:id/rooms')
  addRoom(@Param('id') hotelId: string, @Body() dto: any) {
    return this.svc.addRoom(hotelId, dto);
  }

  // ── Pricing ─────────────────────────────────────────────────
  @Put('rooms/:id/pricing')
  updatePricing(@Param('id') roomId: string, @Body() dto: UpdatePricingDto) {
    return this.svc.updateRoomPricing(roomId, dto);
  }

  @Put('rooms/:id/availability')
  updateAvailability(@Param('id') roomId: string, @Body() dto: { date: string; available: number }) {
    return this.svc.updateRoomAvailability(roomId, dto);
  }

  @Put('hotels/:id/bulk-pricing')
  bulkUpdatePricing(
    @Param('id') hotelId: string,
    @Body() dto: { roomIds: string[]; pricing: UpdatePricingDto },
  ) {
    return this.svc.bulkUpdatePricing(hotelId, dto.roomIds, dto.pricing);
  }

  // ── Dashboard & Data ────────────────────────────────────────
  @Get('dashboard')
  getDashboard(@Query('ownerId') ownerId: string) { return this.svc.getOwnerDashboard(ownerId); }

  @Get('bookings')
  getBookings(@Query('ownerId') ownerId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getOwnerBookings(ownerId, +page, +limit);
  }

  @Get('payouts')
  getPayouts(@Query('ownerId') ownerId: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.svc.getOwnerPayouts(ownerId, +page, +limit);
  }

  @Get('reviews')
  getReviews(@Query('ownerId') ownerId: string) { return this.svc.getOwnerReviews(ownerId); }

  @Post('reviews/:id/reply')
  replyToReview(@Param('id') reviewId: string, @Body('reply') reply: string) {
    return this.svc.replyToReview(reviewId, reply);
  }

  // ── No-Show ─────────────────────────────────────────────────
  @Put('bookings/:id/no-show')
  markNoShow(@Param('id') bookingId: string) {
    return this.svc.markNoShow(bookingId);
  }

  // ── Microservice MessagePatterns (Owner) ──────────────────────────────────
  @MessagePattern({ cmd: 'register_hotel_owner' })
  msgRegister(@Payload() d: EmptyMessage) { return this.svc.registerHotelOwner(d); }

  @MessagePattern({ cmd: 'create_hotel' })
  msgCreateHotel(@Payload() d: EmptyMessage) { return this.svc.createHotel(d.ownerId, d); }

  @MessagePattern({ cmd: 'update_hotel' })
  msgUpdateHotel(@Payload() d: EmptyMessage) { return this.svc.updateHotel(d.hotelId, d); }

  @MessagePattern({ cmd: 'get_owner_dashboard' })
  msgDashboard(@Payload() d: EmptyMessage) { return this.svc.getOwnerDashboard(d.ownerId); }

  @MessagePattern({ cmd: 'get_owner_bookings' })
  msgOwnerBookings(@Payload() d: EmptyMessage) { return this.svc.getOwnerBookings(d.ownerId, d.page, d.limit); }

  @MessagePattern({ cmd: 'update_room_pricing' })
  msgPricing(@Payload() d: EmptyMessage) { return this.svc.updateRoomPricing(d.roomId, d); }

  @MessagePattern({ cmd: 'bulk_update_pricing' })
  msgBulkPricing(@Payload() d: EmptyMessage) { return this.svc.bulkUpdatePricing(d.hotelId, d.roomIds, d.pricing); }

  @MessagePattern({ cmd: 'mark_no_show' })
  msgNoShow(@Payload() d: EmptyMessage) { return this.svc.markNoShow(d.bookingId); }

  @MessagePattern({ cmd: 'get_owner_payouts' })
  msgPayouts(@Payload() d: EmptyMessage) { return this.svc.getOwnerPayouts(d.ownerId, d.page, d.limit); }

  @MessagePattern({ cmd: 'get_owner_reviews' })
  msgReviews(@Payload() d: EmptyMessage) { return this.svc.getOwnerReviews(d.ownerId); }

  @MessagePattern({ cmd: 'reply_to_review' })
  msgReply(@Payload() d: EmptyMessage) { return this.svc.replyToReview(d.reviewId, d.reply); }
}
